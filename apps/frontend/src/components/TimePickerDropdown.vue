<template>
  <div class="relative flex-1 min-w-0">
    <input
      ref="inputEl"
      type="text"
      inputmode="numeric"
      :value="modelValue"
      placeholder="--:--"
      @focus="openList"
      @blur="commit"
      @keydown.enter="($event.target as HTMLElement).blur()"
      class="w-full bg-[var(--bg)] text-[var(--text)] text-[14px] rounded-lg px-3 py-2 border outline-none transition-colors"
      :class="open ? 'border-[var(--accent)] relative z-50' : 'border-transparent hover:border-[var(--border)]'"
    />

    <div v-if="open" class="fixed inset-0 z-40" @mousedown="open = false"></div>

    <div
      v-if="open"
      ref="listEl"
      class="absolute left-0 top-full mt-1.5 z-50 w-full min-w-[130px] max-h-[216px] overflow-y-auto custom-scrollbar bg-[var(--bg-card)] border border-white/10 rounded-xl shadow-2xl py-1"
    >
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        :data-selected="opt.value === modelValue || undefined"
        @mousedown.prevent="select(opt.value)"
        class="w-full text-left px-3 py-1.5 text-[13px] transition-colors flex items-center justify-between gap-2"
        :class="opt.value === modelValue ? 'bg-[var(--accent)] text-white font-semibold' : 'text-[var(--text)] hover:bg-[var(--bg-hover)]'"
      >
        <span>{{ opt.value }}</span>
        <span v-if="opt.hint" class="text-[11px]" :class="opt.value === modelValue ? 'text-white/70' : 'text-[var(--muted)]'">{{ opt.hint }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';

// v-model no formato 'HH:MM' ('' = sem hora). `startTime` (opcional) faz a lista
// começar nesse horário e exibir a duração ao lado — comportamento de campo "fim".
const props = defineProps<{ modelValue: string; startTime?: string }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();

const open = ref(false);
const inputEl = ref<HTMLInputElement | null>(null);
const listEl = ref<HTMLElement | null>(null);

const pad = (n: number) => String(n).padStart(2, '0');
const STEP = 15;

function toMin(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (!m) return null;
  const min = Number(m[1]) * 60 + Number(m[2]);
  return min < 24 * 60 ? min : null;
}

function fmt(min: number) {
  min = ((min % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

function durationHint(from: number, to: number) {
  let dur = to - from;
  if (dur <= 0) dur += 24 * 60;
  const h = Math.floor(dur / 60);
  const m = dur % 60;
  if (!h) return `${m}min`;
  return m ? `${h}h${pad(m)}` : `${h}h`;
}

const options = computed(() => {
  const startMin = props.startTime ? toMin(props.startTime) : null;
  const base = startMin !== null ? startMin + STEP : 0;
  const count = (24 * 60) / STEP;
  return Array.from({ length: count }, (_, i) => {
    const min = base + i * STEP;
    return {
      value: fmt(min),
      hint: startMin !== null ? durationHint(startMin, min) : '',
    };
  });
});

async function openList() {
  open.value = true;
  await nextTick();
  const el = listEl.value?.querySelector('[data-selected]') as HTMLElement | null;
  if (el) {
    listEl.value!.scrollTop = el.offsetTop - listEl.value!.clientHeight / 2 + el.clientHeight / 2;
  } else if (props.modelValue && listEl.value) {
    // sem match exato (ex.: 18:37) — rola até o horário mais próximo
    const cur = toMin(props.modelValue);
    if (cur !== null) {
      const idx = options.value.findIndex(o => (toMin(o.value) ?? 0) >= cur);
      const child = listEl.value.children[Math.max(0, idx)] as HTMLElement | undefined;
      if (child) listEl.value.scrollTop = child.offsetTop - listEl.value.clientHeight / 2;
    }
  }
}

function select(v: string) {
  emit('update:modelValue', v);
  open.value = false;
}

// Aceita digitação livre: "18", "1830", "18:30", "18h30" → "18:30".
function commit(e: Event) {
  open.value = false;
  const target = e.target as HTMLInputElement;
  const raw = target.value.trim();

  if (!raw) {
    emit('update:modelValue', '');
    return;
  }

  const m = /^(\d{1,2})[:hH]?(\d{2})?$/.exec(raw.replace(/\s/g, ''));
  if (m) {
    const hh = Number(m[1]);
    const mm = Number(m[2] ?? 0);
    if (hh < 24 && mm < 60) {
      const v = `${pad(hh)}:${pad(mm)}`;
      emit('update:modelValue', v);
      target.value = v;
      return;
    }
  }
  target.value = props.modelValue; // inválido → volta ao valor anterior
}
</script>
