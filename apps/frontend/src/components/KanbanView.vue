<template>
  <div class="flex flex-col h-full min-h-0">
    <!-- Barra do quadro -->
    <div class="flex items-center gap-3 mb-4 shrink-0">
      <h2 class="text-[20px] font-bold text-[var(--text)]">Kanban</h2>

      <span class="text-[12px] text-[var(--muted2)] hidden md:inline">
        arraste da sidebar para uma coluna
      </span>

      <label class="hidden sm:flex items-center gap-2 text-[13px] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer transition-colors ml-2">
        <input type="checkbox" v-model="showCompleted" class="w-4 h-4 rounded accent-[var(--accent)]" />
        Mostrar concluídas
      </label>

      <span class="ml-auto text-[13px] text-[var(--muted)]">
        {{ boardCount }} no quadro · {{ foraCount }} fora
      </span>
    </div>

    <!-- As três colunas fixas -->
    <div class="flex-1 min-h-0 flex gap-4">
      <section
        v-for="col in columns"
        :key="col.id"
        class="flex-1 min-w-0 bg-[var(--bg-side)] border rounded-2xl flex flex-col overflow-hidden transition-colors"
        :style="dragOverColumn === col.id ? { borderColor: col.color, boxShadow: `inset 0 0 0 1px ${col.color}` } : {}"
        :class="dragOverColumn === col.id ? '' : 'border-black/30'"
        @dragover.prevent="dragOverColumn = col.id"
        @dragleave="onColumnDragLeave(col.id)"
        @drop.prevent="onDropOnColumn(col.id, $event)"
      >
        <div class="h-[3px] shrink-0" :style="{ backgroundColor: col.color }"></div>

        <div class="flex items-center gap-2.5 px-4 pt-3 pb-2 relative">
          <span class="w-[11px] h-[11px] rounded-full shrink-0" :style="{ backgroundColor: col.color }"></span>
          <h3 class="text-[14px] font-semibold text-[var(--text)]">{{ col.label }}</h3>
          <span class="ml-auto text-[12px] text-[var(--muted)]">{{ col.tasks.length }}</span>
          <button
            @click.stop="openMenu = openMenu === col.id ? null : col.id"
            class="p-1 rounded-md text-[var(--muted2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
            title="Opções da coluna"
          >
            <EllipsisVerticalIcon class="w-4 h-4" />
          </button>

          <div
            v-if="openMenu === col.id"
            class="absolute top-11 right-2 z-40 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl py-1.5 w-52"
          >
            <p class="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider px-3 py-1.5">Ordenar por</p>
            <button
              v-for="opt in sortOptions"
              :key="opt.id"
              @click="setSort(col.id, opt.id)"
              class="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <CheckIcon class="w-3.5 h-3.5 shrink-0" :class="sortFor(col.id) === opt.id ? 'text-[var(--accent)]' : 'opacity-0'" />
              {{ opt.label }}
            </button>
            <div class="h-[1px] bg-[var(--border)] my-1.5"></div>
            <button
              @click="emptyColumn(col)"
              :disabled="col.tasks.length === 0"
              class="w-full text-left px-3 py-2 text-[13px] text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Esvaziar a coluna ({{ col.tasks.length }})
            </button>
            <button
              @click="clearCompleted(col)"
              :disabled="col.completed.length === 0"
              class="w-full text-left px-3 py-2 text-[13px] text-[#ff3b30] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Apagar concluídas ({{ col.completed.length }})
            </button>
          </div>
        </div>
        <div v-if="openMenu === col.id" class="fixed inset-0 z-30" @click="openMenu = null"></div>

        <div class="px-3 pb-2">
          <div class="flex items-center gap-2 rounded-lg border border-transparent hover:border-[var(--border)] focus-within:border-[var(--accent)] px-2.5 py-1.5 transition-colors">
            <PlusIcon class="w-4 h-4 text-[var(--muted2)] shrink-0" />
            <input
              v-model="newTaskByColumn[col.id]"
              placeholder="Adicionar uma tarefa"
              class="w-full bg-transparent outline-none text-[13px] text-[var(--text)] placeholder-[var(--muted2)]"
              @keydown.enter="quickAdd(col.id)"
            />
          </div>
        </div>

        <div class="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3 space-y-2">
          <div
            v-for="task in col.tasks"
            :key="task.id"
            draggable="true"
            @dragstart="onDragStart(task, $event)"
            @dragend="onDragEnd"
            @dragover.prevent.stop="onCardDragOver(task.id)"
            @drop.prevent.stop="onDropOnCard(task, col.id, $event)"
            @click="emit('task-click', task)"
            class="group bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] rounded-xl p-3 pl-4 cursor-pointer border border-white/5 transition-all relative"
            :class="[
              draggingTaskId === task.id ? 'opacity-40' : '',
              dragOverTaskId === task.id ? 'ring-1 ring-[var(--accent)]' : '',
            ]"
          >
            <span class="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" :style="{ backgroundColor: col.color }"></span>

            <div class="flex items-start gap-2.5">
              <button
                @click.stop="tasksStore.toggleComplete(task)"
                class="w-[18px] h-[18px] mt-0.5 rounded-full border-[1.5px] border-[var(--muted)] flex items-center justify-center hover:border-[var(--accent)] transition-colors shrink-0"
                title="Concluir"
              ></button>

              <div class="flex-1 min-w-0">
                <p class="text-[13px] text-[var(--text)] leading-snug break-words [overflow-wrap:anywhere]">
                  {{ task.description }}
                </p>

                <p v-if="task.details" class="text-[11px] text-[var(--muted)] mt-1 line-clamp-2 break-words [overflow-wrap:anywhere]">
                  {{ task.details }}
                </p>

                <div class="flex items-center gap-2 mt-2 flex-wrap">
                  <!-- de qual lista veio: é o que faz o quadro central funcionar -->
                  <span
                    class="inline-flex items-center gap-1.5 text-[10px] font-semibold rounded-full bg-white/[0.06] text-[var(--muted)] pl-1 pr-2 py-0.5"
                    :title="`Lista: ${listNameOf(task)}`"
                  >
                    <span class="w-[11px] h-[11px] rounded-full overflow-hidden flex items-center justify-center shrink-0" :class="listColorOf(task)">
                      <img v-if="isImageIcon(listIconOf(task))" :src="listIconOf(task)" class="w-full h-full object-cover" />
                    </span>
                    {{ listNameOf(task) }}
                  </span>

                  <button
                    v-if="task.scheduledAt"
                    @click.stop="emit('task-date', task)"
                    class="text-[10px] flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors"
                    :class="isOverdue(task) ? 'text-[#ff453a] bg-[#ff453a]/10' : 'text-[var(--accent)] bg-[var(--accent)]/10'"
                  >
                    <ClockIcon class="w-3 h-3" />
                    {{ formatDate(task.scheduledAt) }}
                  </button>

                  <ArrowPathIcon v-if="task.recurrence" class="w-3.5 h-3.5 text-[var(--muted)]" title="Tarefa recorrente" />
                  <BellAlertIcon v-if="task.isUrgent" class="w-3.5 h-3.5 text-[#ff453a]" title="Urgente" />

                  <span class="ml-auto flex items-center gap-1.5">
                    <button
                      @click.stop="toggleFlag(task)"
                      :class="task.isFlagged ? 'text-[#ff9f0a]' : 'max-md:opacity-100 opacity-0 group-hover:opacity-100 text-[var(--muted2)] hover:text-[#ff9f0a]'"
                      class="transition-opacity"
                      :title="task.isFlagged ? 'Remover destaque' : 'Destacar'"
                    >
                      <StarSolidIcon v-if="task.isFlagged" class="w-4 h-4" />
                      <StarIcon v-else class="w-4 h-4" />
                    </button>
                    <button
                      @click.stop="setColumn(task, null)"
                      class="max-md:opacity-100 opacity-0 group-hover:opacity-100 text-[var(--muted2)] hover:text-[var(--text)] transition-opacity"
                      title="Tirar do quadro (continua na lista dela)"
                    >
                      <XMarkIcon class="w-4 h-4" />
                    </button>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p v-if="col.tasks.length === 0" class="text-[12px] text-[var(--muted2)] text-center py-8 select-none leading-relaxed">
            Abra uma lista na sidebar<br />e arraste uma tarefa para cá
          </p>

          <template v-if="col.completed.length > 0">
            <button
              @click="toggleCompletedOpen(col.id)"
              class="w-full flex items-center gap-1.5 text-[12px] font-medium text-[var(--muted)] hover:text-[var(--text)] px-1 pt-2 transition-colors"
            >
              <ChevronRightIcon class="w-3.5 h-3.5 transition-transform" :class="{ 'rotate-90': isCompletedOpen(col.id) }" />
              Concluídas ({{ col.completed.length }})
            </button>
            <div v-if="isCompletedOpen(col.id)" class="space-y-2 pt-1">
              <div
                v-for="task in col.completed"
                :key="task.id"
                @click="emit('task-click', task)"
                class="bg-[var(--bg-card)]/60 hover:bg-[var(--bg-hover)] rounded-xl p-3 cursor-pointer border border-white/5 transition-colors"
              >
                <div class="flex items-start gap-2.5">
                  <button
                    @click.stop="tasksStore.toggleComplete(task)"
                    class="w-[18px] h-[18px] mt-0.5 rounded-full border-[1.5px] border-[var(--accent)] bg-[var(--accent)] flex items-center justify-center shrink-0"
                    title="Reabrir"
                  >
                    <CheckIcon class="w-3 h-3 text-white" />
                  </button>
                  <p class="text-[13px] text-[var(--muted)] line-through leading-snug break-words [overflow-wrap:anywhere] flex-1">
                    {{ task.description }}
                  </p>
                </div>
              </div>
            </div>
          </template>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useTasksStore } from '@/stores/tasks';
