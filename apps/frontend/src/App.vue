<template>
  <router-view />
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';

// Initialize auth state
useAuthStore();
const tasksStore = useTasksStore();

// Dynamically update the OS app badge based on demands
watch(() => tasksStore.counts, (newCounts) => {
  // O usuário pediu "demandas do dia" e deu exemplo "3 amanhã fica 3". 
  // Vamos somar os eventos de hoje e amanhã para a notificação ou focar no que tem demanda.
  // Pode ser só today ou (today + tomorrow). Vamos usar today + tomorrow por segurança, 
  // ou apenas a soma.
  const totalNotificacoes = newCounts.today + newCounts.tomorrow;
  
  if ('setAppBadge' in navigator) {
    if (totalNotificacoes > 0) {
      (navigator as any).setAppBadge(totalNotificacoes).catch(console.error);
    } else {
      (navigator as any).clearAppBadge().catch(console.error);
    }
  }
}, { deep: true });
</script>

<style>
/* Global scrollbar styling to fit the dark theme */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--muted2);
}
</style>
