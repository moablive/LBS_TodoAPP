<template>
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/10 transform transition-all max-h-[90vh] flex flex-col">
      <div class="p-6 overflow-y-auto custom-scrollbar flex-1">
        <div class="flex items-center gap-3 mb-5">
          <BellAlertIcon class="w-6 h-6 text-[var(--accent)]" />
          <h2 class="text-xl font-semibold text-[var(--text)]">Lembretes</h2>
        </div>

        <div v-if="isLoading" class="text-[var(--muted)] text-sm py-8 text-center">Carregando…</div>

        <template v-else>
          <!-- Nome de exibição -->
          <h3 class="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Nome de exibição</h3>
          <div class="bg-[var(--bg)] rounded-xl px-4 py-3 mb-5">
            <p class="text-[12px] text-[var(--muted)] mb-2">Como o bot deve te chamar nas mensagens (ex.: "☀️ Bom dia, Patrão!")</p>
            <input
              v-model="displayNameInput"
              type="text"
              maxlength="60"
              placeholder="Patrão"
              class="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text)] text-[14px] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          <!-- Quando lembrar -->
          <h3 class="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Quando lembrar</h3>
          <div class="bg-[var(--bg)] rounded-xl divide-y divide-[var(--border)] mb-5">
            <div class="flex items-center justify-between px-4 py-3">
              <div>
                <p class="text-[14px] text-[var(--text)] font-medium">No horário</p>
                <p class="text-[12px] text-[var(--muted)]">Avisar na hora exata da tarefa</p>
              </div>
              <ToggleSwitch v-model="settings.remindAtTime" />
            </div>
            <div class="flex items-center justify-between px-4 py-3">
              <div>
                <p class="text-[14px] text-[var(--text)] font-medium">Antes do horário</p>
                <div class="flex items-center gap-1 text-[12px] text-[var(--muted)]">
                  <input
                    v-model.number="settings.remindBeforeMinutes"
                    type="number" min="1" max="1440"
                    class="w-14 bg-[var(--bg-card)] border border-[var(--border)] rounded-md px-1.5 py-0.5 text-[var(--text)] text-center focus:outline-none focus:border-[var(--accent)]"
                    :disabled="!settings.remindBeforeEnabled"
                  />
                  <span>minutos antes (padrão: 30)</span>
                </div>
              </div>
              <ToggleSwitch v-model="settings.remindBeforeEnabled" />
            </div>
            <div class="flex items-center justify-between px-4 py-3">
              <div>
                <p class="text-[14px] text-[var(--text)] font-medium">Dias antes</p>
                <div class="flex items-center gap-1 text-[12px] text-[var(--muted)]">
                  <input
                    v-model.number="settings.remindDaysBefore"
                    type="number" min="1" max="60"
                    class="w-14 bg-[var(--bg-card)] border border-[var(--border)] rounded-md px-1.5 py-0.5 text-[var(--text)] text-center focus:outline-none focus:border-[var(--accent)]"
                    :disabled="!settings.remindDaysEnabled"
                  />
                  <span>dias antes (padrão: 7)</span>
                </div>
              </div>
              <ToggleSwitch v-model="settings.remindDaysEnabled" />
            </div>
          </div>

          <!-- Por onde avisar -->
          <h3 class="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Por onde avisar</h3>
          <div class="bg-[var(--bg)] rounded-xl divide-y divide-[var(--border)] mb-5">
            <div class="flex items-center justify-between px-4 py-3">
              <div class="flex items-center gap-3">
                <PaperAirplaneIcon class="w-5 h-5 text-[var(--accent)]" />
                <p class="text-[14px] text-[var(--text)] font-medium">Telegram</p>
              </div>
              <ToggleSwitch v-model="settings.notifyTelegram" />
            </div>
            <div class="flex items-center justify-between px-4 py-3">
              <div class="flex items-center gap-3">
                <DevicePhoneMobileIcon class="w-5 h-5 text-[#30d158]" />
                <p class="text-[14px] text-[var(--text)] font-medium">Push (este app)</p>
              </div>
              <ToggleSwitch v-model="settings.notifyPush" />
            </div>
          </div>

          <!-- Push neste aparelho -->
          <h3 class="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Este aparelho</h3>
          <div class="bg-[var(--bg)] rounded-xl px-4 py-3">
            <template v-if="!push.isSupported">
              <p class="text-[13px] text-[var(--muted)]">
                Este navegador não suporta notificações push. Instale o app na tela inicial e tente por lá.
              </p>
            </template>
            <template v-else-if="push.permission.value === 'denied'">
              <p class="text-[13px] text-[#ff9500]">
                Notificações bloqueadas pelo navegador. Libere nas configurações do site para receber push.
              </p>
            </template>
            <template v-else>
              <div class="flex items-center justify-between gap-3">
                <p class="text-[13px]" :class="push.isSubscribed.value ? 'text-[#30d158]' : 'text-[var(--muted)]'">
                  {{ push.isSubscribed.value ? '✓ Este aparelho recebe notificações' : 'Este aparelho ainda não recebe notificações' }}
                </p>
                <button
                  v-if="!push.isSubscribed.value"
                  @click="enablePush"
                  :disabled="push.isBusy.value"
                  class="shrink-0 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-[13px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  {{ push.isBusy.value ? 'Ativando…' : 'Ativar' }}
                </button>
                <button
                  v-else
                  @click="push.disable()"
                  :disabled="push.isBusy.value"
                  class="shrink-0 bg-[var(--bg-hover)] hover:bg-[var(--bg-hover)] disabled:opacity-50 text-[#ff3b30] text-[13px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  Desativar
                </button>
              </div>
              <p v-if="push.error.value" class="text-[12px] text-[#ff3b30] mt-2">{{ push.error.value }}</p>
            </template>
          </div>
          <!-- Integrações -->
          <h3 class="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2 mt-5">Integrações</h3>
          <div class="bg-[var(--bg)] rounded-xl divide-y divide-[var(--border)] mb-5">
            <div class="flex items-center justify-between px-4 py-3">
              <div>
                <p class="text-[14px] text-[var(--text)] font-medium">Eventos do MoneyAPP</p>
                <p class="text-[12px] text-[var(--muted)]">Exibir faturas e compromissos no calendário</p>
              </div>
              <ToggleSwitch v-model="prefs.showMoneyAppEvents" />
            </div>
          </div>
        </template>
      </div>

      <div class="flex border-t border-[var(--border)]">
        <button
          @click="$emit('close')"
          class="flex-1 py-3.5 text-[var(--muted)] font-medium hover:bg-[var(--bg-hover)] transition-colors"
        >
          Cancelar
        </button>
        <div class="w-[1px] bg-[var(--border)]"></div>
        <button
          @click="save"
          :disabled="isSaving || isLoading"
          class="flex-1 py-3.5 text-[var(--accent)] font-semibold hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
        >
          {{ isSaving ? 'Salvando…' : 'Salvar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '@/api/client';
import { usePush } from '@/composables/usePush';
import {
  BellAlertIcon,
  DevicePhoneMobileIcon,
  PaperAirplaneIcon,
} from '@heroicons/vue/24/outline';
import ToggleSwitch from './ToggleSwitch.vue';

interface ReminderSettings {
  remindAtTime: boolean;
  remindBeforeEnabled: boolean;
  remindBeforeMinutes: number;
  remindDaysEnabled: boolean;
  remindDaysBefore: number;
  notifyPush: boolean;
  notifyTelegram: boolean;
  displayName: string | null;
}

interface UserPrefs {
  kanbanLists: string[];
  showMoneyAppEvents: boolean;
}

const emit = defineEmits<{ (e: 'close'): void }>();

const push = usePush();
const isLoading = ref(true);
const isSaving = ref(false);

const settings = ref<ReminderSettings>({
  remindAtTime: true,
  remindBeforeEnabled: true,
  remindBeforeMinutes: 30,
  remindDaysEnabled: true,
  remindDaysBefore: 7,
  notifyPush: true,
  notifyTelegram: true,
  displayName: null,
});

const displayNameInput = ref('');

const prefs = ref<UserPrefs>({
  kanbanLists: [],
  showMoneyAppEvents: true,
});

onMounted(async () => {
  try {
    const [s, p] = await Promise.all([
      api.get<ReminderSettings>('/reminders'),
      api.get<UserPrefs>('/prefs')
    ]);
    settings.value = s;
    displayNameInput.value = s.displayName || '';
    prefs.value = p;
  } catch (err) {
    console.error('Erro ao carregar configurações:', err);
  } finally {
    isLoading.value = false;
  }
  push.refresh();
});

async function enablePush() {
  const ok = await push.enable();
  if (ok && !settings.value.notifyPush) {
    settings.value.notifyPush = true;
  }
}

async function save() {
  isSaving.value = true;
  // Inputs numéricos podem ficar vazios/NaN — normaliza para os padrões.
  settings.value.remindBeforeMinutes = Math.min(1440, Math.max(1, Math.round(Number(settings.value.remindBeforeMinutes) || 30)));
  settings.value.remindDaysBefore = Math.min(60, Math.max(1, Math.round(Number(settings.value.remindDaysBefore) || 7)));
  settings.value.displayName = displayNameInput.value.trim() || null;
  try {
    await Promise.all([
      api.patch<ReminderSettings>('/reminders', settings.value),
      api.patch<UserPrefs>('/prefs', { showMoneyAppEvents: prefs.value.showMoneyAppEvents })
    ]);
    emit('close');
  } catch (err) {
    console.error('Erro ao salvar configurações:', err);
  } finally {
    isSaving.value = false;
  }
}
</script>