import type { TaskDto } from '@todoapp/models';
import {
  ArrowPathIcon,
  BellAlertIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  EllipsisVerticalIcon,
  PlusIcon,
  StarIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/vue/24/solid';

const emit = defineEmits<{
  (e: 'task-click', task: TaskDto): void;
  (e: 'task-date', task: TaskDto): void;
}>();

const tasksStore = useTasksStore();

type ColumnId = 'high' | 'medium' | 'low';

/**
 * As três colunas são FIXAS e não têm relação com as listas do usuário: elas são
 * o nível da demanda no quadro central. Semáforo — o mesmo vermelho que a visão
 * Lista já usa na barra de `priority` alta.
 *
 * A origem das tarefas é a sidebar do dashboard, que expande cada lista. Não há
 * gaveta aqui dentro: ela repetia a mesma sidebar ao lado dela mesma.
 */
const columnDefs: { id: ColumnId; label: string; color: string }[] = [
  { id: 'high', label: 'Alto', color: '#ff453a' },
  { id: 'medium', label: 'Médio', color: '#ffd60a' },
  { id: 'low', label: 'Baixo', color: '#30d158' },
];

const groupColors = [
  'bg-[#0a7aff]', 'bg-[#30d158]', 'bg-[#ff3b30]',
  'bg-[#ff9500]', 'bg-[#ff2d55]', 'bg-[#bf5af2]',
];

const openMenu = ref<string | null>(null);

// ── Ordenação e concluídas: preferência local ──────────────────────────
type SortMode = 'manual' | 'date' | 'starred';
const sortOptions: { id: SortMode; label: string }[] = [
  { id: 'manual', label: 'Minha ordem' },
  { id: 'date', label: 'Data' },
  { id: 'starred', label: 'Destaque' },
];

const SORT_KEY = 'todoapp:kanban:sort';
const COMPLETED_KEY = 'todoapp:kanban:showCompleted';

const sortByColumn = ref<Record<string, SortMode>>(readJson(SORT_KEY, {}));
const showCompleted = ref<boolean>(localStorage.getItem(COMPLETED_KEY) === '1');
const completedOpen = ref<Set<string>>(new Set());

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

watch(showCompleted, (v) => localStorage.setItem(COMPLETED_KEY, v ? '1' : '0'));

function sortFor(columnId: string): SortMode {
  return sortByColumn.value[columnId] ?? 'manual';
}

function setSort(columnId: string, mode: SortMode) {
  sortByColumn.value = { ...sortByColumn.value, [columnId]: mode };
  localStorage.setItem(SORT_KEY, JSON.stringify(sortByColumn.value));
  openMenu.value = null;
}

function isCompletedOpen(columnId: string) {
  return completedOpen.value.has(columnId);
}

function toggleCompletedOpen(columnId: string) {
  const next = new Set(completedOpen.value);
  if (next.has(columnId)) next.delete(columnId);
  else next.add(columnId);
  completedOpen.value = next;
}

// ── Dados ──────────────────────────────────────────────────────────────
/** A busca do topo do dashboard vale no quadro. */
const matchingTasks = computed(() => {
  const query = tasksStore.searchQuery.trim().toLowerCase();
  if (!query) return tasksStore.tasks;
  return tasksStore.tasks.filter((t) => t.description.toLowerCase().includes(query));
});

function byManualOrder(a: TaskDto, b: TaskDto) {
  if (a.order !== b.order) return a.order - b.order;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function applySort(tasks: TaskDto[], mode: SortMode) {
  const sorted = [...tasks].sort(byManualOrder);
  if (mode === 'date') {
    return sorted.sort((a, b) => {
      if (!a.scheduledAt && !b.scheduledAt) return byManualOrder(a, b);
      if (!a.scheduledAt) return 1;
      if (!b.scheduledAt) return -1;
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });
  }
  if (mode === 'starred') {
    return sorted.sort((a, b) => Number(b.isFlagged) - Number(a.isFlagged) || byManualOrder(a, b));
  }
  return sorted;
}

const columns = computed(() =>
  columnDefs.map((def) => ({
    ...def,
    tasks: applySort(
      matchingTasks.value.filter((t) => t.kanbanColumn === def.id && !t.completedAt),
      sortFor(def.id)
    ),
    completed: showCompleted.value
      ? matchingTasks.value
          .filter((t) => t.kanbanColumn === def.id && !!t.completedAt)
          .sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime())
      : [],
  }))
);

const boardCount = computed(() => columns.value.reduce((acc, c) => acc + c.tasks.length, 0));
const foraCount = computed(
  () => tasksStore.tasks.filter((t) => !t.kanbanColumn && !t.completedAt).length
);

// ── Arrastar e soltar ──────────────────────────────────────────────────
// O arraste pode nascer AQUI (cartão trocando de coluna) ou na SIDEBAR
// (DashboardView). No segundo caso o `draggingTaskId` local é null e o id vem
// pelo dataTransfer — por isso todo handler de drop recebe o evento.
const draggingTaskId = ref<string | null>(null);
const dragOverColumn = ref<string | null>(null);
const dragOverTaskId = ref<string | null>(null);

function onDragStart(task: TaskDto, event: DragEvent) {
  draggingTaskId.value = task.id;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('type', 'kanban-task');
    event.dataTransfer.setData('text/plain', task.id);
  }
}

