<template>
  <div class="min-h-screen bg-surface-base text-white flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-surface-raised p-8 rounded-2xl shadow-modal">
      <h1 class="text-2xl font-semibold mb-6 text-center">LoginHUB</h1>
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-sm text-muted mb-1">Email</label>
          <input v-model="email" type="email" required class="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2 focus:border-accent outline-none" />
        </div>
        <div>
          <label class="block text-sm text-muted mb-1">Password</label>
          <input v-model="password" type="password" required class="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2 focus:border-accent outline-none" />
        </div>
        <button type="submit" class="w-full bg-accent hover:bg-blue-600 text-white font-medium py-3 rounded-xl transition-colors">
          Entrar
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const email = ref('');
const password = ref('');

async function handleLogin() {
  try {
    await authStore.login({ email: email.value, password: password.value });
    router.push('/');
  } catch (e) {
    alert('Erro ao fazer login');
  }
}
</script>
