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
 * Identidade central: vale quem tem a conta do LoginHub vinculada a este
 * Telegram. O vínculo nasce no app (Configurações → Vincular Telegram), com a
 * pessoa já autenticada e com 2FA cumprido — nunca por senha digitada no chat.
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

  // Não vinculado. Antes isto abria o wizard de senha; ele saiu porque pedia
  // e-mail, senha e o código do 2FA DENTRO do chat — tudo isso fica no
  // histórico do Telegram, nos servidores deles e em qualquer backup.
  //
  // O vínculo agora nasce no app, onde a pessoa já se autenticou com 2FA de
  // verdade, e o que atravessa o chat é só um passe de uso único.
  await ctx.reply(
    '🔒 <b>Este bot precisa da sua conta do TodoAPP.</b>\n\n' +
      'Abra <b>https://todo.astralwavelabel.com</b> no navegador, entre na sua conta e use ' +
      '<b>Configurações → Vincular Telegram</b>. O link que aparecer abre esta ' +
      'conversa e conclui sozinho.\n\n' +
      '<i>Senha e código do autenticador nunca são digitados aqui.</i>',
    { parse_mode: 'HTML' },
  );
  return;
};
