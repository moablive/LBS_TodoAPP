<template>
  <div class="flex flex-col h-full">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
      <div class="flex items-center gap-3">
        <button
          @click="openCreate(null)"
          class="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[13px] font-semibold pl-3 pr-4 py-2 rounded-xl shadow transition-colors"
        >
          <PlusIcon class="w-4 h-4" /> Criar
        </button>
        <h2 class="text-[20px] font-bold text-[var(--text)] capitalize">{{ title }}</h2>
      </div>

      <div class="flex items-center gap-2">
        <button @click="navigate(-1)" title="Anterior (←)" class="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--muted)] hover:text-[var(--text)] transition-colors">
          <ChevronLeftIcon class="w-5 h-5" />
        </button>
        <button @click="navigate(1)" title="Próximo (→)" class="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--muted)] hover:text-[var(--text)] transition-colors">
          <ChevronRightIcon class="w-5 h-5" />
        </button>
        <div class="flex items-center bg-[var(--bg-hover)] rounded-lg border border-white/5 p-0.5 ml-1">
          <button
            v-for="vt in viewTypes"
            :key="vt.id"
            @click="viewType = vt.id"
            :title="`${vt.label} (${vt.key.toUpperCase()})`"
            class="px-3 py-1 rounded-md text-[13px] font-medium transition-colors flex items-center gap-1.5"
            :class="viewType === vt.id ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--text)]'"
          >
            {{ vt.label }}
            <span class="text-[10px] font-bold uppercase" :class="viewType === vt.id ? 'opacity-60' : 'opacity-40'">{{ vt.key }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ══════════ MONTH ══════════ -->
    <template v-if="viewType === 'month'">
      <div class="grid grid-cols-7 gap-px mb-1">
        <div v-for="wd in weekdayHeaders" :key="wd" class="text-center text-[11px] font-bold text-[var(--muted)] uppercase tracking-wide py-1">
          {{ wd }}
        </div>
      </div>
      <div class="grid grid-cols-7 gap-px bg-[var(--border-soft)] rounded-xl overflow-hidden flex-1 auto-rows-fr">
        <div
          v-for="cell in monthCells"
          :key="cell.key"
          class="bg-[var(--bg)] p-1 md:p-1.5 min-h-[60px] md:min-h-[92px] flex flex-col overflow-hidden cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
          :class="{ 'opacity-40': !cell.inMonth }"
          @click.self="openCreate(cell.date)"
        >
          <div class="flex justify-end mb-1 pointer-events-none">
            <span
              class="text-[12px] font-semibold w-6 h-6 flex items-center justify-center rounded-full"
              :class="cell.isToday ? 'bg-[#ff3b30] text-white' : 'text-[var(--muted)]'"
            >
              {{ cell.date.getDate() }}
            </span>
          </div>
          <div class="flex-1 overflow-y-auto custom-scrollbar space-y-1">
            <button
              v-for="occ in cell.occurrences"
              :key="occ.key"
              @click.stop="$emit('task-click', occ.task)"
              class="w-full text-left rounded-md px-1.5 py-1 text-[11px] leading-tight truncate transition-opacity flex items-center gap-1 text-white"
              :class="[groupColor(occ.task), occ.task.completedAt ? 'opacity-40 line-through' : 'hover:opacity-80']"
              :title="occ.task.description"
            >
              <img v-if="groupIconInfo(occ.task).img" :src="groupIconInfo(occ.task).img" class="w-3 h-3 rounded-full object-cover shrink-0" />
              <component v-else :is="groupIconInfo(occ.task).comp" class="w-3 h-3 shrink-0" />
              <span class="truncate">{{ timeLabel(occ.date) }}{{ occ.task.description }}</span>
              <ArrowPathIcon v-if="occ.task.recurrence" class="w-3 h-3 shrink-0 opacity-70" />
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ══════════ YEAR ══════════ -->
    <template v-else-if="viewType === 'year'">
      <div class="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
          <div v-for="m in yearMonths" :key="m.index" class="bg-[var(--bg)] border border-[var(--border-soft)] rounded-xl p-3">
            <button
              @click="cursor = new Date(cursor.getFullYear(), m.index, 1); viewType = 'month'"
              class="text-[13px] font-semibold text-[var(--accent)] capitalize mb-2 hover:underline"
            >
              {{ m.name }}
            </button>
            <div class="grid grid-cols-7 gap-y-0.5">
              <span v-for="(wd, i) in weekdayHeaders" :key="i" class="text-center text-[9px] font-bold text-[var(--muted)]">
                {{ wd.charAt(0) }}
              </span>
              <button
                v-for="(cell, i) in m.cells"
                :key="i"
                :disabled="!cell"
                @click="cell && (cursor = new Date(cell.date), viewType = 'day')"
                class="relative h-7 flex items-center justify-center text-[11px] rounded-full transition-colors"
                :class="cell ? (cell.isToday ? 'bg-[#ff3b30] text-white font-bold' : 'text-[var(--text)] hover:bg-[var(--bg-hover)]') : ''"
              >
                <template v-if="cell">
                  {{ cell.date.getDate() }}
                  <span
                    v-if="cell.eventColor && !cell.isToday"
                    class="absolute bottom-0.5 w-1 h-1 rounded-full"
                    :class="cell.eventColor"
                  ></span>
                </template>
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ══════════ WEEK / DAY ══════════ -->
    <template v-else>
      <!-- No mobile a semana rola horizontalmente (cabeçalho e grade juntos) -->
      <div class="flex-1 bg-[var(--bg)] border border-[var(--border-soft)] rounded-xl overflow-x-auto overflow-y-hidden min-h-0 custom-scrollbar">
      <div class="h-full flex flex-col" :class="viewType === 'week' ? 'min-w-[680px]' : ''">
        <!-- Day headers + all-day row -->
        <div class="flex border-b border-[var(--border-soft)] shrink-0">
          <div class="w-14 shrink-0 border-r border-[var(--border-soft)]"></div>
          <div
            v-for="day in gridDays"
            :key="day.key"
            class="flex-1 min-w-0 py-2 px-1 text-center border-r border-[var(--border-soft)] last:border-r-0 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
            @click="cursor = new Date(day.date); viewType = 'day'"
          >
            <p class="text-[11px] font-bold uppercase tracking-wide" :class="day.isToday ? 'text-[var(--accent)]' : 'text-[var(--muted)]'">
              {{ weekdays[day.date.getDay()] }}
            </p>
            <p
              class="text-[20px] font-semibold w-9 h-9 mx-auto flex items-center justify-center rounded-full"
              :class="day.isToday ? 'bg-[var(--accent)] text-white' : 'text-[var(--text)]'"
            >
              {{ day.date.getDate() }}
            </p>
            <div class="space-y-0.5 mt-1">
              <button
                v-for="occ in day.allDay"
                :key="occ.key"
                @click.stop="$emit('task-click', occ.task)"
                class="w-full text-left rounded px-1.5 py-0.5 text-[11px] truncate text-white transition-colors"
                :class="[groupColor(occ.task), occ.task.completedAt ? 'opacity-40 line-through' : 'hover:opacity-80']"
                :title="occ.task.description"
              >
                {{ occ.task.description }}
              </button>
            </div>
          </div>
        </div>

        <!-- Time grid -->
        <div class="flex-1 overflow-y-auto custom-scrollbar" ref="scrollEl">
          <div class="flex relative" :style="{ height: 24 * HOUR_PX + 'px' }">
            <!-- Hour gutter -->
            <div class="w-14 shrink-0 border-r border-[var(--border-soft)] relative">
              <span
                v-for="h in 23"
                :key="h"
                class="absolute right-1.5 -translate-y-1/2 text-[10px] text-[var(--muted)]"
                :style="{ top: h * HOUR_PX + 'px' }"
              >
                {{ String(h).padStart(2, '0') }}:00
              </span>
            </div>

            <!-- Day columns -->
            <div
              v-for="day in gridDays"
              :key="day.key"
              class="flex-1 min-w-0 relative border-r border-[var(--border-soft)] last:border-r-0 cursor-pointer"
              @click="onSlotClick(day.date, $event)"
              @mousemove="onSlotHover(day.key, $event)"
              @mouseleave="hoverSlot = null"
            >
              <!-- hour lines -->
              <div
                v-for="h in 23"
                :key="h"
                class="absolute left-0 right-0 border-t border-[var(--border-soft)] pointer-events-none"
                :style="{ top: h * HOUR_PX + 'px' }"
              ></div>

              <!-- hover ghost (slots de 30 min, estilo Google Calendar) -->
              <div
                v-if="hoverSlot && hoverSlot.dayKey === day.key"
                class="absolute left-0.5 right-1 rounded-md bg-[var(--accent-soft)] border border-[var(--accent)] pointer-events-none z-[5] px-1.5 pt-0.5"
                :style="{ top: (hoverSlot.min / 60) * HOUR_PX + 1 + 'px', height: HOUR_PX / 2 - 2 + 'px' }"
              >
                <span class="text-[10px] font-semibold text-[var(--accent)] leading-none">{{ fmtMin(hoverSlot.min) }}</span>
              </div>

              <!-- events -->
              <button
                v-for="occ in day.timed"
                :key="occ.key"
                @click.stop="$emit('task-click', occ.task)"
                class="absolute rounded-lg px-2 py-1 text-left text-[11px] leading-tight text-white overflow-hidden border border-black/30 transition-opacity"
                :class="[groupColor(occ.task), occ.task.completedAt ? 'opacity-40 line-through' : 'hover:opacity-85']"
                :style="occ.style"
                :title="occ.task.description"
              >
                <span class="font-semibold flex items-center gap-1 min-w-0">
                  <img v-if="groupIconInfo(occ.task).img" :src="groupIconInfo(occ.task).img" class="w-3 h-3 rounded-full object-cover shrink-0" />
                  <component v-else :is="groupIconInfo(occ.task).comp" class="w-3 h-3 shrink-0" />
                  <span class="truncate">{{ occ.task.description }}</span>
                  <ArrowPathIcon v-if="occ.task.recurrence" class="w-3 h-3 shrink-0" />
                </span>
                <span class="opacity-80">{{ timeLabel(occ.date, true) }}</span>
              </button>

              <!-- current time indicator -->
              <div
                v-if="day.isToday"
                class="absolute left-0 right-0 pointer-events-none z-10"
                :style="{ top: nowOffsetPx + 'px' }"
              >
                <div class="relative border-t-2 border-[#ff3b30]">
                  <span class="absolute -left-1 -top-[5px] w-2.5 h-2.5 rounded-full bg-[#ff3b30]"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </template>
  </div>

  <TaskCreateModal
    v-if="isCreateOpen"
    :initial-date="createDate"
    @close="isCreateOpen = false"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  ArrowPathIcon,
  ListBulletIcon,
  FolderIcon,
  BriefcaseIcon,
  ShoppingCartIcon,
  StarIcon,
} from '@heroicons/vue/24/outline';
import type { TaskDto } from '@todoapp/models';
import { useTasksStore } from '@/stores/tasks';
import TaskCreateModal from './TaskCreateModal.vue';

