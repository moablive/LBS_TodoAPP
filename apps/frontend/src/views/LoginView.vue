<template>
  <div class="relative min-h-screen bg-surface-base text-white flex items-center justify-center p-4 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-surface-raised via-surface-base to-surface-base">
    <!-- Lightweight Premium Background Gradient -->
    <div class="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,_#8b5cf615_0%,_transparent_40%)]"></div>


    <!-- Enrolamento de 2FA: toma a tela inteira, sem sair do app. -->
    <div v-if="enrolarToken" class="relative z-10 w-full max-w-[420px]">
      <TwoFactorEnroll :setup-token="enrolarToken" @concluido="router.push('/')" />
    </div>

    <!-- Login Card -->
    <div v-else class="relative z-10 w-full max-w-[420px] animate-fade-in-up">
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

      <!-- Segundo fator. Substitui o antigo card de troca de senha, que batia
           em /auth/change-password — rota removida do hub. O que barra o login
           hoje e o codigo do autenticador, e a sessao so nasce depois dele. -->
      <div v-if="authStore.aguardandoSegundoFator" class="absolute inset-0 bg-surface-raised/60 backdrop-blur-xl border border-white/10 p-10 rounded-[2rem] shadow-modal animate-fade-in-up z-20 flex flex-col justify-center">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#ff3b30] to-[#ff9500] shadow-lg mb-6">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 class="text-2xl font-display font-semibold tracking-tight">Verificacao em duas etapas</h1>
          <p class="text-muted mt-2 text-sm">
            {{ usarBackup
              ? 'Digite um dos codigos de recuperacao que voce guardou.'
              : 'Digite o codigo de 6 digitos do seu aplicativo autenticador.' }}
          </p>
        </div>

        <form @submit.prevent="handleSegundoFator" class="space-y-6">
          <div class="relative group">
            <input
              v-model="codigo"
              type="text"
              required
              autofocus
              autocomplete="one-time-code"
              :inputmode="usarBackup ? 'text' : 'numeric'"
              :maxlength="usarBackup ? 11 : 6"
              :placeholder="usarBackup ? 'XXXXX-XXXXX' : '000000'"
              class="w-full bg-surface-overlay/50 border border-surface-border rounded-2xl px-5 py-4 text-center tracking-[0.4em] text-white placeholder-muted focus:border-accent focus:bg-surface-overlay focus:ring-1 focus:ring-accent outline-none transition-all duration-300"
            />
          </div>

          <p v-if="erro" class="text-sm text-red-400 text-center">{{ erro }}</p>

          <button
            type="submit"
            :disabled="isChanging || !codigo"
            class="group relative w-full bg-gradient-to-r from-accent to-primary text-white font-semibold py-4 rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 overflow-hidden shadow-lg"
          >
            <span class="relative z-10 flex items-center justify-center gap-2">
              <span v-if="isChanging">Verificando...</span>
              <span v-else>Verificar</span>
            </span>
          </button>

          <button
            type="button"
            class="w-full text-sm text-muted hover:text-accent transition-colors"
            @click="usarBackup = !usarBackup; codigo = ''; erro = null"
          >
            {{ usarBackup ? 'Usar o aplicativo autenticador' : 'Perdi o acesso ao autenticador' }}
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
import { useConfirmDialog } from '@/composables/useConfirmDialog';
import TwoFactorEnroll from '@/components/TwoFactorEnroll.vue';

const authStore = useAuthStore();
const router = useRouter();
const { alert: alertar } = useConfirmDialog();

const email = ref('');
const password = ref('');
const isLoading = ref(false);
const isChanging = ref(false);

/**
 * Passe de enrolamento. Enquanto existir, o QR toma a tela — aqui mesmo, e nao
 * no painel do hub: mandar a pessoa para outra origem com o passe na URL era o
 * que fazia o convite terminar no login do hub quando o navegador tinha o
 * service worker antigo dele em cache.
 */
const enrolarToken = ref<string | null>(null);

// Segunda etapa
const codigo = ref('');
const usarBackup = ref(false);
const erro = ref<string | null>(null);

function traduzir(e: unknown): string {
  const cod = (e as { code?: string })?.code;
  if (cod === 'CODIGO_INVALIDO') return 'Codigo invalido. Confira o relogio do celular e tente o proximo.';
  if (cod === 'CHALLENGE_INVALIDO') return 'A janela de verificacao expirou. Faca login de novo.';
  if (cod === 'MUITAS_TENTATIVAS') return (e as Error).message;
  if (cod === 'REDE') return 'Sem conexao com o servidor de login.';
  return (e as Error)?.message || 'Nao foi possivel concluir.';
}

async function handleLogin() {
  if (isLoading.value) return;
  
  isLoading.value = true;
  erro.value = null;
  try {
    const r = await authStore.login({ email: email.value, password: password.value });

    // 'enrolar': conta exige 2FA e nao tem autenticador. O QR e montado aqui.
    if (r.etapa === 'enrolar') {
      enrolarToken.value = r.setupToken;
      return;
    }
    // '2fa': o card de codigo assume; nada a fazer aqui.
    if (r.etapa === 'sessao') router.push('/');
  } catch (e) {
    erro.value = traduzir(e);
    await alertar({ title: 'Nao foi possivel entrar', message: erro.value });
  } finally {
    isLoading.value = false;
  }
}

async function handleSegundoFator() {
  if (isChanging.value) return;
  isChanging.value = true;
  erro.value = null;
  try {
    await authStore.verificarSegundoFator(codigo.value.trim(), usarBackup.value);
    router.push('/');
  } catch (e) {
    erro.value = traduzir(e);
  } finally {
    isChanging.value = false;
  }
}
</script>
