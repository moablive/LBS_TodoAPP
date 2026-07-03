import webpush from 'web-push';
import { env } from '../config.js';
import { botApi } from '@todo/api-client';

const configured = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
if (configured) {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
} else {
  console.warn('[push] VAPID keys ausentes — web push desativado, apenas Telegram.');
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/** Envia um push para todos os aparelhos inscritos do usuário. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
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
