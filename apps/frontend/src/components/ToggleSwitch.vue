<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    @click="$emit('update:modelValue', !modelValue)"
    class="relative w-[46px] h-[27px] rounded-full transition-colors shrink-0"
    :class="modelValue ? 'bg-[#30d158]' : 'bg-[var(--border)]'"
  >
    <span
      class="absolute top-[2px] left-[2px] w-[23px] h-[23px] bg-white rounded-full shadow transition-transform"
      :class="modelValue ? 'translate-x-[19px]' : ''"
    ></span>
  </button>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>();
defineEmits<{ (e: 'update:modelValue', value: boolean): void }>();
</script>
