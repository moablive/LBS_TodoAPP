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
  if (authStore.isAuthenticated && to.meta.public) {
    return '/';
  }
});

export default router;
