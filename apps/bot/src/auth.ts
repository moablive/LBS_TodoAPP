import type { MiddlewareFn } from 'telegraf';
import type { BotContext } from './context.js';
import { env } from './config.js';

export const auth: MiddlewareFn<BotContext> = async (ctx, next) => {
  const id = ctx.from?.id;
  if (!id) return;

  if (env.ALLOWED_USER_IDS && !env.ALLOWED_USER_IDS.includes(String(id))) {
    if (ctx.chat?.type === 'private') {
      await ctx.reply('⛔ Acesso negado. Você não tem permissão para usar este bot.');
    }
    return;
  }
  
  return next();
};
