import webpush from 'web-push';
import { env } from '../config.js';
import { botApi } from '@todo/api-client';
import { criarClienteNotify, type EventoNotify } from '../lib/lbsNotify.js';

const configured = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
if (configured) {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
} else {
  console.warn('[push] VAPID keys ausentes — web push desativado, apenas Telegram.');
}

/**
 * Entrega centralizada (LBS Notify). Enquanto `TODO_NOTIFY_USE_CENTRAL` for
 * `false` este cliente fica inerte e o caminho legado abaixo continua valendo —
 * é a flag do rollout gradual, não um interruptor de emergência.
 */
const notify = criarClienteNotify({
  baseUrl: env.LBS_NOTIFY_URL,
  app: 'todo',
  key: env.LBS_NOTIFY_KEY,
  enabled: env.TODO_NOTIFY_USE_CENTRAL,
});

if (notify.ativo()) {
  console.log('[push] entrega delegada ao LBS Notify.');
} else if (env.TODO_NOTIFY_USE_CENTRAL) {
  console.warn('[push] TODO_NOTIFY_USE_CENTRAL=true mas LBS_NOTIFY_KEY ausente — usando o caminho legado.');
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/** Metadados do evento — só usados quando a entrega vai pelo LBS Notify. */
export interface MetaEvento {
  /** Ex.: `todo.reminder`. */
  type: string;
  /**
   * Id ESTÁVEL do evento. Derive do fato (tarefa + instante do lembrete),
   * nunca de `Date.now()`: com um id novo a cada execução, um restart do bot
   * faz a pessoa receber o mesmo lembrete duas vezes — que é justamente o que
   * a idempotência do Notify existe para impedir.
   */
  eventId: string;
  dedupeKey?: string;
}

/** Envia um push para todos os aparelhos inscritos do usuário. */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  meta?: MetaEvento,
): Promise<void> {
  // ── Caminho novo: só enfileira e volta ──────────────────────────────────
  if (notify.ativo() && meta) {
    const evento: EventoNotify = {
      eventId: meta.eventId,
      type: meta.type,
      userId,
      title: payload.title,
      body: payload.body,
      data: { url: payload.url ?? '/' },
      ...(meta.dedupeKey ? { dedupeKey: meta.dedupeKey } : {}),
    };
    const ok = await notify.emitir(evento);
    // Sem fallback silencioso para o caminho legado: durante o rollout o
    // aparelho pode estar inscrito nos DOIS lados, e cair para o legado depois
    // de o Notify já ter aceito entregaria a mesma notificação duas vezes.
    if (!ok) console.error(`[push] LBS Notify recusou o evento ${meta.eventId}`);
    return;
  }

  // ── Caminho legado: envio direto daqui, com a chave VAPID do app ────────
  if (!configured) return;

  const subs = await botApi.getPushSubscriptions(userId);
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ url: '/', ...payload })
      );
    } catch (err: any) {
      // 404/410 = inscrição expirada/revogada pelo navegador — limpar do banco.
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await botApi.deletePushSubscription(sub.endpoint).catch(() => {});
        console.log(`[push] inscrição expirada removida (${userId})`);
      } else {
        console.error(`[push] erro ao enviar para ${userId}:`, err?.statusCode ?? err);
      }
    }
  }
}
