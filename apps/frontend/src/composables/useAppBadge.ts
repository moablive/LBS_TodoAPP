// Número no ícone do app (Badging API) — estilo WhatsApp/Telegram. Só tem
// efeito no PWA INSTALADO (Chrome/Edge desktop, Android, e iOS 16.4+ na tela de
// início). Em aba normal do navegador é um no-op silencioso.
type BadgeNav = Navigator & {
  setAppBadge?: (n?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export function setAppBadge(count: number): void {
  const nav = navigator as BadgeNav;
  if (typeof nav.setAppBadge !== 'function') return;
  if (count > 0) nav.setAppBadge(count).catch(() => {});
  else nav.clearAppBadge?.().catch(() => {});
}
