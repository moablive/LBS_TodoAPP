<template>
  <div class="min-h-screen bg-surface-base text-white flex h-screen overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-72 bg-surface-raised flex flex-col border-r border-surface-border">
      <div class="p-4 flex-1 overflow-y-auto">
        <!-- Quick Filters -->
        <div class="grid grid-cols-2 gap-3 mb-8">
          <div @click="setFilter('today')" :class="['p-3 rounded-2xl cursor-pointer transition-colors', filter === 'today' ? 'bg-blue-600' : 'bg-surface-overlay hover:bg-surface-border']">
            <div class="flex justify-between items-start">
              <span class="text-xl">📅</span>
              <span class="text-xl font-bold">{{ counts.today }}</span>
            </div>
            <div class="mt-2 text-sm font-medium text-white/80">Today</div>
          </div>
          <div @click="setFilter('scheduled')" :class="['p-3 rounded-2xl cursor-pointer transition-colors', filter === 'scheduled' ? 'bg-red-500/80' : 'bg-surface-overlay hover:bg-surface-border']">
            <div class="flex justify-between items-start">
              <span class="text-xl">🗓</span>
              <span class="text-xl font-bold">{{ counts.scheduled }}</span>
            </div>
            <div class="mt-2 text-sm font-medium text-white/80">Scheduled</div>
          </div>
          <div @click="setFilter('all')" :class="['p-3 rounded-2xl cursor-pointer transition-colors', filter === 'all' ? 'bg-surface-border' : 'bg-surface-overlay hover:bg-surface-border']">
            <div class="flex justify-between items-start">
              <span class="text-xl">📥</span>
              <span class="text-xl font-bold">{{ counts.all }}</span>
            </div>
            <div class="mt-2 text-sm font-medium text-white/80">All</div>
          </div>
          <div @click="setFilter('flagged')" :class="['p-3 rounded-2xl cursor-pointer transition-colors', filter === 'flagged' ? 'bg-orange-500' : 'bg-surface-overlay hover:bg-surface-border']">
            <div class="flex justify-between items-start">
              <span class="text-xl">🚩</span>
              <span class="text-xl font-bold">{{ counts.flagged }}</span>
            </div>
            <div class="mt-2 text-sm font-medium text-white/80">Flagged</div>
          </div>
          <div @click="setFilter('completed')" :class="['p-3 rounded-2xl cursor-pointer transition-colors', filter === 'completed' ? 'bg-gray-600' : 'bg-surface-overlay hover:bg-surface-border']">
            <div class="flex justify-between items-start">
              <span class="text-xl">✅</span>
              <span class="text-xl font-bold">{{ counts.completed }}</span>
            </div>
            <div class="mt-2 text-sm font-medium text-white/80">Completed</div>
          </div>
          <div @click="setFilter('urgent')" :class="['p-3 rounded-2xl cursor-pointer transition-colors', filter === 'urgent' ? 'bg-red-600' : 'bg-surface-overlay hover:bg-surface-border']">
            <div class="flex justify-between items-start">
              <span class="text-xl">🔥</span>
              <span class="text-xl font-bold">{{ counts.urgent }}</span>
            </div>
            <div class="mt-2 text-sm font-medium text-white/80">Urgent</div>
          </div>
        </div>

        <!-- My Lists -->
        <div>
          <h3 class="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-2">My Lists</h3>
          <div class="space-y-1">
            <div 
              v-for="group in groups" 
              :key="group.id" 
              @click="setFilter(group.id)"
              :class="[
                'flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors',
                filter === group.id ? 'bg-surface-overlay' : 'hover:bg-surface-overlay/50'
              ]"
            >
              <div class="flex items-center gap-3">
                <div class="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                  📋
                </div>
                <span class="text-sm font-medium">{{ group.name }}</span>
              </div>
              <span class="text-sm text-muted tabular-nums">{{ counts.byGroup[group.id] || 0 }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="p-4 border-t border-surface-border">
        <button class="flex items-center gap-2 text-accent hover:text-blue-400 font-medium w-full p-2" @click="addGroup">
          <span class="text-xl">+</span> Add List
        </button>
      </div>
    </aside>

    <!-- Main Area -->
    <main class="flex-1 flex flex-col p-8 bg-surface-base">
      <header class="mb-6">
        <div class="flex justify-between items-end mb-2">
          <h1 :class="['text-4xl font-bold', headerColor]">{{ headerTitle }}</h1>
          <span class="text-4xl font-bold text-accent tabular-nums">{{ filteredTasks.length }}</span>
        </div>
        <div class="flex justify-between items-center text-muted text-sm border-b border-surface-border pb-4">
          <span v-if="counts.completed > 0">{{ counts.completed }} Completed • <button class="hover:text-white" @click="clearCompleted">Clear</button></span>
          <span v-else>0 Completed</span>
          <button class="hover:text-white">Show</button>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto space-y-1">
        <div 
          v-for="task in filteredTasks" 
          :key="task.id"
          class="group flex items-center gap-3 p-3 rounded-xl hover:bg-surface-raised transition-colors"
        >
          <button 
            @click="tasksStore.toggleComplete(task)"
            class="w-6 h-6 rounded-full border-2 border-surface-border flex items-center justify-center group-hover:border-accent transition-colors shrink-0"
            :class="{ 'bg-accent border-accent': task.completedAt }"
          >
            <span v-if="task.completedAt" class="text-white text-sm">✓</span>
          </button>
          
          <div class="flex-1 flex flex-col">
            <input 
              v-model="task.description"
              class="bg-transparent outline-none text-[15px]"
              :class="{ 'text-muted line-through': task.completedAt }"
              @blur="updateTask(task)"
              @keydown.enter="$event.target.blur()"
            />
            <span v-if="task.scheduledAt" class="text-xs text-muted">{{ new Date(task.scheduledAt).toLocaleDateString() }}</span>
          </div>

          <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button @click="task.isFlagged = !task.isFlagged; updateTask(task)" class="text-lg" :class="task.isFlagged ? 'text-orange-500' : 'text-muted hover:text-white'">🚩</button>
            <button @click="task.isUrgent = !task.isUrgent; updateTask(task)" class="text-lg" :class="task.isUrgent ? 'text-red-500' : 'text-muted hover:text-white'">🔥</button>
          </div>
        </div>

        <!-- Add New Task Row -->
        <div class="flex items-center gap-3 p-3 mt-4" v-if="filter !== 'completed'">
          <div class="w-6 h-6 rounded-full border-2 border-surface-border shrink-0"></div>
          <input 
            v-model="newTaskDescription"
            placeholder="New Reminder"
            class="bg-transparent outline-none text-[15px] flex-1"
            @keydown.enter="createNewTask"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useTasksStore } from '@/stores/tasks';
