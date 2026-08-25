import type { MiddlewareFn } from 'telegraf';
import type { BotContext } from './context.js';
import { botApi } from '@todo/api-client';

// Cache em memória de telegramIds já vinculados — evita um SELECT por update.
// Vínculo não é desfeito em operação normal, então não precisa de TTL.
const linkedCache = new Set<string>();

export function markLinked(telegramId: string) {
  linkedCache.add(telegramId);
}


/**
 * Autenticação estilo MoneyAPP: qualquer usuário do LoginHub (convidado por
 * e-mail) pode usar o bot DEPOIS de vincular a conta via LOGIN_WIZARD.
 * Quem ainda não vinculou cai direto no fluxo de login.
 */
export const auth: MiddlewareFn<BotContext> = async (ctx, next) => {
  const id = ctx.from?.id;
  if (!id) return;
  if (ctx.chat && ctx.chat.type !== 'private') return; // bot é de uso privado

  const telegramId = String(id);


  if (linkedCache.has(telegramId)) return next();

  try {
    const user = await botApi.getUserByTelegramId(telegramId);
    if (user) {
      linkedCache.add(telegramId);
      return next();
    }
  } catch (err) {
    console.error('[auth] erro ao consultar vínculo:', err);
    await ctx.reply('⚠️ Erro interno. Tente novamente em instantes.');
    return;
  }

  // Não vinculado: deixa o próprio wizard de login processar as respostas.
  if (ctx.scene?.current?.id === 'LOGIN_WIZARD') return next();
  return ctx.scene.enter('LOGIN_WIZARD');
};
