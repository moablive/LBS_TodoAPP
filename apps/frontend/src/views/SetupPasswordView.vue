<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

/**
 * Primeiro acesso e reset de senha, a partir do Magic Link do LoginHUB.
 *
 * Esta tela nao existia: o e-mail de convite aponta para
 * `<platform_url>/setup-password?token=...`, mas o router so conhecia `/login`
 * e `/`. O nginx devolvia o index (200), o Vue nao casava rota nenhuma e o
 * guard mandava para o login — sem campo de senha, sem erro, sem saida.
 */
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const token = computed(() => (route.query.token as string) || '');
const senha = ref('');
const confirmacao = ref('');
const erro = ref<string | null>(null);
const aviso = ref<string | null>(null);
const enviando = ref(false);

function traduzir(e: any): string {
  const cod = e?.code;
  if (cod === 'LINK_JA_UTILIZADO') return 'Este link ja foi usado. Peca um novo ao administrador.';
  if (cod === 'TOKEN_INVALIDO' || cod === 'ACAO_INVALIDA') return 'Link invalido ou expirado. Peca um novo ao administrador.';
  if (cod === 'USUARIO_NAO_ENCONTRADO') return 'Usuario nao encontrado.';
  if (cod === 'REDE') return 'Sem conexao com o servidor de login.';
  return e?.message || 'Nao foi possivel definir a senha.';
}

async function handleSubmit() {
  erro.value = null;

  if (senha.value.length < 6) { erro.value = 'A senha deve ter ao menos 6 caracteres.'; return; }
  if (senha.value !== confirmacao.value) { erro.value = 'As senhas nao coincidem.'; return; }

  enviando.value = true;
  try {
    const r = await authStore.setupPassword(token.value, senha.value);

    // O convite exige 2FA e falta configurar: emenda direto no QR do hub — a
    // tela de enrolamento e compartilhada por todos os apps. O magic link ja
    // morreu nesta chamada, entao nao da para voltar aqui.
    if (r.etapa === 'enrolar') { window.location.href = r.url; return; }

    // Conta que JA tem autenticador (tipico de reset de senha): o hub devolve
    // desafio em vez de sessao, senao o reset seria atalho para pular o 2FA.
    if (r.etapa === '2fa') {
      aviso.value = 'Senha definida. Entre novamente e confirme o codigo do autenticador.';
      setTimeout(() => router.replace('/login'), 2500);
      return;
    }

    router.replace('/');
  } catch (e) {
    erro.value = traduzir(e);
  } finally {
    enviando.value = false;
  }
}
</script>

<template>
  <div class="relative min-h-screen bg-surface-base text-white flex items-center justify-center p-4 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-surface-raised via-surface-base to-surface-base">
    <div class="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,_#8b5cf615_0%,_transparent_40%)]"></div>

    <div class="relative z-10 w-full max-w-[420px] animate-fade-in-up">
      <div class="bg-surface-raised/60 backdrop-blur-xl border border-white/10 p-10 rounded-[2rem] shadow-modal">

        <div class="text-center mb-10">
          <img src="/favicon.svg" alt="TodoAPP" class="w-20 h-20 mx-auto mb-6 rounded-2xl shadow-lg object-contain bg-white/5 p-1" />
          <h1 class="text-3xl font-display font-semibold tracking-tight">Defina sua senha</h1>
          <p class="text-muted mt-2">Primeiro acesso ao TodoAPP. Escolha uma senha segura.</p>
        </div>

        <!-- Sem token na URL nao ha o que fazer: o link e a credencial. -->
        <div v-if="!token" class="text-center space-y-6">
          <p class="text-sm text-muted">
            Link invalido: falta o token de acesso. Abra o link do e-mail exatamente
            como ele veio, ou peca um novo ao administrador.
          </p>
          <button
            class="w-full bg-gradient-to-r from-accent to-primary text-white font-semibold py-4 rounded-2xl transition-all hover:scale-[1.02]"
            @click="router.replace('/login')"
          >
            Ir para o login
          </button>
        </div>

        <form v-else @submit.prevent="handleSubmit" class="space-y-6">
          <div class="space-y-4">
            <input
              v-model="senha"
              type="password"
              required
              autocomplete="new-password"
              placeholder="Nova senha"
              class="w-full bg-surface-overlay/50 border border-surface-border rounded-2xl px-5 py-4 text-white placeholder-muted focus:border-accent focus:bg-surface-overlay focus:ring-1 focus:ring-accent outline-none transition-all duration-300"
            />
            <input
              v-model="confirmacao"
              type="password"
              required
              autocomplete="new-password"
              placeholder="Confirme a nova senha"
              class="w-full bg-surface-overlay/50 border border-surface-border rounded-2xl px-5 py-4 text-white placeholder-muted focus:border-accent focus:bg-surface-overlay focus:ring-1 focus:ring-accent outline-none transition-all duration-300"
            />
          </div>

          <p v-if="erro" class="text-sm text-red-400 text-center">{{ erro }}</p>
          <p v-if="aviso" class="text-sm text-emerald-400 text-center">{{ aviso }}</p>

          <p class="text-xs text-muted text-center">
            Esta conta exige verificacao em duas etapas. Tenha o celular a mao —
            o proximo passo e escanear um QR code.
          </p>

          <button
            type="submit"
            :disabled="enviando"
            class="w-full bg-gradient-to-r from-accent to-primary text-white font-semibold py-4 rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 shadow-lg"
          >
            {{ enviando ? 'Salvando...' : 'Salvar senha e continuar' }}
          </button>
        </form>

      </div>
    </div>
  </div>
</template>
