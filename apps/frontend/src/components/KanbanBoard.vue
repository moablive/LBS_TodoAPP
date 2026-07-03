<template>
  <div class="flex flex-col h-full">
    <!-- Cabeçalho + seletor de listas -->
    <div class="flex items-center gap-3 mb-4 shrink-0 relative">
      <h2 class="text-[20px] font-bold text-[var(--text)]">Kanban</h2>
      <button
        @click="isPickerOpen = !isPickerOpen"
        class="flex items-center gap-2 text-[13px] font-medium border border-[var(--border)] hover:border-[var(--accent)] text-[var(--muted)] hover:text-[var(--text)] px-3 py-1.5 rounded-lg transition-colors"
      >
        <AdjustmentsHorizontalIcon class="w-4 h-4" />
        Escolher listas ({{ visibleColumns.length }})
      </button>

      <!-- Popover de seleção -->
      <div
        v-if="isPickerOpen"
        class="absolute top-11 left-0 z-40 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl p-2 w-64 max-h-[60vh] overflow-y-auto custom-scrollbar"
      >
        <p class="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider px-2 py-1.5">
          Listas no quadro
        </p>
        <label
          v-for="opt in allOptions"
          :key="opt.id"
          class="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
        >
          <input
            type="checkbox"
            :checked="visibleIds.has(opt.id)"
            @change="toggleColumn(opt.id)"
            class="w-4 h-4 rounded accent-[var(--accent)] shrink-0"
          />
          <span
            class="w-[22px] h-[22px] rounded-full flex items-center justify-center text-white overflow-hidden shrink-0"
            :class="opt.color"
          >
            <template v-if="opt.icon && (opt.icon.startsWith('http') || opt.icon.startsWith('data:'))">
              <img :src="opt.icon" class="w-full h-full object-cover" />
            </template>
            <template v-else>
              <component :is="iconMap[opt.icon || 'ListBulletIcon'] || iconMap.ListBulletIcon" class="w-3.5 h-3.5" />
            </template>
          </span>
          <span class="text-[13px] text-[var(--text)] truncate">{{ opt.name }}</span>
        </label>
      </div>
      <!-- Fecha o popover ao clicar fora -->
      <div v-if="isPickerOpen" class="fixed inset-0 z-30" @click="isPickerOpen = false"></div>
    </div>

    <!-- Colunas (uma por lista escolhida) -->
    <div class="flex gap-4 flex-1 min-h-0 overflow-x-auto custom-scrollbar pb-2 items-stretch">
      <div v-if="prefsLoaded && visibleColumns.length === 0" class="text-[var(--muted)] text-[14px] m-auto">
        Nenhuma lista selecionada — use "Escolher listas" acima para montar o seu quadro.
      </div>
      <div
        v-for="col in visibleColumns"
        :key="col.id"
        class="w-[280px] shrink-0 bg-[var(--bg-side)] rounded-2xl border border-black/30 flex flex-col max-h-full"
        :class="{ 'ring-2 ring-[var(--accent)]': dragOverColumn === col.id }"
        @dragover.prevent="dragOverColumn = col.id"
        @dragleave="dragOverColumn === col.id && (dragOverColumn = null)"
        @drop.prevent="onDrop(col.id)"
      >
        <!-- Column header -->
        <div class="flex items-center gap-2 px-4 pt-4 pb-2">
          <div
            class="w-[22px] h-[22px] rounded-full flex items-center justify-center text-white overflow-hidden shrink-0"
            :class="col.color"
          >
            <template v-if="col.icon && (col.icon.startsWith('http') || col.icon.startsWith('data:'))">
              <img :src="col.icon" class="w-full h-full object-cover" />
            </template>
            <template v-else>
              <component :is="iconMap[col.icon || 'ListBulletIcon'] || iconMap.ListBulletIcon" class="w-3.5 h-3.5" />
            </template>
          </div>
          <h3 class="text-[14px] font-semibold text-[var(--text)] truncate flex-1">{{ col.name }}</h3>
          <span class="text-[13px] font-medium text-[var(--muted)]">{{ col.tasks.length }}</span>
        </div>

        <!-- Cards -->
        <div class="flex-1 overflow-y-auto custom-scrollbar px-3 pb-2 space-y-2 min-h-[40px]">
          <div
            v-for="task in col.tasks"
            :key="task.id"
            draggable="true"
            @dragstart="onDragStart(task, $event)"
            @dragend="draggingTaskId = null; dragOverColumn = null"
            class="group bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] rounded-xl p-3 cursor-grab active:cursor-grabbing border border-white/5 transition-colors"
            :class="{ 'opacity-40': draggingTaskId === task.id }"
          >
            <div class="flex items-start gap-2.5">
              <button
                @click.stop="tasksStore.toggleComplete(task)"
                class="w-[18px] h-[18px] mt-0.5 rounded-full border-[1.5px] border-[var(--muted)] flex items-center justify-center hover:border-[var(--accent)] transition-colors shrink-0"
                :class="{ 'bg-[var(--accent)] border-[var(--accent)]': task.completedAt }"
              >
                <CheckIcon v-if="task.completedAt" class="w-3 h-3 text-white" />
              </button>
              <div class="flex-1 min-w-0">
                <p class="text-[13px] text-[var(--text)] leading-snug break-words [overflow-wrap:anywhere]">
                  {{ task.description }}
                </p>
                <div class="flex items-center gap-2 mt-1.5">
                  <span class="w-2 h-2 rounded-full shrink-0" :class="priorityDot(task.priority)"></span>
                  <span v-if="task.scheduledAt" class="text-[11px] text-[var(--muted)] flex items-center gap-1">
                    <ClockIcon class="w-3.5 h-3.5" />
                    {{ formatDate(task.scheduledAt) }}
                  </span>
                  <ArrowPathIcon v-if="task.recurrence" class="w-3.5 h-3.5 text-[var(--muted)]" />
                  <button
                    @click.stop="$emit('task-date', task)"
                    class="max-md:opacity-100 opacity-0 group-hover:opacity-100 text-[10px] uppercase font-bold text-[var(--muted2)] hover:text-[var(--accent)] transition-all ml-auto"
                  >
                    {{ task.scheduledAt ? 'Editar' : 'Data' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick add -->
        <div class="px-3 pb-3">
          <input
            v-model="newTaskByColumn[col.id]"
            placeholder="+ Nova tarefa"
            class="w-full bg-transparent border border-transparent hover:border-[var(--border)] focus:border-[var(--accent)] rounded-lg px-2.5 py-1.5 outline-none text-[13px] text-[var(--text)] placeholder-[var(--muted2)] transition-colors"
            @keydown.enter="quickAdd(col.id)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useTasksStore } from '@/stores/tasks';
import { api } from '@/api/client';
import type { TaskDto } from '@todoapp/models';
import {
  CheckIcon,
  ClockIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
  ListBulletIcon,
  FolderIcon,
  BriefcaseIcon,
  ShoppingCartIcon,
  StarIcon,
  InboxIcon,
} from '@heroicons/vue/24/outline';

defineEmits<{ (e: 'task-date', task: TaskDto): void }>();

const tasksStore = useTasksStore();

const iconMap: Record<string, any> = {
  ListBulletIcon,
  FolderIcon,
  BriefcaseIcon,
  ShoppingCartIcon,
  StarIcon,
  InboxIcon,
};

const NONE_ID = 'none';

// Seleção explícita: começa VAZIA e o que o usuário marcar vira o padrão
// dele, salvo no servidor por telegramId (mesma identidade do MoneyAPP).
const visibleIds = ref<Set<string>>(new Set());
const prefsLoaded = ref(false);

onMounted(async () => {
  try {
    const prefs = await api.get<{ kanbanLists: string[] }>('/prefs');
    visibleIds.value = new Set(prefs.kanbanLists);
  } catch (err) {
    console.error('Erro ao carregar preferências do kanban:', err);
  } finally {
    prefsLoaded.value = true;
  }
});

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function persistSelection() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    api.patch('/prefs', { kanbanLists: [...visibleIds.value] }).catch((err) => {
      console.error('Erro ao salvar preferências do kanban:', err);
    });
  }, 400);
}