const props = defineProps<{ tasks: TaskDto[] }>();
defineEmits<{ (e: 'task-click', task: TaskDto): void }>();

const tasksStore = useTasksStore();

const HOUR_PX = 48;
// Indexado por getDay() (0=Dom) — usado nos cabeçalhos de Semana/Dia.
const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
// Ordem visual das colunas do Mês (semana começa na segunda).
const weekdayHeaders = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

type ViewType = 'month' | 'week' | 'day' | 'year';
const viewType = ref<ViewType>('week');
const viewTypes: { id: ViewType; label: string; key: string }[] = [
  { id: 'day', label: 'Dia', key: 'd' },
  { id: 'week', label: 'Semana', key: 'w' },
  { id: 'month', label: 'Mês', key: 'm' },
  { id: 'year', label: 'Ano', key: 'y' },
];

const cursor = ref(new Date());
const now = ref(new Date());
const nowTimer = window.setInterval(() => (now.value = new Date()), 60_000);
onBeforeUnmount(() => window.clearInterval(nowTimer));

const isCreateOpen = ref(false);
const createDate = ref<Date | null>(null);

const scrollEl = ref<HTMLElement | null>(null);
async function scrollToMorning() {
  await nextTick();
  if (scrollEl.value) scrollEl.value.scrollTop = 7 * HOUR_PX;
}
onMounted(scrollToMorning);
watch(viewType, scrollToMorning);

