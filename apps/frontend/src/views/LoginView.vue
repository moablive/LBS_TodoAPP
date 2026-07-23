<template>
  <div class="relative min-h-screen bg-surface-base text-white flex items-center justify-center p-4 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-surface-raised via-surface-base to-surface-base">
    <!-- Lightweight Premium Background Gradient -->
    <div class="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,_#8b5cf615_0%,_transparent_40%)]"></div>


    <!-- Login Card -->
    <div class="relative z-10 w-full max-w-[420px] animate-fade-in-up">
      <div class="bg-surface-raised/60 backdrop-blur-xl border border-white/10 p-10 rounded-[2rem] shadow-modal">
        
        <div class="text-center mb-10">
          <img src="/favicon.svg" alt="TodoAPP Logo" class="w-20 h-20 mx-auto mb-6 rounded-2xl shadow-lg object-contain bg-white/5 p-1" />
          <h1 class="text-3xl font-display font-semibold tracking-tight">TodoAPP</h1>
          <p class="text-muted mt-2">Welcome back. Please enter your details.</p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-6">
          <div class="space-y-4">
            <div class="relative group">
              <input 
                v-model="email" 
                type="email" 
                required 
                placeholder="Email address"
                class="w-full bg-surface-overlay/50 border border-surface-border rounded-2xl px-5 py-4 pl-12 text-white placeholder-muted focus:border-accent focus:bg-surface-overlay focus:ring-1 focus:ring-accent outline-none transition-all duration-300" 
              />
              <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
            
            <div class="relative group">
              <input 
                v-model="password" 
                type="password" 
                required 
                placeholder="Password"
                class="w-full bg-surface-overlay/50 border border-surface-border rounded-2xl px-5 py-4 pl-12 text-white placeholder-muted focus:border-accent focus:bg-surface-overlay focus:ring-1 focus:ring-accent outline-none transition-all duration-300" 
              />
              <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          <button 
            type="submit" 
            :disabled="isLoading"
            class="group relative w-full bg-white text-surface-base font-semibold py-4 rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 overflow-hidden"
          >
            <span class="relative z-10 flex items-center justify-center gap-2">
              <span v-if="isLoading">Signing in...</span>
              <span v-else>Sign In</span>
              <svg v-if="!isLoading" class="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </button>
        </form>

      </div>

      <!-- Change Password Card (Replaces Login Card if requirePasswordChange is true) -->
      <div v-if="authStore.requirePasswordChange" class="absolute inset-0 bg-surface-raised/60 backdrop-blur-xl border border-white/10 p-10 rounded-[2rem] shadow-modal animate-fade-in-up z-20 flex flex-col justify-center">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#ff3b30] to-[#ff9500] shadow-lg mb-6">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 class="text-2xl font-display font-semibold tracking-tight">Security Update</h1>
          <p class="text-muted mt-2 text-sm">Please set a new password to secure your account.</p>
        </div>

        <form @submit.prevent="handleChangePassword" class="space-y-6">
          <div class="relative group">
            <input 
              v-model="newPassword" 
              type="password" 
              required 
              placeholder="New Password"
              class="w-full bg-surface-overlay/50 border border-surface-border rounded-2xl px-5 py-4 pl-12 text-white placeholder-muted focus:border-accent focus:bg-surface-overlay focus:ring-1 focus:ring-accent outline-none transition-all duration-300" 
            />
            <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>

          <button 
            type="submit" 
            :disabled="isChanging"
            class="group relative w-full bg-gradient-to-r from-accent to-primary text-white font-semibold py-4 rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 overflow-hidden shadow-lg"
          >
            <span class="relative z-10 flex items-center justify-center gap-2">
              <span v-if="isChanging">Updating...</span>
              <span v-else>Update Password</span>
              <svg v-if="!isChanging" class="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </button>
        </form>
      </div>

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
const newPassword = ref('');
const isLoading = ref(false);
const isChanging = ref(false);

async function handleLogin() {
  if (isLoading.value) return;
  
  isLoading.value = true;
  try {
    await authStore.login({ email: email.value, password: password.value });
    if (!authStore.requirePasswordChange) {
      router.push('/');
    }
  } catch (e) {
    alert('Erro ao fazer login. Verifique suas credenciais.');
  } finally {
    isLoading.value = false;
  }
}

async function handleChangePassword() {
  if (isChanging.value) return;
  isChanging.value = true;
  try {
    await authStore.changePassword(newPassword.value);
    router.push('/');
  } catch (e) {
    alert('Erro ao alterar senha. Tente novamente.');
  } finally {
    isChanging.value = false;
  }
}
</script>