const isPickerOpen = ref(false);
const draggingTaskId = ref<string | null>(null);
const dragOverColumn = ref<string | null>(null);
const newTaskByColumn = reactive<Record<string, string>>({});

const groupColors = [
  'bg-[#0a7aff]', 'bg-[#30d158]', 'bg-[#ff3b30]',
  'bg-[#ff9500]', 'bg-[#ff2d55]', 'bg-[#bf5af2]',
];

function toggleColumn(id: string) {
  const next = new Set(visibleIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  visibleIds.value = next;
  persistSelection();
}

const allOptions = computed(() => [
  { id: NONE_ID, name: 'Sem Lista', color: 'bg-[var(--muted2)]', icon: 'InboxIcon' },
  ...tasksStore.groups.map((g, idx) => ({
    id: g.id,
    name: g.name,
    color: g.color || groupColors[idx % groupColors.length]!,
    icon: g.icon ?? undefined,
  })),
]);

const visibleColumns = computed(() => {
  const pending = tasksStore.tasks
    .filter((t) => !t.completedAt)
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return allOptions.value
    .filter((opt) => visibleIds.value.has(opt.id))
    .map((opt) => ({
      ...opt,
      tasks:
        opt.id === NONE_ID
          ? pending.filter((t) => !t.groupId || !tasksStore.groups.some((g) => g.id === t.groupId))
          : pending.filter((t) => t.groupId === opt.id),
    }));
});

function onDragStart(task: TaskDto, event: DragEvent) {
  draggingTaskId.value = task.id;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', task.id);
  }
}

async function onDrop(columnId: string) {
  dragOverColumn.value = null;
  const taskId = draggingTaskId.value;
  draggingTaskId.value = null;
  if (!taskId) return;

  const groupId = columnId === NONE_ID ? null : columnId;
  const task = tasksStore.tasks.find((t) => t.id === taskId);
  if (!task || (task.groupId ?? null) === groupId) return;

  await tasksStore.updateTaskFields(taskId, { groupId });
}

async function quickAdd(columnId: string) {
  const description = (newTaskByColumn[columnId] || '').trim();
  if (!description) return;
  await tasksStore.addTaskFull({
    description,
    groupId: columnId === NONE_ID ? null : columnId,
  });
  newTaskByColumn[columnId] = '';
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
    (hasTime ? ` ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '');
}

function priorityDot(priority: string) {
  if (priority === 'high') return 'bg-[#ff3b30]';
  if (priority === 'medium') return 'bg-[#ffcc00]';
  return 'bg-[#34c759]';
}
</script>