// Atalhos estilo Google Calendar: D/W/M trocam a visão, T = hoje, ←/→ navegam.
function onKeydown(e: KeyboardEvent) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const target = e.target as HTMLElement | null;
  if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
  if (isCreateOpen.value) return;

  switch (e.key.toLowerCase()) {
    case 'd': viewType.value = 'day'; break;
    case 'w': viewType.value = 'week'; break;
    case 'm': viewType.value = 'month'; break;
    case 'y': viewType.value = 'year'; break;
    case 't': goToday(); break;
    case 'c': openCreate(null); break;
    case 'arrowleft':
    case 'p':
    case 'k': navigate(-1); break;
    case 'arrowright':
    case 'n':
    case 'j': navigate(1); break;
    default: return;
  }
  e.preventDefault();
}
onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

// ── date helpers ────────────────────────────────────────────────────────────

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
}
// Semana começa na SEGUNDA (getDay: 0=Dom … 6=Sáb → offset até a segunda anterior).
function startOfWeek(d: Date) {
  const offset = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
}

// ── recurrence expansion (estilo Google Calendar) ──────────────────────────
// `scheduledAt` é a primeira ocorrência; a regra gera as seguintes.

function nextOccurrence(d: Date, rule: string, base: Date): Date {
  if (rule === 'daily') return addDays(d, 1);
  if (rule === 'weekly') return addDays(d, 7);
  if (rule === 'monthly') {
    let y = d.getFullYear();
    let m = d.getMonth();
    for (let i = 0; i < 24; i++) {
      m++;
      if (m > 11) { m = 0; y++; }
      const c = new Date(y, m, base.getDate(), base.getHours(), base.getMinutes());
      if (c.getDate() === base.getDate()) return c; // pula meses sem esse dia (ex: 31)
    }
  }
  if (rule === 'yearly') {
    let y = d.getFullYear();
    for (let i = 0; i < 8; i++) {
      y++;
      const c = new Date(y, base.getMonth(), base.getDate(), base.getHours(), base.getMinutes());
      if (c.getDate() === base.getDate()) return c; // pula 29/02 em ano não bissexto
    }
  }
  return addDays(d, 1);
}

