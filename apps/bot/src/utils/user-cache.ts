import { botApi } from '@todo/api-client';
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

/**
 * Dono das linhas no banco: o `loginhub_id`, resolvido a partir do Telegram.
 *
 * ANTES devolvia o próprio telegramId, e era daí que vinha o defeito de fundo:
 * a mesma pessoa tinha duas identidades — a do hub, que a web usa, e a do
 * Telegram, que o bot usava — e os dados ficavam sob uma ou outra dependendo de
 * quem tinha criado a linha. Vincular o Telegram precisava MIGRAR o namespace; e
 * recriar a conta no hub deixava a web vazia enquanto o bot seguia vendo tudo.
 *
 * O hub é o dono da identidade. O Telegram é só um canal por onde a mesma pessoa
 * fala — e o `user_settings` é o mapa entre os dois. É como o MoneyAPP sempre fez.
 *
 * Devolve `null` quando não há vínculo: sem conta do hub não há dono, e o
 * chamador deve mandar a pessoa vincular em vez de inventar um namespace.
 */
export async function getDbUserId(telegramId?: number): Promise<string | null> {
  if (!telegramId) return null;
  const vinculo = await botApi.getUserByTelegramId(String(telegramId));
  return vinculo ? String(vinculo.loginhubId) : null;
}
