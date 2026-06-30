<template>
  <div class="min-h-screen bg-[#1c1c1e] text-white flex h-screen overflow-hidden font-sans">
    <!-- Sidebar -->
    <aside class="w-[300px] bg-[#222224] flex flex-col border-r border-black/30">
      <div class="p-4 flex-1 overflow-y-auto custom-scrollbar">

        
        <!-- Quick Filters Grid -->
        <div class="grid grid-cols-2 gap-3 mb-8">
          <!-- Today -->
          <div @click="setFilter('today')" :class="['p-3 rounded-xl cursor-pointer transition-all', filter === 'today' ? 'bg-[#0a7aff] ring-2 ring-white/10' : 'bg-[#1c1c1e] hover:bg-[#2c2c2e]']">
            <div class="flex justify-between items-start">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-white" :class="filter === 'today' ? 'bg-white text-[#0a7aff]' : 'bg-[#0a7aff]'">
                <CalendarIcon class="w-5 h-5" />
              </div>
              <span class="text-2xl font-bold text-white">{{ counts.today }}</span>
            </div>
            <div class="mt-2 text-[15px] font-semibold text-white/90">Today</div>
          </div>
          <!-- Scheduled -->
          <div @click="setFilter('scheduled')" :class="['p-3 rounded-xl cursor-pointer transition-all', filter === 'scheduled' ? 'bg-[#ff3b30] ring-2 ring-white/10' : 'bg-[#1c1c1e] hover:bg-[#2c2c2e]']">
            <div class="flex justify-between items-start">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-white" :class="filter === 'scheduled' ? 'bg-white text-[#ff3b30]' : 'bg-[#ff3b30]'">
                <CalendarDaysIcon class="w-5 h-5" />
              </div>
              <span class="text-2xl font-bold text-white">{{ counts.scheduled }}</span>
            </div>
            <div class="mt-2 text-[15px] font-semibold text-white/90">Scheduled</div>
          </div>
          <!-- All -->
          <div @click="setFilter('all')" :class="['p-3 rounded-xl cursor-pointer transition-all', filter === 'all' ? 'bg-[#3a3a3c] ring-2 ring-white/10' : 'bg-[#1c1c1e] hover:bg-[#2c2c2e]']">
            <div class="flex justify-between items-start">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-white" :class="filter === 'all' ? 'bg-white text-[#3a3a3c]' : 'bg-[#3a3a3c]'">
                <InboxIcon class="w-5 h-5" />
              </div>
              <span class="text-2xl font-bold text-white">{{ counts.all }}</span>
            </div>
            <div class="mt-2 text-[15px] font-semibold text-white/90">All</div>
          </div>
          <!-- Flagged -->
          <div @click="setFilter('flagged')" :class="['p-3 rounded-xl cursor-pointer transition-all', filter === 'flagged' ? 'bg-[#ff9500] ring-2 ring-white/10' : 'bg-[#1c1c1e] hover:bg-[#2c2c2e]']">
            <div class="flex justify-between items-start">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-white" :class="filter === 'flagged' ? 'bg-white text-[#ff9500]' : 'bg-[#ff9500]'">
                <FlagIcon class="w-5 h-5" />
              </div>
              <span class="text-2xl font-bold text-white">{{ counts.flagged }}</span>
            </div>
            <div class="mt-2 text-[15px] font-semibold text-white/90">Flagged</div>
          </div>
          <!-- Completed -->
          <div @click="setFilter('completed')" :class="['p-3 rounded-xl cursor-pointer transition-all', filter === 'completed' ? 'bg-[#636366] ring-2 ring-white/10' : 'bg-[#1c1c1e] hover:bg-[#2c2c2e]']">
            <div class="flex justify-between items-start">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-white" :class="filter === 'completed' ? 'bg-white text-[#636366]' : 'bg-[#636366]'">
                <CheckIcon class="w-5 h-5" />
              </div>
              <span class="text-2xl font-bold text-white">{{ counts.completed }}</span>
            </div>
            <div class="mt-2 text-[15px] font-semibold text-white/90">Completed</div>
          </div>
          <!-- Urgent -->
          <div @click="setFilter('urgent')" :class="['p-3 rounded-xl cursor-pointer transition-all', filter === 'urgent' ? 'bg-[#ff2d55] ring-2 ring-white/10' : 'bg-[#1c1c1e] hover:bg-[#2c2c2e]']">
            <div class="flex justify-between items-start">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-white" :class="filter === 'urgent' ? 'bg-white text-[#ff2d55]' : 'bg-[#ff2d55]'">
                <ClockIcon class="w-5 h-5" />
              </div>
              <span class="text-2xl font-bold text-white">{{ counts.urgent }}</span>
            </div>
            <div class="mt-2 text-[15px] font-semibold text-white/90">Urgent</div>
          </div>
        </div>

        <!-- My Lists -->
        <div>
          <h3 class="text-[11px] font-bold text-[#8e8e93] mb-2 px-2 uppercase tracking-wide">My Lists</h3>
          <div class="space-y-[2px]">
            <div 
              v-for="(group, idx) in groups" 
              :key="group.id" 
              @click="setFilter(group.id)"
              draggable="true"
              @dragstart="onDragStart(idx, $event)"
              @dragover.prevent="onDragOver(idx, $event)"
              @dragleave="onDragLeave(idx, $event)"
              @drop="onDrop(idx, $event)"
              @dragend="onDragEnd"
              :class="[
                'flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer transition-colors',
                filter === group.id ? 'bg-[#0a7aff] text-white' : 'hover:bg-white/10 text-white',
                draggedOverIndex === idx ? 'ring-2 ring-[#0a7aff] bg-white/5' : '',
                draggedIndex === idx ? 'opacity-50' : ''
              ]"
            >
              <div class="flex items-center gap-3">
                <div class="w-[28px] h-[28px] rounded-full flex items-center justify-center text-white shadow-sm" :class="getGroupColor(idx)">
                  <ListBulletIcon class="w-4 h-4" />
                </div>
                <span class="text-[13px] font-medium">{{ group.name }}</span>
              </div>
              <span class="text-[13px] font-medium" :class="filter === group.id ? 'text-white' : 'text-[#8e8e93]'">{{ counts.byGroup[group.id] || 0 }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="p-4 border-t border-black/30 flex justify-between items-center">
        <button class="flex items-center gap-2 text-[#8e8e93] hover:text-white transition-colors text-[13px] font-medium" @click="openAddGroupModal">
          <PlusCircleIcon class="w-5 h-5" /> Add List
        </button>
        <button class="flex items-center text-[#8e8e93] hover:text-[#ff3b30] transition-colors" @click="logout" title="Logout">
          <ArrowRightOnRectangleIcon class="w-5 h-5" />
        </button>
      </div>
    </aside>

    <!-- Main Area -->
    <main class="flex-1 flex flex-col bg-[#1c1c1e] p-6 sm:p-10 relative">
      <!-- Search fake bar -->
      <div class="absolute top-4 right-4 flex items-center gap-4">
        <div class="bg-white/10 rounded-md px-3 py-1 flex items-center gap-2 border border-white/5 w-64">
          <MagnifyingGlassIcon class="w-4 h-4 text-[#8e8e93]" />
          <input 
            v-model="tasksStore.searchQuery"
            type="text" 
            placeholder="Search" 
            class="bg-transparent border-none outline-none text-[13px] text-white placeholder-[#8e8e93] w-full" 
          />
        </div>
      </div>

      <header class="mb-4 mt-8">
        <div class="flex justify-between items-end mb-1">
          <h1 :class="['text-[36px] font-bold tracking-tight', headerColor]">{{ headerTitle }}</h1>
          <span class="text-[36px] font-semibold" :class="headerColor">{{ filteredTasks.length }}</span>
        </div>
        <div class="flex justify-between items-center text-[#8e8e93] text-[13px] border-b border-[#2c2c2e] pb-3 font-medium">
          <span v-if="counts.completed > 0">{{ counts.completed }} Completed • <button class="text-[#30d158] hover:text-[#32d74b] transition-colors" @click="clearCompleted">Clear</button></span>
          <span v-else>0 Completed</span>
          <button class="text-[#30d158] hover:text-[#32d74b] transition-colors">Show</button>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 -mx-2 px-2">
        <div 
          v-for="task in filteredTasks" 
          :key="task.id"
          class="group flex items-start gap-3 py-3 border-b border-[#2c2c2e] last:border-0 relative"
        >
          <button 
            @click="tasksStore.toggleComplete(task)"
            class="w-5 h-5 mt-0.5 rounded-full border-[1.5px] border-[#555] flex items-center justify-center hover:border-[#0a7aff] transition-colors shrink-0"
            :class="{ 'bg-[#0a7aff] border-[#0a7aff]': task.completedAt }"
          >
            <CheckIcon v-if="task.completedAt" class="w-3.5 h-3.5 text-white" />
          </button>
          
          <div class="flex-1 flex flex-col">
            <input 
              v-model="task.description"
              class="bg-transparent outline-none text-[14px]"
              :class="{ 'text-[#8e8e93] line-through': task.completedAt }"
              @blur="updateTask(task)"
              @keydown.enter="($event.target as HTMLElement).blur()"
            />
            <div class="flex items-center gap-2 mt-1" v-if="task.scheduledAt || tasksStore.searchQuery.trim()">
              <span v-if="task.scheduledAt" class="text-[12px] text-[#8e8e93]">{{ new Date(task.scheduledAt).toLocaleDateString() }}</span>
              <span v-if="tasksStore.searchQuery.trim()" class="text-[10px] bg-[#2c2c2e] text-[#8e8e93] px-1.5 py-0.5 rounded font-medium">
                {{ getTaskGroupName(task.groupId) }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button @click="tasksStore.moveTask(task, 'up')" class="text-[#555] hover:text-white transition-colors" title="Move Up">
              <ChevronUpIcon class="w-4 h-4" />
            </button>
            <button @click="tasksStore.moveTask(task, 'down')" class="text-[#555] hover:text-white transition-colors" title="Move Down">
              <ChevronDownIcon class="w-4 h-4" />
            </button>
            <button @click="task.isFlagged = !task.isFlagged; updateTask(task)" :class="task.isFlagged ? 'text-[#ff9500]' : 'text-[#555] hover:text-[#ff9500]'">
              <FlagIcon class="w-4 h-4" :class="{'fill-current': task.isFlagged}" />
            </button>
            <button @click="task.isUrgent = !task.isUrgent; updateTask(task)" :class="task.isUrgent ? 'text-[#ff2d55]' : 'text-[#555] hover:text-[#ff2d55]'">
              <ClockIcon class="w-4 h-4" :class="{'fill-current': task.isUrgent}" />
            </button>
          </div>
        </div>

        <!-- Add New Task Row -->
        <div class="flex items-start gap-3 py-3" v-if="filter !== 'completed'">
          <div class="w-5 h-5 mt-0.5 rounded-full border-[1.5px] border-[#555] shrink-0"></div>
          <input 
            v-model="newTaskDescription"
            placeholder="New Reminder"
            class="bg-transparent outline-none text-[14px] flex-1 placeholder-[#555]"
            @keydown.enter="createNewTask"
          />
        </div>
      </div>
    </main>
  </div>

  <!-- Add Group Modal -->
  <div v-if="isAddGroupModalOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-[#2c2c2e] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/10 transform transition-all">
      <div class="p-6">
        <h2 class="text-xl font-semibold text-white mb-4">New List</h2>
        <input 
          v-model="newGroupName"
          type="text" 
          placeholder="List Name" 
          class="w-full bg-[#1c1c1e] border border-[#3a3a3c] rounded-xl px-4 py-3 text-white placeholder-[#8e8e93] focus:outline-none focus:border-[#0a7aff] focus:ring-1 focus:ring-[#0a7aff] transition-all"
          @keydown.enter="confirmAddGroup"
          autofocus
        />
      </div>
      <div class="flex border-t border-[#3a3a3c]">
        <button 
          @click="isAddGroupModalOpen = false"
          class="flex-1 py-3.5 text-[#8e8e93] font-medium hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <div class="w-[1px] bg-[#3a3a3c]"></div>
        <button 
          @click="confirmAddGroup"
          class="flex-1 py-3.5 text-[#0a7aff] font-semibold hover:bg-white/5 transition-colors"
          :disabled="!newGroupName.trim()"
          :class="{ 'opacity-50 cursor-not-allowed text-[#0a7aff]/50': !newGroupName.trim() }"
        >
          Save
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useTasksStore } from '@/stores/tasks';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/api/client';
import { 
  CalendarIcon, 
  CalendarDaysIcon,
  InboxIcon, 
  FlagIcon, 
  CheckIcon, 
  ClockIcon, 
  ListBulletIcon,
  PlusCircleIcon,
  MagnifyingGlassIcon,
  ArrowRightOnRectangleIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/vue/24/outline';

const tasksStore = useTasksStore();
const authStore = useAuthStore();
const newTaskDescription = ref('');

const isAddGroupModalOpen = ref(false);
const newGroupName = ref('');

const draggedIndex = ref<number | null>(null);
const draggedOverIndex = ref<number | null>(null);

function onDragStart(idx: number, event: DragEvent) {
  draggedIndex.value = idx;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
}

function onDragOver(idx: number, event: DragEvent) {
  draggedOverIndex.value = idx;
}

function onDragLeave(idx: number, event: DragEvent) {
  if (draggedOverIndex.value === idx) {
    draggedOverIndex.value = null;
  }
}

async function onDrop(idx: number, event: DragEvent) {
  const fromIdx = draggedIndex.value;
  draggedOverIndex.value = null;
  draggedIndex.value = null;

  if (fromIdx !== null && fromIdx !== idx) {
    const newGroups = [...groups.value];
    const [moved] = newGroups.splice(fromIdx, 1);
    newGroups.splice(idx, 0, moved);
    await tasksStore.reorderGroups(newGroups);
  }
}

function onDragEnd() {
  draggedIndex.value = null;
  draggedOverIndex.value = null;
}

onMounted(() => {
  tasksStore.fetchAll();
});

const counts = computed(() => tasksStore.counts);
const filteredTasks = computed(() => tasksStore.filteredTasks);
const groups = computed(() => tasksStore.groups);
const filter = computed(() => tasksStore.selectedFilter);

const groupColors = [
  'bg-[#0a7aff]', // blue
  'bg-[#30d158]', // green
  'bg-[#ff3b30]', // red
  'bg-[#ff9500]', // orange
  'bg-[#ff2d55]', // pink
  'bg-[#bf5af2]', // purple
];
function getGroupColor(idx: number) {
  return groupColors[idx % groupColors.length];
}

function getTaskGroupName(groupId?: string) {
  if (!groupId) return 'No List';
  const g = groups.value.find((g: any) => g.id === groupId);
  return g ? g.name : 'No List';
}

const headerTitle = computed(() => {
  if (tasksStore.searchQuery.trim()) return 'Search Results';
  
  switch (filter.value) {
    case 'today': return 'Today';
    case 'scheduled': return 'Scheduled';
    case 'all': return 'All';
    case 'flagged': return 'Flagged';
    case 'completed': return 'Completed';
    case 'urgent': return 'Urgent';
    default: return groups.value.find((g: any) => g.id === filter.value)?.name || 'List';
  }
});

const headerColor = computed(() => {
  if (tasksStore.searchQuery.trim()) return 'text-white';
  
  switch (filter.value) {
    case 'today': return 'text-[#0a7aff]';
    case 'scheduled': return 'text-[#ff3b30]';
    case 'all': return 'text-white';
    case 'flagged': return 'text-[#ff9500]';
    case 'completed': return 'text-[#636366]';
    case 'urgent': return 'text-[#ff2d55]';
    default: return 'text-[#30d158]';
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
  const completedTasks = tasksStore.tasks.filter((t: any) => t.completedAt);
  for (const t of completedTasks) {
    await api.delete(`/tasks/${t.id}`);
  }
  await tasksStore.fetchAll();
}

function openAddGroupModal() {
  newGroupName.value = '';
  isAddGroupModalOpen.value = true;
}

async function confirmAddGroup() {
  const name = newGroupName.value.trim();
  if (name) {
    await api.post('/groups', { name });
    await tasksStore.fetchAll();
  }
  isAddGroupModalOpen.value = false;
}

function logout() {
  authStore.logout();
}
</script>
