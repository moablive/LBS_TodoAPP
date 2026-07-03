import { ref } from 'vue';

export type ThemeMode = 'dark' | 'light';

const MODE_KEY = 'theme-mode';
const ACCENT_KEY = 'theme-accent';
const DEFAULT_ACCENT = '#0a7aff';

export const accentPresets = [
  '#0a7aff', // azul
  '#30d158', // verde
  '#ff3b30', // vermelho
  '#ff9500', // laranja
  '#ff2d55', // rosa
  '#bf5af2', // roxo
  '#ffcc00', // amarelo
  '#64d2ff', // ciano
];

const mode = ref<ThemeMode>((localStorage.getItem(MODE_KEY) as ThemeMode) || 'dark');
const accent = ref<string>(localStorage.getItem(ACCENT_KEY) || DEFAULT_ACCENT);

function lighten(hex: string, amount: number): string {
  const n = hex.replace('#', '');
  if (n.length !== 6) return hex;
  const ch = (i: number) =>
    Math.min(255, Math.round(parseInt(n.slice(i, i + 2), 16) + 255 * amount))
      .toString(16)
      .padStart(2, '0');
  return `#${ch(0)}${ch(2)}${ch(4)}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const n = hex.replace('#', '');
  if (n.length !== 6) return hex;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function apply() {
  const root = document.documentElement;
  root.classList.toggle('light', mode.value === 'light');
  root.style.setProperty('--accent', accent.value);
  root.style.setProperty('--accent-hover', lighten(accent.value, 0.15));
  root.style.setProperty('--accent-soft', hexToRgba(accent.value, 0.2));
}

export function useTheme() {
  function setMode(m: ThemeMode) {
    mode.value = m;
    localStorage.setItem(MODE_KEY, m);
    apply();
  }
  function setAccent(color: string) {
    accent.value = color;
    localStorage.setItem(ACCENT_KEY, color);
    apply();
  }
  return { mode, accent, setMode, setAccent, apply };
}

// Aplica o tema salvo já no carregamento do app.
apply();
