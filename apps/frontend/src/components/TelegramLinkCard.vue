<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import QRCode from 'qrcode';
import { api } from '@todoapp/api-client';
import { useConfirmDialog } from '@/composables/useConfirmDialog';

/**
 * Vínculo híbrido do Telegram: o PC autentica, o chat só recebe o vínculo.
 *
 * POR QUE ISTO SUBSTITUI O LOGIN PELO BOT
 *
 * O bot pedia e-mail, senha e o código do 2FA dentro da conversa. Tudo isso fica
 * no histórico do Telegram — nos servidores deles, no aparelho e em qualquer
 * backup de chat — e o código do autenticador, que existe justamente para não
 * ser reutilizável, passava pelo mesmo canal que o resto.
 *
 * Aqui a autenticação já aconteceu: quem vê este botão tem sessão do LoginHUB,
 * com 2FA cumprido. O que atravessa o chat é um passe de uso único, válido por
 * 10 minutos, que não abre nada além de gravar o vínculo.
 */
const { confirm } = useConfirmDialog();

const telegramId = ref<string | null>(null);
const deepLink = ref<string | null>(null);
const qrDataUrl = ref('');
const carregando = ref(false);
const erro = ref('');
const segundosRestantes = ref(0);

let cronometro: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  try {
    const r = await api.get<{ telegramId: string | null }>('/telegram/link');
    telegramId.value = r.telegramId;
  } catch {
    /* silencioso: o card ainda oferece o botao de vincular */
  }
});

onBeforeUnmount(pararCronometro);

function pararCronometro() {
  if (cronometro) clearInterval(cronometro);
  cronometro = null;
}

/**
 * O passe expira sozinho no servidor; o contador aqui é só honestidade visual.
 * Sem ele o QR fica na tela parecendo válido e a pessoa descobre que venceu
 * quando o bot recusa — que é o pior momento para descobrir.
 */
function iniciarCronometro(segundos: number) {
  pararCronometro();
  segundosRestantes.value = segundos;
  cronometro = setInterval(() => {
    segundosRestantes.value -= 1;
    if (segundosRestantes.value <= 0) {
      pararCronometro();
      deepLink.value = null;
      qrDataUrl.value = '';
    }
  }, 1000);
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

async function gerarLink() {
  if (carregando.value) return;
  carregando.value = true;
  erro.value = '';
  try {
    const r = await api.post<{ deepLink: string; expiresIn: number }>('/telegram/link-token');
    deepLink.value = r.deepLink;
    // QR desenhado no navegador: o passe não vai para gerador de terceiro.
    try {
      qrDataUrl.value = await QRCode.toDataURL(r.deepLink, {
        width: 180,
        margin: 1,
        color: { dark: '#121215', light: '#ffffff' },
      });
    } catch {
      qrDataUrl.value = '';
    }
    iniciarCronometro(r.expiresIn);
  } catch (e) {
    erro.value = (e as { body?: { message?: string } })?.body?.message
      ?? 'Nao foi possivel gerar o link. Tente de novo.';
  } finally {
    carregando.value = false;
  }
}

async function desvincular() {
  const ok = await confirm({
    title: 'Desvincular o Telegram?',
    message:
      'O bot para de reconhecer este chat e os lembretes deixam de chegar por lá. '
      + 'Suas tarefas continuam intactas — e você pode vincular de novo quando quiser.',
    confirmText: 'Desvincular',
  });
  if (!ok) return;

  try {
    await api.delete('/telegram/link');
    telegramId.value = null;
    deepLink.value = null;
    qrDataUrl.value = '';
    pararCronometro();
  } catch (e) {
    erro.value = (e as { body?: { message?: string } })?.body?.message ?? 'Nao foi possivel desvincular.';
  }
}
</script>

<template>
  <div class="px-4 py-3">
    <p class="text-[13px] text-[var(--text)] font-medium mb-1">Conta do Telegram</p>

    <!-- Já vinculado -->
    <template v-if="telegramId">
      <p class="text-[12px] text-[var(--muted)] mb-3">
        Vinculado ao chat <code class="font-mono">{{ telegramId }}</code>.
      </p>
      <button
        type="button"
        class="text-[13px] px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-card)] transition-colors"
        @click="desvincular"
      >
        Desvincular
      </button>
    </template>

    <!-- Ainda não vinculado -->
    <template v-else>
      <p class="text-[12px] text-[var(--muted)] mb-3">
        Você já está autenticado aqui. Gere um link e abra no Telegram — não precisa
        digitar senha nem código no chat.
      </p>

      <button
        v-if="!deepLink"
        type="button"
        :disabled="carregando"
        class="text-[13px] px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
        @click="gerarLink"
      >
        {{ carregando ? 'Gerando...' : 'Vincular Telegram' }}
      </button>

      <div v-else class="space-y-3">
        <div v-if="qrDataUrl" class="flex justify-center">
          <img :src="qrDataUrl" alt="QR Code para abrir o bot no Telegram" class="rounded-xl bg-white p-2" />
        </div>

        <a
          :href="deepLink"
          target="_blank"
          rel="noopener"
          class="block text-center text-[13px] px-3 py-2 rounded-lg bg-[var(--accent)] text-white font-medium hover:opacity-90 transition-opacity"
        >
          Abrir no Telegram
        </a>

        <p class="text-[12px] text-[var(--muted)] text-center">
          Uso único · expira em {{ mmss(segundosRestantes) }}
        </p>

        <button
          type="button"
          class="w-full text-[12px] text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
          @click="gerarLink"
        >
          Gerar outro link
        </button>
      </div>
    </template>

    <p v-if="erro" class="text-[12px] text-red-400 mt-2">{{ erro }}</p>
  </div>
</template>