import { api } from '@/api/client';

const tasksStore = useTasksStore();
const newTaskDescription = ref('');

onMounted(() => {
  tasksStore.fetchAll();
});

const counts = computed(() => tasksStore.counts);
const filteredTasks = computed(() => tasksStore.filteredTasks);
const groups = computed(() => tasksStore.groups);
const filter = computed(() => tasksStore.selectedFilter);

const headerTitle = computed(() => {
  switch (filter.value) {
    case 'today': return 'Today';
    case 'scheduled': return 'Scheduled';
    case 'all': return 'All';
    case 'flagged': return 'Flagged';
    case 'completed': return 'Completed';
    case 'urgent': return 'Urgent';
    default: return groups.value.find(g => g.id === filter.value)?.name || 'List';
  }
});

const headerColor = computed(() => {
  switch (filter.value) {
    case 'today': return 'text-blue-500';
    case 'scheduled': return 'text-red-400';
    case 'all': return 'text-white';
    case 'flagged': return 'text-orange-500';
    case 'completed': return 'text-gray-400';
    case 'urgent': return 'text-red-600';
    default: return 'text-accent';
  }
});

function setFilter(f: string) {
  tasksStore.setFilter(f);
}

async function createNewTask() {
  if (!newTaskDescription.value.trim()) return;
  const groupId = ['today', 'scheduled', 'all', 'flagged', 'completed', 'urgent'].includes(filter.value) ? undefined : filter.value;
  await tasksStore.addTask(newTaskDescription.value, groupId);
  newTaskDescription.value = '';
}

async function updateTask(task: any) {
  await api.patch(`/tasks/${task.id}`, {
    description: task.description,
    isFlagged: task.isFlagged,
    isUrgent: task.isUrgent
  });
}

async function clearCompleted() {
  const completedTasks = tasksStore.tasks.filter(t => t.completedAt);
  for (const t of completedTasks) {
    await api.delete(`/tasks/${t.id}`);
  }
  await tasksStore.fetchAll();
}

async function addGroup() {
  const name = prompt('List Name:');
  if (name) {
    await api.post('/groups', { name });
    await tasksStore.fetchAll();
  }
}
</script>
