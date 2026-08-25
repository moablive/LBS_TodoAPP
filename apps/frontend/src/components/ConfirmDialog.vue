<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useConfirmDialog } from '@/composables/useConfirmDialog';

/**
 * Diálogo global de alerta e confirmação.
 *
 * O composable `useConfirmDialog` já existia — com `isAlert`, promessa e tudo —,
 * mas o componente que o desenhava nunca foi escrito, então ninguém o usava e as
 * telas caíam no `alert()`/`confirm()` do navegador. Aquilo ignora o tema (fica
 * um retângulo branco de sistema no meio de um app escuro), mostra o domínio
 * como remetente e trava a aba inteira enquanto está aberto.
 *
 * Vive uma vez só, no `App.vue`, acima do `<router-view />` — por isso funciona
 * também no /login, que não tem layout compartilhado.
 */
const { isOpen, options, close } = useConfirmDialog();

const okRef = ref<HTMLButtonElement | null>(null);
/** Quem tinha o foco antes de abrir, para devolvê-lo ao fechar. */
let focoAnterior: HTMLElement | null = null;

const ehAlerta = computed(() => options.value.isAlert === true);
const tom = computed(() => options.value.tone ?? (ehAlerta.value ? 'erro' : 'pergunta'));
const titulo = computed(
  () => options.value.title ?? (ehAlerta.value ? 'Não deu certo' : 'Confirmar')
);

const gradiente = computed(() => ({
  erro: 'from-[#ff3b30] to-[#ff9500]',
  aviso: 'from-[#ff9500] to-[#ffcc00]',
  pergunta: 'from-accent to-primary',
}[tom.value]));

watch(isOpen, async (aberto) => {
  // Trava o scroll do fundo: sem isso a página rola atrás do diálogo no
  // celular, e o painel parece flutuar sobre conteúdo em movimento.
  document.body.style.overflow = aberto ? 'hidden' : '';

  if (aberto) {
    focoAnterior = document.activeElement as HTMLElement | null;
    await nextTick();
    okRef.value?.focus();
  } else {
    focoAnterior?.focus?.();
    focoAnterior = null;
  }
});

/**
 * Esc cancela. Num alerta não há o que cancelar — a promessa resolve igual,
 * porque quem chamou `alert()` só espera o "já vi".
 */
function onEsc() {
  if (isOpen.value) close(false);
}

/** Tab e Shift+Tab circulam dentro do painel enquanto ele está aberto. */
function onTab(e: KeyboardEvent) {
  const foco = Array.from(
    (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button')
  ).filter((b) => !b.hasAttribute('disabled'));
  if (foco.length === 0) return;

  const primeiro = foco[0];
  const ultimo = foco[foco.length - 1];
  const atual = document.activeElement;

  if (e.shiftKey && atual === primeiro) {
    e.preventDefault();
    ultimo.focus();
  } else if (!e.shiftKey && atual === ultimo) {
    e.preventDefault();
    primeiro.focus();
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-smooth"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-smooth"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        @click.self="close(false)"
        @keydown.esc="onEsc"
        @keydown.tab="onTab"
      >
        <Transition
          appear
          enter-active-class="transition duration-300 ease-smooth"
          enter-from-class="opacity-0 translate-y-4 sm:scale-95"
          leave-active-class="transition duration-150 ease-smooth"
          leave-to-class="opacity-0 sm:scale-95"
        >
          <div
            v-if="isOpen"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="dlg-titulo"
            aria-describedby="dlg-msg"
            class="w-full sm:max-w-[420px] bg-surface-raised/80 backdrop-blur-xl border border-white/10
                   rounded-3xl sm:rounded-[2rem] p-8 shadow-modal"
          >
            <div class="text-center">
              <div
                class="inline-flex items-center justify-center w-14 h-14 rounded-2xl shadow-lg mb-5
                       bg-gradient-to-tr"
                :class="gradiente"
              >
                <!-- Alerta: exclamação. Confirmação: interrogação. -->
                <svg
                  v-if="ehAlerta"
                  class="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2.5"
                    d="M12 9v3.75m0 3.75h.007M10.34 3.94l-8.1 14.02A1.92 1.92 0 003.9 21h16.2a1.92 1.92 0 001.66-3.04l-8.1-14.02a1.92 1.92 0 00-3.32 0z"
                  />
                </svg>
                <svg
                  v-else
                  class="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2.5"
                    d="M9.88 9.09a2.25 2.25 0 114.02 1.4c-.66.79-1.65 1.3-1.65 2.26v.5m0 3.25h.007"
                  />
                  <circle cx="12" cy="12" r="9.25" stroke-width="2" />
                </svg>
              </div>

              <h2 id="dlg-titulo" class="text-xl font-display font-semibold tracking-tight text-white">
                {{ titulo }}
              </h2>
              <p id="dlg-msg" class="text-muted mt-2 text-sm leading-relaxed">
                {{ options.message }}
              </p>
            </div>

            <div class="mt-8 flex flex-col-reverse sm:flex-row gap-3">
              <button
                v-if="!ehAlerta"
                type="button"
                class="flex-1 py-3.5 rounded-2xl font-semibold text-white bg-surface-overlay/70
                       border border-surface-border hover:bg-surface-overlay
                       transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                @click="close(false)"
              >
                {{ options.cancelText ?? 'Cancelar' }}
              </button>

              <button
                ref="okRef"
                type="button"
                class="flex-1 py-3.5 rounded-2xl font-semibold text-white shadow-lg
                       bg-gradient-to-r transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                       focus:outline-none focus:ring-2 focus:ring-white/40"
                :class="gradiente"
                @click="close(true)"
              >
                {{ options.confirmText ?? (ehAlerta ? 'Entendi' : 'Confirmar') }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
