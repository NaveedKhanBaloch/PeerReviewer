import axios from 'axios';
import type { FullReview, ReviewListItem } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

export const api = {
  startReviewWithFile: async (file: File): Promise<{ review_id: string; status: string }> => {
    const form = new FormData();
    form.append('file', file);
    const res = await apiClient.post('/api/review', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  startReviewWithArxiv: async (url: string): Promise<{ review_id: string; status: string }> => {
    const form = new FormData();
    form.append('arxiv_url', url);
    const res = await apiClient.post('/api/review', form);
    return res.data;
  },

  getReviews: async (limit = 50, offset = 0): Promise<ReviewListItem[]> => {
    const res = await apiClient.get('/api/reviews', { params: { limit, offset } });
    return res.data;
  },

  getReview: async (id: string): Promise<FullReview> => {
    const res = await apiClient.get(`/api/review/${id}`);
    return res.data;
  },

  deleteReview: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/review/${id}`);
  },

  getPdfUrl: (id: string): string => `${API_URL}/api/review/${id}/pdf`,
};
