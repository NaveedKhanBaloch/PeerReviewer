import { useEffect, useRef } from 'react';
import { api } from '../api/client';
import { useReviewStore } from '../stores/reviewStore';
import { useAuthStore } from '../stores/authStore';
import type { ProgressEvent } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2500;
const POLL_DELAY_MS = 3000;

export function useSSE(reviewId: string | null) {
  const esRef = useRef<EventSource | null>(null);
  const { updateProgress, completeProcessing, failProcessing, updateReview } = useReviewStore();
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!reviewId || !accessToken) {
      return;
    }

    let cancelled = false;
    let reconnectAttempts = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const finishWithReview = async () => {
      try {
        const review = await api.getReview(reviewId);
        updateReview(reviewId, {
          title: review.title,
          created_at: review.created_at,
          status: review.status === 'complete' ? 'complete' : review.status === 'failed' ? 'failed' : 'processing',
          recommendation: review.recommendation,
          overall_score: review.overall_score,
        });
        if (review.status === 'complete') {
          completeProcessing(reviewId);
          return true;
        }
        if (review.status === 'failed') {
          failProcessing('Review failed. Please check the submission and try again.');
          return true;
        }
      } catch {
        return false;
      }
      return false;
    };

    const schedulePollFallback = () => {
      if (pollTimer || cancelled) return;
      const poll = async () => {
        if (cancelled) return;
        const done = await finishWithReview();
        if (!done && !cancelled) {
          pollTimer = setTimeout(poll, POLL_DELAY_MS);
        }
      };
      pollTimer = setTimeout(poll, POLL_DELAY_MS);
    };

    const connect = () => {
      if (cancelled) return;
    esRef.current?.close();
    const es = new EventSource(`${API_URL}/api/progress/${reviewId}?token=${encodeURIComponent(accessToken)}`);
    esRef.current = es;

    es.onmessage = async (event) => {
      const data: ProgressEvent = JSON.parse(event.data);
      updateProgress(data);
      reconnectAttempts = 0;

      if (data.status === 'complete') {
        const hydrated = await finishWithReview();
        if (!hydrated) {
          updateReview(reviewId, { status: 'complete' });
          completeProcessing(reviewId);
        }
        es.close();
      } else if (data.status === 'failed') {
        failProcessing(data.message);
        updateReview(reviewId, { status: 'failed' });
        es.close();
      }
    };

    es.onerror = () => {
      es.close();
      schedulePollFallback();
      if (cancelled) return;
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts += 1;
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS * reconnectAttempts);
        return;
      }
      updateProgress({
        step: 'reconnecting',
        message: 'Live connection paused. Checking review status in the background...',
        review_id: reviewId,
        status: 'processing',
      });
    };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pollTimer) clearTimeout(pollTimer);
      esRef.current?.close();
    };
  }, [reviewId, accessToken, updateProgress, completeProcessing, failProcessing, updateReview]);
}
