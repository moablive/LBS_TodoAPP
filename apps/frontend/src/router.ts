import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from './stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('./views/LoginView.vue'),
      meta: { public: true },
    },
    {
      // Destino do Magic Link do LoginHUB (<platform_url>/setup-password).
      // `semSessao` alem de `public`: quem chega aqui pode ate ter um token
      // velho no storage, e mandar essa pessoa para o dashboard mataria o
      // convite — o link e de uso unico e ja nao existe mais depois.
      path: '/setup-password',
      name: 'setup-password',
      component: () => import('./views/SetupPasswordView.vue'),
      meta: { public: true, semSessao: true },
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('./views/DashboardView.vue'),
    },
  ],
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  if (!authStore.isAuthenticated && !to.meta.public) {
    return '/login';
  }
  if (authStore.isAuthenticated && to.meta.public && !to.meta.semSessao) {
    return '/';
  }
});

export default router;
