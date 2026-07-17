<template>
  <div class="relative flex-1 min-w-0">
    <button
      type="button"
      @click="toggle"
      class="w-full flex items-center justify-between gap-2 bg-[var(--bg)] text-[var(--text)] text-[14px] rounded-lg px-3 py-2 border outline-none transition-colors"
      :class="open ? 'border-[var(--accent)] relative z-50' : 'border-transparent hover:border-[var(--border)]'"
    >
      <span class="capitalize truncate" :class="modelValue ? '' : 'text-[var(--muted2)]'">{{ label }}</span>
      <CalendarDaysIcon class="w-4 h-4 text-[var(--muted)] shrink-0" />
    </button>

    <div v-if="open" class="fixed inset-0 z-40" @mousedown="open = false"></div>

    <div v-if="open" class="absolute left-0 top-full mt-1.5 z-50 w-[276px] bg-[var(--bg-card)] border border-white/10 rounded-xl shadow-2xl p-3 select-none">
      <div class="flex items-center justify-between mb-2 px-1">
        <span class="text-[13px] font-bold text-[var(--text)] capitalize">{{ monthLabel }}</span>
        <div class="flex items-center gap-1">
          <button type="button" @click="moveMonth(-1)" class="p-1 rounded-md hover:bg-[var(--bg-hover)] text-[var(--muted)] hover:text-[var(--text)] transition-colors">
            <ChevronLeftIcon class="w-4 h-4" />
          </button>
          <button type="button" @click="moveMonth(1)" class="p-1 rounded-md hover:bg-[var(--bg-hover)] text-[var(--muted)] hover:text-[var(--text)] transition-colors">
            <ChevronRightIcon class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="grid grid-cols-7 mb-1">
        <span
          v-for="(wd, i) in weekdayHeaders"
          :key="i"
          class="text-center text-[10px] font-bold uppercase py-1"
          :class="i >= 5 ? 'text-[#ff453a]/70' : 'text-[var(--muted)]'"
        >
          {{ wd }}
        </span>
      </div>
      <div class="grid grid-cols-7 gap-y-0.5">
        <button
          v-for="cell in cells"
          :key="cell.key"
          type="button"
          @click="pick(cell.date)"
          class="h-8 w-8 mx-auto flex items-center justify-center rounded-full text-[12px] transition-colors"
          :class="cellClass(cell)"
        >
          {{ cell.date.getDate() }}
        </button>
      </div>

      <div class="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
        <button type="button" @click="clear" class="text-[12px] font-semibold text-[var(--muted)] hover:text-[#ff3b30] px-2 py-1 rounded-md transition-colors">Limpar</button>
        <button type="button" @click="pick(new Date())" class="text-[12px] font-semibold text-[var(--accent)] hover:brightness-110 px-2 py-1 rounded-md transition-colors">Hoje</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline';

// v-model no formato 'YYYY-MM-DD' ('' = sem data), o mesmo dos inputs nativos.
const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();

const open = ref(false);
const pad = (n: number) => String(n).padStart(2, '0');

function parse(v: string): Date | null {
  if (!v) return null;
  const [y, m, d] = v.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

const viewCursor = ref<Date>(parse(props.modelValue) ?? new Date());

function toggle() {
  open.value = !open.value;
  if (open.value) viewCursor.value = parse(props.modelValue) ?? new Date();
}

function moveMonth(dir: number) {
  viewCursor.value = new Date(viewCursor.value.getFullYear(), viewCursor.value.getMonth() + dir, 1);
}

const label = computed(() => {
  const d = parse(props.modelValue);
  if (!d) return 'Sem data';
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
});

const monthLabel = computed(() =>
  viewCursor.value.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
);

// Semana começa na segunda, igual ao CalendarView.
const weekdayHeaders = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const cells = computed(() => {
  const year = viewCursor.value.getFullYear();
  const month = viewCursor.value.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - offset);
  const todayKey = dayKey(new Date());
  const selectedKey = props.modelValue || '';

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const key = dayKey(date);
    return {
      key,
      date,
      inMonth: date.getMonth() === month,
      isToday: key === todayKey,
      isSelected: key === selectedKey,
    };
  });
});

function cellClass(cell: { inMonth: boolean; isToday: boolean; isSelected: boolean }) {
  if (cell.isSelected) return 'bg-[var(--accent)] text-white font-bold shadow-md';
  if (cell.isToday) return 'text-[var(--accent)] font-bold ring-1 ring-[var(--accent)] hover:bg-[var(--bg-hover)]';
  if (cell.inMonth) return 'text-[var(--text)] hover:bg-[var(--bg-hover)]';
  return 'text-[var(--muted2)] opacity-60 hover:bg-[var(--bg-hover)]';
}

function pick(d: Date) {
  emit('update:modelValue', dayKey(d));
  open.value = false;
}

function clear() {
  emit('update:modelValue', '');
  open.value = false;
}
</script>
