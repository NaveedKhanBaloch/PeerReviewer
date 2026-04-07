import { create } from 'zustand';
import type { ProgressEvent, ReviewListItem } from '../types';

interface Toast {
  id: number;
  message: string;
}

interface ReviewStore {
  selectedReviewId: string | null;
  isProcessing: boolean;
  processingReviewId: string | null;
  currentProgress: ProgressEvent | null;
  progressMessages: string[];
  reviews: ReviewListItem[];
  toasts: Toast[];
  setSelectedReview: (id: string | null) => void;
  startProcessing: (reviewId: string) => void;
  updateProgress: (event: ProgressEvent) => void;
  completeProcessing: (reviewId: string) => void;
  failProcessing: (error: string) => void;
  setReviews: (reviews: ReviewListItem[]) => void;
  addReview: (review: ReviewListItem) => void;
  updateReview: (id: string, updates: Partial<ReviewListItem>) => void;
  removeReview: (id: string) => void;
  pushToast: (message: string) => void;
  dismissToast: (id: number) => void;
}

export const useReviewStore = create<ReviewStore>((set) => ({
  selectedReviewId: null,
  isProcessing: false,
  processingReviewId: null,
  currentProgress: null,
  progressMessages: [],
  reviews: [],
  toasts: [],

  setSelectedReview: (id) => set({ selectedReviewId: id }),

  startProcessing: (reviewId) => set({
    isProcessing: true,
    processingReviewId: reviewId,
    currentProgress: null,
    progressMessages: [],
  }),

  updateProgress: (event) => set((state) => ({
    currentProgress: event,
    progressMessages: state.progressMessages.includes(event.message)
      ? state.progressMessages
      : [...state.progressMessages, event.message],
  })),

  completeProcessing: (reviewId) => set({
    isProcessing: false,
    processingReviewId: null,
    selectedReviewId: reviewId,
  }),

  failProcessing: (error) => set((state) => ({
    isProcessing: false,
    processingReviewId: null,
    toasts: [...state.toasts, { id: Date.now(), message: error }],
  })),

  setReviews: (reviews) => set({ reviews }),
  addReview: (review) => set((state) => ({ reviews: [review, ...state.reviews] })),
  updateReview: (id, updates) => set((state) => ({
    reviews: state.reviews.map((review) => review.id === id ? { ...review, ...updates } : review),
  })),
  removeReview: (id) => set((state) => ({
    reviews: state.reviews.filter((review) => review.id !== id),
    selectedReviewId: state.selectedReviewId === id ? null : state.selectedReviewId,
  })),
  pushToast: (message) => set((state) => ({
    toasts: [...state.toasts, { id: Date.now(), message }],
  })),
  dismissToast: (id) => set((state) => ({
    toasts: state.toasts.filter((toast) => toast.id !== id),
  })),
}));
