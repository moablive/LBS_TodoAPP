import { defineStore } from 'pinia';
import { api } from '@/api/client';
import type { LoginRequest } from '@todoapp/models';

const LOGINHUB_API = import.meta.env.VITE_LOGINHUB_API_URL || 'https://loginhub.astralwavelabel.com/api';

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
    },
    async changePassword(novaSenha: string) {
      const res = await fetch(`${LOGINHUB_API}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` },
        body: JSON.stringify({ novaSenha }),
      });
      if (!res.ok) throw new Error('change_password_failed');

      this.requirePasswordChange = false;
      localStorage.setItem('requirePasswordChange', 'false');
    },
    /**
     * Renova o JWT no LoginHub (grace de 7 dias). Retorna true se renovou.
     * Chamado pelo api-client via `tryRefresh` — o single-flight e o logout
     * em caso de falha (`onUnauthorized`) ficam por conta do client.
     */
    async refreshToken(): Promise<boolean> {
      if (!this.token) return false;
      try {
        const res = await fetch(`${LOGINHUB_API}/auth/refresh`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.token}` },
        });
        if (!res.ok) return false;

        const data = await res.json();
        if (!data.token) return false;

        this.token = data.token;
        localStorage.setItem('token', data.token);
        return true;
      } catch {
        return false;
      }
    },
    logout() {
      this.token = null;
      this.requirePasswordChange = false;
      localStorage.removeItem('token');
      localStorage.removeItem('requirePasswordChange');
      window.location.href = '/login';
    }
  }
});
