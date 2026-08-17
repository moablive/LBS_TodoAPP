<template>
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="$emit('close')">
    <div class="w-full md:w-[500px] max-h-[90vh] bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden">
      <div class="flex-1 px-5 pt-6 pb-4 overflow-y-auto custom-scrollbar">
        <!-- Espelho de calendário externo: editar aqui não adianta, a próxima
             sync traz o valor do feed de volta. -->
        <div v-if="isSynced" class="flex items-start gap-2 mb-4 px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
          <span class="text-[13px] leading-none mt-0.5">🔗</span>
          <p class="text-[12px] text-[var(--muted)] leading-snug">
            Evento sincronizado de um calendário externo. Título, horário e duração são
            atualizados pelo feed — mudanças feitas aqui voltam atrás na próxima sincronização.
            Apagar remove o evento só do TodoAPP.
          </p>
        </div>

        <!-- Título -->
        <input
          ref="titleEl"
          v-model="form.description"
          type="text"
          placeholder="Adicionar título"
          class="w-full bg-transparent text-[20px] font-medium text-[var(--text)] placeholder-[var(--muted2)] border-0 border-b-2 border-[var(--border)] focus:border-[var(--accent)] outline-none pb-2 mb-4 transition-colors"
          @keydown.enter="save"
        />

        <!-- Data e hora -->
        <div class="flex items-center gap-3 py-2">
          <ClockIcon class="w-5 h-5 text-[var(--muted)] shrink-0" />
          <DatePickerDropdown v-model="dateStr" />
        </div>
        <!-- Início – fim (duração) -->
        <div class="flex items-center gap-2 py-2 pl-8">
          <TimePickerDropdown v-model="timeStr" />
          <span class="text-[var(--muted)] text-[13px] shrink-0">até</span>
          <TimePickerDropdown v-model="endTimeStr" :start-time="timeStr" />
          <span v-if="durationLabel" class="text-[11px] font-semibold text-[var(--muted)] shrink-0 w-[42px] text-right">{{ durationLabel }}</span>
        </div>

        <!-- Repetir -->
        <div class="flex items-center gap-3 py-2">
          <ArrowPathIcon class="w-5 h-5 text-[var(--muted)] shrink-0" />
          <select
            v-model="form.recurrence"
            class="flex-1 min-w-0 bg-[var(--bg)] text-[var(--text)] text-[14px] rounded-lg px-3 py-2 border border-transparent focus:border-[var(--accent)] outline-none transition-colors appearance-none cursor-pointer"
          >
            <option :value="null">Não se repete</option>

            <option value="daily">Todos os dias</option>
            <option value="weekdays">Dias úteis (seg a sex)</option>
            <option value="weekly">Semanal{{ weekdayHint }}</option>
            <option value="monthly">Mensal{{ monthdayHint }}</option>
            <option value="yearly">Anual{{ yeardayHint }}</option>
          </select>
        </div>

        <!-- Lista -->
        <div class="flex items-center gap-3 py-2">
          <FolderIcon class="w-5 h-5 text-[var(--muted)] shrink-0" />
          <select
            v-model="form.groupId"
            class="flex-1 min-w-0 bg-[var(--bg)] text-[var(--text)] text-[14px] rounded-lg px-3 py-2 border border-transparent focus:border-[var(--accent)] outline-none transition-colors appearance-none cursor-pointer"
          >
            <option :value="null">Sem lista</option>
            <option v-for="g in tasksStore.groups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
        </div>

        <!-- Prioridade -->
        <div class="flex items-center gap-3 py-2">
          <FlagIcon class="w-5 h-5 text-[var(--muted)] shrink-0" />
          <div class="flex-1 flex gap-2">
            <button
              v-for="p in priorities"
              :key="p.id"
              @click="form.priority = p.id"
              class="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[13px] font-medium transition-colors"
              :class="form.priority === p.id ? 'border-white/50 bg-[var(--bg-hover)] text-[var(--text)]' : 'border-transparent bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--text)]'"
            >
              <span class="w-2 h-2 rounded-full" :class="p.dot"></span>{{ p.label }}
            </button>
          </div>
        </div>
        
        <!-- Detalhes -->
        <div class="flex items-start gap-3 py-2">
          <div class="w-5 h-5 shrink-0 mt-1 flex items-center justify-center text-[var(--muted)]">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
          </div>
          <div
            ref="detailsEl"
            contenteditable="true"
            @input="updateDetails"
            @paste="handlePaste"
            data-placeholder="Adicionar detalhes (com suporte a imagem)..."
            class="flex-1 w-full bg-[var(--bg-hover)] text-[var(--text)] text-[13px] rounded-lg px-3 py-2 border border-transparent focus:border-[var(--accent)] outline-none transition-colors min-h-[100px] whitespace-pre-wrap break-words"
          ></div>
        </div>
      </div>

      <!-- Ações -->
      <div class="flex justify-between items-center px-5 py-4 border-t border-[var(--border)] bg-[var(--bg-card)] shrink-0">
        <div class="flex items-center gap-2">
          <button
            v-if="initialTask"
            @click="deleteTask"
            :disabled="isSaving"
            class="px-4 py-2 rounded-full text-[13px] font-semibold text-[#ff3b30] hover:bg-[#ff3b30]/10 disabled:opacity-40 transition-colors"
          >
            Deletar
          </button>
          <button
            v-if="initialTask"
            @click="toggleComplete"
            :disabled="isSaving"
            class="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold disabled:opacity-40 transition-colors"
            :class="initialTask.completedAt ? 'text-[var(--muted)] hover:bg-[var(--bg-hover)]' : 'text-[#30d158] hover:bg-[#30d158]/10'"
          >
            <CheckCircleIcon class="w-4 h-4" />
            {{ initialTask.completedAt ? 'Reabrir' : 'Concluir' }}
          </button>
        </div>
        <div class="flex gap-2">
          <button
            @click="$emit('close')"
            class="px-4 py-2 rounded-full text-[13px] font-semibold text-[var(--muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)] transition-colors"
          >
            Cancelar
          </button>
          <button
            @click="save"
            :disabled="!form.description.trim() || isSaving"
            class="px-5 py-2 rounded-full text-[13px] font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors"
          >
            {{ isSaving ? 'Salvando…' : 'Salvar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { ClockIcon, ArrowPathIcon, FolderIcon, FlagIcon, CheckCircleIcon } from '@heroicons/vue/24/outline';
import { useTasksStore } from '@/stores/tasks';
import type { TaskDto } from '@todoapp/models';
import DatePickerDropdown from './DatePickerDropdown.vue';
import TimePickerDropdown from './TimePickerDropdown.vue';

const props = defineProps<{ initialDate?: Date | null; initialTask?: TaskDto | null }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'created'): void; (e: 'updated'): void }>();

