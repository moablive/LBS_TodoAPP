import { api as apiClient, setupApi, ApiError } from '@todoapp/api-client';

let _token: string | null = localStorage.getItem('token');

setupApi({
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  getToken: () => _token,
  onUnauthorized: () => {
    _token = null;
    localStorage.removeItem('token');
    window.location.href = '/login';
  },
});

export function setApiToken(token: string | null) {
  _token = token;
}

export { apiClient as api, ApiError };
