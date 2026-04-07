import { useEffect, useRef } from 'react';
import { useReviewStore } from '../stores/reviewStore';
import type { ProgressEvent } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function useSSE(reviewId: string | null) {
  const esRef = useRef<EventSource | null>(null);
  const { updateProgress, completeProcessing, failProcessing, updateReview } = useReviewStore();

  useEffect(() => {
    if (!reviewId) {
      return;
    }

    esRef.current?.close();
    const es = new EventSource(`${API_URL}/api/progress/${reviewId}`);
    esRef.current = es;

    es.onmessage = (event) => {
      const data: ProgressEvent = JSON.parse(event.data);
      updateProgress(data);

      if (data.status === 'complete') {
        completeProcessing(reviewId);
        updateReview(reviewId, { status: 'complete' });
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
  }, [reviewId, updateProgress, completeProcessing, failProcessing, updateReview]);
}