const tasksStore = useTasksStore();
const isSynced = computed(() => props.initialTask?.source === 'ics');
const isSaving = ref(false);
const titleEl = ref<HTMLInputElement | null>(null);
const detailsEl = ref<HTMLDivElement | null>(null);

const handleEsc = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close');
};

const updateDetails = (e: Event) => {
  const target = e.target as HTMLDivElement;
  form.value.details = target.innerHTML;
};

const handlePaste = (e: ClipboardEvent) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item && item.type.indexOf('image') !== -1) {
      const blob = item.getAsFile();
      if (blob) {
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 800;
              let width = img.width;
              let height = img.height;

              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                document.execCommand('insertImage', false, dataUrl);
                if (detailsEl.value) {
                  form.value.details = detailsEl.value.innerHTML;
                }
              }
            };
            img.src = event.target.result as string;
          }
        };
        reader.readAsDataURL(blob);
      }
    }
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleEsc);
  if (titleEl.value) {
    setTimeout(() => {
      titleEl.value?.focus();
    }, 100);
  }
  if (detailsEl.value && form.value.details) {
    detailsEl.value.innerHTML = form.value.details;
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEsc);
});

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function defaultDate() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

const initial = props.initialTask && props.initialTask.scheduledAt 
  ? new Date(props.initialTask.scheduledAt) 
  : (props.initialDate ?? defaultDate());

const dateStr = ref(props.initialTask && !props.initialTask.scheduledAt ? '' : `${initial.getFullYear()}-${pad(initial.getMonth() + 1)}-${pad(initial.getDate())}`);
const timeStr = ref(props.initialTask && !props.initialTask.scheduledAt ? '' : `${pad(initial.getHours())}:${pad(initial.getMinutes())}`);

// Fim = início + duração salva (padrão 1h)
const initialEnd = new Date(initial.getTime() + (props.initialTask?.durationMinutes ?? 60) * 60_000);
const endTimeStr = ref(props.initialTask && !props.initialTask.scheduledAt ? '' : `${pad(initialEnd.getHours())}:${pad(initialEnd.getMinutes())}`);

