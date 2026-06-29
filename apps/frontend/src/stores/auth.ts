import { defineStore } from 'pinia';
import { api, setApiToken } from '@/api/client';
import type { LoginRequest } from '@todoapp/models';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    requirePasswordChange: localStorage.getItem('requirePasswordChange') === 'true',
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
  },
  actions: {
    async login(payload: LoginRequest) {
      const res = await api.post<{ token: string, requirePasswordChange?: boolean }>('/auth/login', payload);
      this.token = res.token;
      this.requirePasswordChange = !!res.requirePasswordChange;
      
      localStorage.setItem('token', res.token);
      localStorage.setItem('requirePasswordChange', this.requirePasswordChange.toString());
      setApiToken(res.token);
    },
    async changePassword(novaSenha: string) {
      const loginhubApi = import.meta.env.VITE_LOGINHUB_API_URL || 'https://api-auth.astralwavelabel.com/api';
      const res = await fetch(`${loginhubApi}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` },
        body: JSON.stringify({ novaSenha }),
      });
      if (!res.ok) throw new Error('change_password_failed');
      
      this.requirePasswordChange = false;
      localStorage.setItem('requirePasswordChange', 'false');
    },
    logout() {
      this.token = null;
      this.requirePasswordChange = false;
      localStorage.removeItem('token');
      localStorage.removeItem('requirePasswordChange');
      setApiToken(null);
      window.location.href = '/login';
    }
  }
});

if (localStorage.getItem('token')) {
  setApiToken(localStorage.getItem('token')!);
}
