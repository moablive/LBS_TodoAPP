import fs from 'fs';
import path from 'path';

const NOTIFICATIONS_FILE = path.join(process.cwd(), 'disabled-notifications.json');

export function getDisabledNotifications(): Set<string> {
  try {
    if (fs.existsSync(NOTIFICATIONS_FILE)) {
      const data = fs.readFileSync(NOTIFICATIONS_FILE, 'utf-8');
      return new Set(JSON.parse(data));
    }
  } catch (e) {
    console.error(e);
  }
  return new Set();
}

export function isNotificationEnabled(telegramId: string): boolean {
  const disabled = getDisabledNotifications();
  return !disabled.has(telegramId);
}

// Em modo standalone, o ID do banco é o próprio telegramId
export async function getDbUserId(telegramId?: number): Promise<string | null> {
  if (!telegramId) return null;
  return String(telegramId);
}