// Duração em minutos a partir dos horários; fim menor que início = cruza a meia-noite.
const durationMinutes = computed<number | null>(() => {
  if (!timeStr.value || !endTimeStr.value) return null;
  const [sh, sm] = timeStr.value.split(':').map(Number);
  const [eh, em] = endTimeStr.value.split(':').map(Number);
  let dur = (eh! * 60 + em!) - (sh! * 60 + sm!);
  if (dur <= 0) dur += 24 * 60;
  return dur;
});

const durationLabel = computed(() => {
  const dur = durationMinutes.value;
  if (!dur) return '';
  const h = Math.floor(dur / 60);
  const m = dur % 60;
  if (!h) return `${m}min`;
  return m ? `${h}h${pad(m)}` : `${h}h`;
});

const form = ref({
  description: props.initialTask?.description || '',
  groupId: props.initialTask?.groupId || null,
  priority: props.initialTask?.priority || 'low',
  recurrence: props.initialTask?.recurrence || null,
  details: props.initialTask?.details || '',
});

const priorities = [
  { id: 'low' as const, label: 'Baixa', dot: 'bg-[#34c759]' },
  { id: 'medium' as const, label: 'Média', dot: 'bg-[#ffcc00]' },
  { id: 'high' as const, label: 'Alta', dot: 'bg-[#ff3b30]' },
];

const selectedDate = computed(() => {
  if (!dateStr.value) return null;
  const [y, m, d] = dateStr.value.split('-').map(Number);
  const [hh, mm] = (timeStr.value || '00:00').split(':').map(Number);
  return new Date(y!, (m! - 1), d!, hh || 0, mm || 0, 0, 0);
});

const weekdayNames = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const weekdayHint = computed(() =>
  selectedDate.value ? ` (toda ${weekdayNames[selectedDate.value.getDay()]})` : ''
);
const monthdayHint = computed(() =>
  selectedDate.value ? ` (todo dia ${selectedDate.value.getDate()})` : ''
);
const yeardayHint = computed(() => {
  if (!selectedDate.value) return '';
  return ` (todo ${selectedDate.value.getDate()}/${pad(selectedDate.value.getMonth() + 1)})`;
});

async function save() {
  const description = form.value.description.trim();
  if (!description || isSaving.value) return;
  isSaving.value = true;
  try {
    if (props.initialTask) {
      await tasksStore.updateTaskFields(props.initialTask.id, {
        description,
        groupId: form.value.groupId,
        scheduledAt: selectedDate.value ? selectedDate.value.toISOString() : null,
        priority: form.value.priority,
        recurrence: form.value.recurrence,
        details: form.value.details.trim() || null,
        durationMinutes: durationMinutes.value,
      });
      emit('updated');
    } else {
      await tasksStore.addTaskFull({
        description,
        groupId: form.value.groupId,
        scheduledAt: selectedDate.value ? selectedDate.value.toISOString() : null,
        priority: form.value.priority,
        recurrence: form.value.recurrence,
        details: form.value.details.trim() || null,
        durationMinutes: durationMinutes.value,
      });
      emit('created');
    }
    emit('close');
  } catch (err) {
    console.error('Erro ao salvar evento:', err);
  } finally {
    isSaving.value = false;
  }
}

async function toggleComplete() {
  if (!props.initialTask || isSaving.value) return;
  isSaving.value = true;
  try {
    await tasksStore.updateTaskFields(props.initialTask.id, {
      completedAt: props.initialTask.completedAt ? null : new Date().toISOString(),
    });
    emit('updated');
    emit('close');
  } catch (err) {
    console.error('Erro ao concluir evento:', err);
  } finally {
    isSaving.value = false;
  }
}

async function deleteTask() {
  if (!props.initialTask || isSaving.value) return;
  isSaving.value = true;
  try {
    await tasksStore.deleteTask(props.initialTask.id);
    emit('updated');
    emit('close');
  } catch (err) {
    console.error('Erro ao deletar evento:', err);
  } finally {
    isSaving.value = false;
  }
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--border);
  border-radius: 10px;
}
[contenteditable="true"]:empty:before {
  content: attr(data-placeholder);
  color: var(--muted);
  pointer-events: none;
  display: block; /* For Firefox */
}
[contenteditable="true"] img {
  max-width: 100%;
  border-radius: 8px;
  margin-top: 8px;
  margin-bottom: 8px;
}
</style>
