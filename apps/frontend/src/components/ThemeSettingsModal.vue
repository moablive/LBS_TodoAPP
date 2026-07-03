<template>
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click.self="$emit('close')">
    <div class="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/10">
      <div class="p-6">
        <div class="flex items-center gap-3 mb-5">
          <SwatchIcon class="w-6 h-6 text-[var(--accent)]" />
          <h2 class="text-xl font-semibold text-[var(--text)]">Aparência</h2>
        </div>

        <!-- Modo -->
        <h3 class="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Tema</h3>
        <div class="grid grid-cols-2 gap-2 mb-5">
          <button
            @click="theme.setMode('dark')"
            class="flex items-center justify-center gap-2 py-3 rounded-xl border text-[13px] font-semibold transition-colors"
            :class="theme.mode.value === 'dark' ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]' : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'"
          >
            <MoonIcon class="w-4 h-4" /> Escuro
          </button>
          <button
            @click="theme.setMode('light')"
            class="flex items-center justify-center gap-2 py-3 rounded-xl border text-[13px] font-semibold transition-colors"
            :class="theme.mode.value === 'light' ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]' : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'"
          >
            <SunIcon class="w-4 h-4" /> Claro
          </button>
        </div>

        <!-- Cor de destaque -->
        <h3 class="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Cor de destaque</h3>
        <div class="flex flex-wrap gap-2.5 items-center">
          <button
            v-for="c in accentPresets"
            :key="c"
            @click="theme.setAccent(c)"
            class="w-9 h-9 rounded-full border-2 transition-transform hover:scale-110"
            :style="{ backgroundColor: c }"
            :class="theme.accent.value.toLowerCase() === c ? 'border-[var(--text)]' : 'border-transparent'"
          ></button>
          <!-- Cor personalizada -->
          <label
            class="w-9 h-9 rounded-full border-2 border-dashed border-[var(--muted)] flex items-center justify-center cursor-pointer hover:border-[var(--text)] transition-colors relative overflow-hidden"
            title="Cor personalizada"
          >
            <span
              v-if="isCustomAccent"
              class="absolute inset-0"
              :style="{ backgroundColor: theme.accent.value }"
            ></span>
            <PlusIcon v-if="!isCustomAccent" class="w-4 h-4 text-[var(--muted)]" />
            <input
              type="color"
              :value="theme.accent.value"
              @input="theme.setAccent(($event.target as HTMLInputElement).value)"
              class="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
        </div>
      </div>

      <div class="flex border-t border-[var(--border)]">
        <button
          @click="$emit('close')"
          class="flex-1 py-3.5 text-[var(--accent)] font-semibold hover:bg-[var(--bg-hover)] transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { MoonIcon, SunIcon, SwatchIcon, PlusIcon } from '@heroicons/vue/24/outline';
import { useTheme, accentPresets } from '@/composables/useTheme';

defineEmits<{ (e: 'close'): void }>();

const theme = useTheme();
const isCustomAccent = computed(
  () => !accentPresets.includes(theme.accent.value.toLowerCase())
);
</script>
