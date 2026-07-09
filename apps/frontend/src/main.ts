import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './styles/main.css';

import { setupApi } from '@todoapp/api-client';
import { useAuthStore } from './stores/auth';

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);

setupApi({
  baseUrl: (import.meta.env.VITE_API_BASE_URL as string) || '/api',
  getToken: () => useAuthStore().token,
  // Em 401, tenta renovar o JWT via LoginHub /auth/refresh (grace de 7 dias)
  // antes de derrubar a sessão. Se renovar com sucesso, a request original
  // é retried transparentemente.
  tryRefresh: () => useAuthStore().refreshToken(),
  // Sem token não há sessão a derrubar (ex.: 401 de credencial errada no
  // login) — deixa o erro propagar para a tela em vez de redirecionar.
  onUnauthorized: () => {
    if (useAuthStore().token) useAuthStore().logout();
  },
});

app.use(router).mount('#app');


if ('serviceWorker' in navigator) {
  // Reload when a NEW sw version takes over (skipWaiting + clients.claim), but
  // not on the very first registration — that would reload every fresh visit.
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Falha ao registrar service worker:', err);
      });
    });
  }
}
