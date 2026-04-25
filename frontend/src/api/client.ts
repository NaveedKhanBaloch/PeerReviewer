import axios from 'axios';
import toast from 'react-hot-toast';

import { toErrorMessage } from './errorMessage';
import { useAuthStore } from '../stores/authStore';
import type { AdminStats, FullReview, ReviewListItem, TokenResponse, User, UserCreate, UserListItem, UserUpdate } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          const { data } = await axios.post<TokenResponse>(`${API_URL}/api/auth/refresh`, { refresh_token: refreshToken });
          useAuthStore.getState().updateTokens(data);
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return apiClient(originalRequest);
        }
      } catch {
        useAuthStore.getState().logout();
        if (window.location.pathname !== '/login') {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        }
      }
    }
    const backendMessage = toErrorMessage(error.response?.data?.detail, '');
    if (error.response?.status === 403) toast.error(backendMessage || 'You do not have permission to perform this action.');
    if (error.response?.status === 413) toast.error('File is too large. Maximum size is 50MB.');
    if (error.response?.status === 429) toast.error('Too many requests. Please wait before submitting another review.');
    if (error.response?.status >= 500) toast.error('Server error. Please try again in a moment.');
    if (!error.response) toast.error('Cannot connect to server. Please check your connection.');
    return Promise.reject(error);
  },
);

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

  getReviews: async (limit = 50, offset = 0, mine = false): Promise<ReviewListItem[]> => {
    const res = await apiClient.get('/api/reviews', { params: { limit, offset, mine } });
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

  auth: {
    login: async (identifier: string, password: string): Promise<TokenResponse> => {
      const res = await apiClient.post('/api/auth/login', { identifier, password });
      return res.data;
    },
    refresh: async (refreshToken: string): Promise<TokenResponse> => {
      const res = await apiClient.post('/api/auth/refresh', { refresh_token: refreshToken });
      return res.data;
    },
    logout: async (): Promise<void> => {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        await apiClient.post('/api/auth/logout', { refresh_token: refreshToken });
      }
    },
    getMe: async (): Promise<User> => {
      const res = await apiClient.get('/api/auth/me');
      return res.data;
    },
    updateMe: async (data: Partial<UserUpdate>): Promise<User> => {
      const res = await apiClient.put('/api/auth/me', data);
      return res.data;
    },
    changePassword: async (current: string, newPass: string): Promise<void> => {
      await apiClient.put('/api/auth/me/password', { current_password: current, new_password: newPass });
    },
  },

  admin: {
    getUsers: async (page = 0): Promise<{ users: UserListItem[]; total: number }> => {
      const res = await apiClient.get('/api/admin/users', { params: { offset: page * 50, limit: 50 } });
      return res.data;
    },
    createUser: async (data: UserCreate): Promise<User> => {
      const res = await apiClient.post('/api/admin/users', data);
      return res.data;
    },
    updateUser: async (id: string, data: Partial<UserUpdate & { role: string; is_active: boolean }>): Promise<User> => {
      const res = await apiClient.put(`/api/admin/users/${id}`, data);
      return res.data;
    },
    resetPassword: async (id: string, newPassword: string): Promise<void> => {
      await apiClient.post(`/api/admin/users/${id}/reset-password`, { new_password: newPassword });
    },
    deactivateUser: async (id: string): Promise<void> => {
      await apiClient.delete(`/api/admin/users/${id}`);
    },
    getStats: async (): Promise<AdminStats> => {
      const res = await apiClient.get('/api/admin/stats');
      return res.data;
    },
  },
};