function onDragEnd() {
  draggingTaskId.value = null;
  dragOverColumn.value = null;
  dragOverTaskId.value = null;
}

function onColumnDragLeave(columnId: string) {
  if (dragOverColumn.value === columnId) dragOverColumn.value = null;
}

function onCardDragOver(taskId: string) {
  dragOverTaskId.value = taskId;
}

function takeDragged(event?: DragEvent): TaskDto | null {
  const id = draggingTaskId.value || event?.dataTransfer?.getData('text/plain') || null;
  onDragEnd();
  if (!id) return null;
  return tasksStore.tasks.find((t) => t.id === id) ?? null;
}

/** Soltou no corpo da coluna: entra no nível (ou muda de nível). */
async function onDropOnColumn(columnId: ColumnId, event: DragEvent) {
  const task = takeDragged(event);
  if (!task) return;
  await setColumn(task, columnId);
}

/** Soltou sobre um cartão: mesmo efeito, e ainda assume aquela posição. */
async function onDropOnCard(target: TaskDto, columnId: ColumnId, event: DragEvent) {
  const task = takeDragged(event);
  if (!task || task.id === target.id) return;

  await setColumn(task, columnId);
  if (sortFor(columnId) !== 'manual') return;

  const full = [...tasksStore.tasks].sort(byManualOrder);
  const fromIdx = full.findIndex((t) => t.id === task.id);
  const toIdx = full.findIndex((t) => t.id === target.id);
  if (fromIdx === -1 || toIdx === -1) return;
  await tasksStore.reorderTasks(fromIdx, toIdx, full);
}

