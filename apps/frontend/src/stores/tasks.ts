import { defineStore } from 'pinia';
import { api } from '@/api/client';
import type { TaskDto, TaskGroupDto } from '@todoapp/models';

export const useTasksStore = defineStore('tasks', {
  state: () => ({
    tasks: [] as TaskDto[],
    groups: [] as TaskGroupDto[],
    isLoading: false,
    selectedFilter: 'today', // today, scheduled, all, flagged, completed, urgent, or group_id
    searchQuery: '',
  }),
  actions: {
    async fetchAll() {
      this.isLoading = true;
      try {
        const [tasks, groups] = await Promise.all([
          api.get<TaskDto[]>('/tasks'),
          api.get<TaskGroupDto[]>('/groups'),
        ]);
        this.tasks = tasks;
        this.groups = groups;
      } finally {
        this.isLoading = false;
      }
    },
    async addTask(description: string, groupId?: string, isFlagged?: boolean, isUrgent?: boolean, scheduledAt?: string) {
      const task = await api.post<TaskDto>('/tasks', { description, groupId, isFlagged, isUrgent, scheduledAt });
      this.tasks.unshift(task);
    },
    async toggleComplete(task: TaskDto) {
      const completedAt = task.completedAt ? null : new Date().toISOString();
      const updated = await api.patch<TaskDto>(`/tasks/${task.id}`, { completedAt });
      const idx = this.tasks.findIndex(t => t.id === task.id);
      if (idx !== -1) this.tasks[idx] = updated;
    },
    setFilter(filterId: string) {
      this.selectedFilter = filterId;
    },
    setSearchQuery(query: string) {
      this.searchQuery = query;
    },
    async reorderGroups(newGroups: TaskGroupDto[]) {
      const originalGroups = [...this.groups];
      this.groups = newGroups; // optimistic update
      try {
        await api.post('/groups/reorder', { groupIds: newGroups.map(g => g.id) });
      } catch (err) {
        this.groups = originalGroups; // rollback
        console.error(err);
      }
    },
    async moveTask(task: TaskDto, direction: 'up' | 'down') {
      const currentList = this.filteredTasks;
      const idx = currentList.findIndex(t => t.id === task.id);
      if (idx === -1) return;
      if (direction === 'up' && idx === 0) return;
      if (direction === 'down' && idx === currentList.length - 1) return;

      // Assign sequential orders to the current list if they are all 0 or mixed
      currentList.forEach((t, i) => {
        t.order = i;
      });

      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      
      // Swap order values
      const temp = currentList[idx].order;
      currentList[idx].order = currentList[swapIdx].order;
      currentList[swapIdx].order = temp;

      // Trigger reactivity and sort
      this.tasks = [...this.tasks].sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      // Get the new sorted IDs for the current view
      const newTaskIds = currentList
        .slice()
        .sort((a, b) => a.order - b.order)
        .map(t => t.id);

      try {
        await api.post('/tasks/reorder', { taskIds: newTaskIds });
      } catch (err) {
        console.error(err);
        await this.fetchAll(); // rollback
      }
    }
  },
  getters: {
    filteredTasks(state) {
      if (state.searchQuery.trim()) {
        const query = state.searchQuery.toLowerCase();
        return state.tasks.filter(t => t.description.toLowerCase().includes(query));
      }

      return state.tasks.filter(t => {
        if (state.selectedFilter === 'all') return !t.completedAt;
        if (state.selectedFilter === 'completed') return !!t.completedAt;
        
        if (t.completedAt) return false;

        if (state.selectedFilter === 'flagged') return t.isFlagged;
        if (state.selectedFilter === 'urgent') return t.isUrgent;
        if (state.selectedFilter === 'scheduled') return !!t.scheduledAt;
        if (state.selectedFilter === 'today') {
          if (!t.scheduledAt) return false;
          const taskDate = new Date(t.scheduledAt).toISOString().split('T')[0];
          const today = new Date().toISOString().split('T')[0];
          return taskDate === today;
        }

        // Selected a group
        return t.groupId === state.selectedFilter;
      }).sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    },
    counts(state) {
      const pending = state.tasks.filter(t => !t.completedAt);
      return {
        today: pending.filter(t => t.scheduledAt && new Date(t.scheduledAt).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]).length,
        scheduled: pending.filter(t => !!t.scheduledAt).length,
        all: pending.length,
        flagged: pending.filter(t => t.isFlagged).length,
        completed: state.tasks.filter(t => !!t.completedAt).length,
        urgent: pending.filter(t => t.isUrgent).length,
        byGroup: state.groups.reduce((acc, g) => {
          acc[g.id] = pending.filter(t => t.groupId === g.id).length;
          return acc;
        }, {} as Record<string, number>),
      };
    }
  }
});
