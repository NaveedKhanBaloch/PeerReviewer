import { useEffect, useRef } from 'react';
import { api } from '../api/client';
import { useReviewStore } from '../stores/reviewStore';
import { useAuthStore } from '../stores/authStore';
import type { ProgressEvent } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

export function useSSE(reviewId: string | null) {
  const esRef = useRef<EventSource | null>(null);
  const { updateProgress, completeProcessing, failProcessing, updateReview } = useReviewStore();
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!reviewId || !accessToken) {
      return;
    }

    esRef.current?.close();
    const es = new EventSource(`${API_URL}/api/progress/${reviewId}?token=${encodeURIComponent(accessToken)}`);
    esRef.current = es;

    es.onmessage = async (event) => {
      const data: ProgressEvent = JSON.parse(event.data);
      updateProgress(data);

      if (data.status === 'complete') {
        try {
          const review = await api.getReview(reviewId);
          updateReview(reviewId, {
            title: review.title,
            created_at: review.created_at,
            status: 'complete',
            recommendation: review.recommendation,
            overall_score: review.overall_score,
          });
        } catch {
          updateReview(reviewId, { status: 'complete' });
        }
        completeProcessing(reviewId);
        es.close();
      } else if (data.status === 'failed') {
        failProcessing(data.message);
        updateReview(reviewId, { status: 'failed' });
        es.close();
      }
    };

    es.onerror = () => {
      failProcessing('Connection lost. Please refresh.');
      es.close();
    };

    return () => {
      es.close();
    };
  }, [reviewId, accessToken, updateProgress, completeProcessing, failProcessing, updateReview]);
}