async function setColumn(task: TaskDto, columnId: ColumnId | null) {
  if ((task.kanbanColumn ?? null) === columnId) return;
  await tasksStore.updateTaskFields(task.id, { kanbanColumn: columnId });
}

// ── Ações ──────────────────────────────────────────────────────────────
const newTaskByColumn = reactive<Record<string, string>>({});

async function quickAdd(columnId: ColumnId) {
  const description = (newTaskByColumn[columnId] || '').trim();
  if (!description) return;
  newTaskByColumn[columnId] = '';
  await tasksStore.addTaskFull({ description, kanbanColumn: columnId });
}

async function toggleFlag(task: TaskDto) {
  await tasksStore.updateTaskFields(task.id, { isFlagged: !task.isFlagged });
}

/** Devolve a coluna inteira para as listas. Não apaga nada. */
async function emptyColumn(col: { tasks: TaskDto[] }) {
  openMenu.value = null;
  for (const task of col.tasks) {
    await tasksStore.updateTaskFields(task.id, { kanbanColumn: null });
  }
}

async function clearCompleted(col: { completed: TaskDto[] }) {
  openMenu.value = null;
  for (const task of col.completed) {
    await tasksStore.deleteTask(task.id);
  }
}

// ── Apresentação ───────────────────────────────────────────────────────
function groupOf(task: TaskDto) {
  return tasksStore.groups.find((g) => g.id === task.groupId);
}

function listNameOf(task: TaskDto) {
  return groupOf(task)?.name ?? 'Sem lista';
}

function listColorOf(task: TaskDto) {
  const group = groupOf(task);
  if (!group) return 'bg-[var(--muted2)]';
  const idx = tasksStore.groups.findIndex((g) => g.id === group.id);
  return group.color || groupColors[idx % groupColors.length]!;
}

function listIconOf(task: TaskDto) {
  return groupOf(task)?.icon ?? undefined;
}

function isImageIcon(icon?: string | null) {
  return !!icon && (icon.startsWith('http') || icon.startsWith('data:'));
}

function isOverdue(task: TaskDto) {
  return !!task.scheduledAt && !task.completedAt && new Date(task.scheduledAt) < new Date();
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  const time = hasTime ? `, ${pad(d.getHours())}:${pad(d.getMinutes())}` : '';

  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date();
  const ref = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((day.getTime() - ref.getTime()) / 86400000);

  if (diff === 0) return `Hoje${time}`;
  if (diff === 1) return `Amanhã${time}`;
  if (diff === -1) return `Ontem${time}`;

  const label = d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  });
  return `${label}${time}`;
}
</script>
