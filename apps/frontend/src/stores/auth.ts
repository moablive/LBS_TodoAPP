import { defineStore } from 'pinia';
import { api, setApiToken } from '@/api/client';
import type { LoginRequest } from '@todoapp/models';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
  },
  actions: {
    async login(payload: LoginRequest) {
      // In MoneyAPP this hits loginhub directly from backend.
      // We will hit /api/auth/login or loginhub.
      // For simplicity, we assume the backend returns a token.
      const res = await api.post<{ token: string }>('/auth/login', payload);
      this.token = res.token;
      localStorage.setItem('token', res.token);
      setApiToken(res.token);
    },
    logout() {
      this.token = null;
      localStorage.removeItem('token');
      setApiToken(null);
      window.location.href = '/login';
    }
  }
});

if (localStorage.getItem('token')) {
  setApiToken(localStorage.getItem('token')!);
}
