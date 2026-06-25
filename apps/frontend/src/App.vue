<template>
  <router-view />
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';

// Initialize auth state
useAuthStore();
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
  background: #212737;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #3a445c;
}
</style>