interface Occurrence {
  task: TaskDto;
  date: Date;
  key: string;
  style?: Record<string, string>;
}

function occurrencesInRange(rangeStart: Date, rangeEnd: Date): Occurrence[] {
  const out: Occurrence[] = [];
  for (const task of props.tasks) {
    if (!task.scheduledAt) continue;
    const base = new Date(task.scheduledAt);

    if (!task.recurrence) {
      if (base >= rangeStart && base < rangeEnd) {
        out.push({ task, date: base, key: `${task.id}` });
      }
      continue;
    }

    let d = new Date(base);
    let guard = 0;
    while (d < rangeEnd && guard++ < 5000) {
      if (d >= rangeStart) out.push({ task, date: new Date(d), key: `${task.id}-${d.getTime()}` });
      d = nextOccurrence(d, task.recurrence, base);
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ── month view ──────────────────────────────────────────────────────────────

const monthCells = computed(() => {
  const year = cursor.value.getFullYear();
  const month = cursor.value.getMonth();
  const gridStart = startOfWeek(new Date(year, month, 1));
  const gridEnd = addDays(gridStart, 42);
  const occurrences = occurrencesInRange(gridStart, gridEnd);

  const byDay = new Map<string, Occurrence[]>();
  for (const occ of occurrences) {
    const key = dayKey(occ.date);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(occ);
  }

  const todayKey = dayKey(now.value);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const date = addDays(gridStart, i);
    const key = dayKey(date);
    cells.push({
      key,
      date,
      inMonth: date.getMonth() === month,
      isToday: key === todayKey,
      occurrences: byDay.get(key) || [],
    });
  }
  return cells;
});

// ── year view ───────────────────────────────────────────────────────────────

const yearMonths = computed(() => {
  const year = cursor.value.getFullYear();
  // Um passe só pelo ano inteiro: dia → cor da lista do primeiro evento.
  const eventDays = new Map<string, string>();
  for (const occ of occurrencesInRange(new Date(year, 0, 1), new Date(year + 1, 0, 1))) {
    const key = dayKey(occ.date);
    if (!eventDays.has(key)) eventDays.set(key, groupColor(occ.task));
  }
  const todayKey = dayKey(now.value);

  return Array.from({ length: 12 }, (_, index) => {
    const first = new Date(year, index, 1);
    const daysInMonth = new Date(year, index + 1, 0).getDate();
    const leading = (first.getDay() + 6) % 7; // colunas vazias até a segunda
    const cells: Array<{ date: Date; isToday: boolean; eventColor?: string } | null> = [];
    for (let i = 0; i < leading; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, index, d);
      const key = dayKey(date);
      cells.push({ date, isToday: key === todayKey, eventColor: eventDays.get(key) });
    }
    return {
      index,
      name: first.toLocaleDateString('pt-BR', { month: 'long' }),
      cells,
    };
  });
});

// ── week / day views ────────────────────────────────────────────────────────

const gridDays = computed(() => {
  const first = viewType.value === 'day' ? startOfDay(cursor.value) : startOfWeek(cursor.value);
  const count = viewType.value === 'day' ? 1 : 7;
  const rangeEnd = addDays(first, count);
  const occurrences = occurrencesInRange(first, rangeEnd);
  const todayKey = dayKey(now.value);

  return Array.from({ length: count }, (_, i) => {
    const date = addDays(first, i);
    const key = dayKey(date);
    const dayOccs = occurrences.filter((o) => dayKey(o.date) === key);
    const allDay = dayOccs.filter((o) => o.date.getHours() === 0 && o.date.getMinutes() === 0);
    const timed = layoutTimed(dayOccs.filter((o) => o.date.getHours() !== 0 || o.date.getMinutes() !== 0));
    return { key, date, isToday: key === todayKey, allDay, timed };
  });
});

// Blocos de 1h; eventos sobrepostos dividem a largura da coluna (lanes).
function layoutTimed(occs: Occurrence[]): Occurrence[] {
  const laneEnds: number[] = [];
  const placed = occs.map((occ) => {
    const startMin = occ.date.getHours() * 60 + occ.date.getMinutes();
    let lane = laneEnds.findIndex((end) => end <= startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(startMin + 60);
    } else {
      laneEnds[lane] = startMin + 60;
    }
    return { occ, lane, startMin };
  });
  const laneCount = Math.max(1, laneEnds.length);
  return placed.map(({ occ, lane, startMin }) => ({
    ...occ,
    style: {
      top: (startMin / 60) * HOUR_PX + 1 + 'px',
      height: HOUR_PX - 4 + 'px',
      left: `calc(${(lane / laneCount) * 100}% + 2px)`,
      width: `calc(${100 / laneCount}% - 5px)`,
    },
  }));
}

const nowOffsetPx = computed(
  () => ((now.value.getHours() * 60 + now.value.getMinutes()) / 60) * HOUR_PX
);

// ── navigation / title ──────────────────────────────────────────────────────

function navigate(dir: number) {
  const c = cursor.value;
  if (viewType.value === 'year') cursor.value = new Date(c.getFullYear() + dir, c.getMonth(), 1);
  else if (viewType.value === 'month') cursor.value = new Date(c.getFullYear(), c.getMonth() + dir, 1);
  else if (viewType.value === 'week') cursor.value = addDays(c, 7 * dir);
  else cursor.value = addDays(c, dir);
}
function goToday() {
  cursor.value = new Date();
}

const title = computed(() => {
  const c = cursor.value;
  if (viewType.value === 'year') {
    return String(c.getFullYear());
  }
  if (viewType.value === 'month') {
    return c.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }
  if (viewType.value === 'week') {
    const start = startOfWeek(c);
    const end = addDays(start, 6);
    const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    return `${fmt(start)} – ${fmt(end)} ${end.getFullYear()}`;
  }
  return c.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
});

// ── create ──────────────────────────────────────────────────────────────────

function openCreate(date: Date | null) {
  if (date) {
    const d = new Date(date);
    if (d.getHours() === 0 && d.getMinutes() === 0) d.setHours(9, 0, 0, 0);
    createDate.value = d;
  } else {
    createDate.value = null;
  }
  isCreateOpen.value = true;
}

// Snap do mouse em slots de 30 min, robusto mesmo quando o alvo é um filho
// (usa a posição da coluna, não o offsetY do elemento sob o cursor).
const hoverSlot = ref<{ dayKey: string; min: number } | null>(null);

function slotMinFromEvent(event: MouseEvent): number {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const y = event.clientY - rect.top;
  const min = Math.floor(y / (HOUR_PX / 2)) * 30;
  return Math.max(0, Math.min(23 * 60 + 30, min));
}

function onSlotHover(dayKey: string, event: MouseEvent) {
  hoverSlot.value = { dayKey, min: slotMinFromEvent(event) };
}

function fmtMin(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

function onSlotClick(day: Date, event: MouseEvent) {
  const min = slotMinFromEvent(event);
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(min / 60), min % 60, 0, 0);
  createDate.value = d;
  isCreateOpen.value = true;
}

// ── misc ────────────────────────────────────────────────────────────────────

function timeLabel(d: Date, always = false) {
  if (!always && d.getHours() === 0 && d.getMinutes() === 0) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} `;
}

const fallbackColors = ['bg-[var(--accent)]', 'bg-[#30d158]', 'bg-[#ff3b30]', 'bg-[#ff9500]', 'bg-[#ff2d55]', 'bg-[#bf5af2]'];
function groupColor(task: TaskDto) {
  if (!task.groupId) return 'bg-[var(--accent)]';
  const idx = tasksStore.groups.findIndex((g) => g.id === task.groupId);
  if (idx === -1) return 'bg-[var(--accent)]';
  return tasksStore.groups[idx]?.color || fallbackColors[idx % fallbackColors.length];
}

// Mesmo mapa de ícones da sidebar de listas do todo.
const iconMap: Record<string, any> = {
  ListBulletIcon,
  FolderIcon,
  BriefcaseIcon,
  ShoppingCartIcon,
  StarIcon,
};

function groupIconInfo(task: TaskDto): { img?: string; comp?: any } {
  const g = tasksStore.groups.find((gr) => gr.id === task.groupId);
  if (!g?.icon) return { comp: ListBulletIcon };
  if (g.icon.startsWith('http') || g.icon.startsWith('data:')) return { img: g.icon };
  return { comp: iconMap[g.icon] || ListBulletIcon };
}
</script>
