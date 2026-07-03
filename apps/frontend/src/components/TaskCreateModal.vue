<template>
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click.self="$emit('close')">
    <div class="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-sm border border-white/10">
      <div class="px-5 pt-5 pb-2">
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
          <input
            v-model="dateStr"
            type="date"
            class="flex-1 min-w-0 bg-[var(--bg)] text-[var(--text)] text-[14px] rounded-lg px-3 py-2 border border-transparent focus:border-[var(--accent)] outline-none transition-colors"
          />
          <input
            v-model="timeStr"
            type="time"
            class="w-[110px] bg-[var(--bg)] text-[var(--text)] text-[14px] rounded-lg px-3 py-2 border border-transparent focus:border-[var(--accent)] outline-none transition-colors"
          />
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
      </div>

      <!-- Ações -->
      <div class="flex justify-end gap-2 px-5 py-4">
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
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ClockIcon, ArrowPathIcon, FolderIcon, FlagIcon } from '@heroicons/vue/24/outline';
import { useTasksStore } from '@/stores/tasks';

const props = defineProps<{ initialDate?: Date | null }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'created'): void }>();

const tasksStore = useTasksStore();
const isSaving = ref(false);
const titleEl = ref<HTMLInputElement | null>(null);
onMounted(() => titleEl.value?.focus());

function pad(n: number) {
  return String(n).padStart(2, '0');
}

const initial = props.initialDate ?? defaultDate();
const dateStr = ref(`${initial.getFullYear()}-${pad(initial.getMonth() + 1)}-${pad(initial.getDate())}`);
const timeStr = ref(`${pad(initial.getHours())}:${pad(initial.getMinutes())}`);

const form = ref({
  description: '',
  groupId: null as string | null,
  priority: 'low' as 'low' | 'medium' | 'high',
  recurrence: null as 'daily' | 'weekly' | 'monthly' | 'yearly' | null,
});

function defaultDate() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

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
    await tasksStore.addTaskFull({
      description,
      groupId: form.value.groupId,
      scheduledAt: selectedDate.value ? selectedDate.value.toISOString() : null,
      priority: form.value.priority,
      recurrence: form.value.recurrence,
    });
    emit('created');
    emit('close');
  } catch (err) {
    console.error('Erro ao criar evento:', err);
  } finally {
    isSaving.value = false;
  }
}
</script>
