import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { TokenResponse, User } from '../types';

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isAdmin: () => boolean;
  currentUser: () => User | null;
  login: (response: TokenResponse) => void;
  logout: () => void;
  updateUser: (partial: Partial<User>) => void;
  updateTokens: (response: TokenResponse) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isAdmin: () => get().user?.role === 'admin',
      currentUser: () => get().user,
      login: (response) =>
        set({
          user: response.user,
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          isAuthenticated: true,
        }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
      updateUser: (partial) => set((state) => ({ user: state.user ? { ...state.user, ...partial } : state.user })),
      updateTokens: (response) =>
        set({
          user: response.user,
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          isAuthenticated: true,
        }),
    }),
    { name: 'research-reviewer-auth' },
  ),
);
