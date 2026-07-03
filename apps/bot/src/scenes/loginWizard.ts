import { Scenes, Markup } from 'telegraf';
import type { BotContext } from '../context.js';
import { env } from '../config.js';
import { botApi } from '@todo/api-client';
import { markLinked } from '../auth.js';
import { menuKeyboard } from '../ui/menu.js';

const cancelKeyboard = Markup.inlineKeyboard([[Markup.button.callback('❌ Cancelar', 'cancel')]]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handleCancel(ctx: BotContext): Promise<boolean> {
  if (ctx.callbackQuery && 'data' in ctx.callbackQuery && ctx.callbackQuery.data === 'cancel') {
    await ctx.answerCbQuery().catch(() => {});
    await ctx.reply('❌ Login cancelado. Envie /start quando quiser tentar novamente.');
    await ctx.scene.leave();
    return true;
  }
  return false;
}

/** Extrai o loginhubId (sub) do payload do JWT emitido pelo LoginHub. */
function decodeLoginhubId(token: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString());
    const id = parseInt(String(payload.sub), 10);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export const loginWizard = new Scenes.WizardScene<BotContext>(
  'LOGIN_WIZARD',
  // Passo 1 — intro + pedir e-mail
  async (ctx: BotContext) => {
    await ctx.reply(
      '🔐 <b>Login TodoAPP</b>\n\n' +
        'Para usar o bot, faça login com a sua conta do TodoAPP (a mesma do site).\n\n' +
        '⚠️ <b>Importante:</b> é necessário já ter <b>redefinido a sua senha padrão</b> ' +
        'pelo link que você recebeu no e-mail de convite. Se ainda não redefiniu, acesse ' +
        'https://todo.astralwavelabel.com primeiro e depois volte aqui.\n\n' +
        '📧 Digite o seu <b>e-mail</b>:',
      { parse_mode: 'HTML', ...cancelKeyboard }
    );
    return ctx.wizard.next();
  },
  // Passo 2 — ler e-mail, pedir senha
  async (ctx: BotContext) => {
    if (await handleCancel(ctx)) return;
    if (!ctx.message || !('text' in ctx.message)) return;

    const email = ctx.message.text.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      await ctx.reply('⚠️ E-mail inválido. Digite novamente (ex: nome@dominio.com):', cancelKeyboard);
      return;
    }
    (ctx.scene.session as any).loginEmail = email;

    await ctx.reply(
      '🔑 Agora digite a sua <b>senha</b>:\n<i>(a mensagem será apagada por segurança)</i>',
      { parse_mode: 'HTML', ...cancelKeyboard }
    );
    return ctx.wizard.next();
  },
  // Passo 3 — validar no LoginHub e vincular
  async (ctx: BotContext) => {
    if (await handleCancel(ctx)) return;
    if (!ctx.message || !('text' in ctx.message)) return;

    const password = ctx.message.text;
    const email = (ctx.scene.session as any).loginEmail as string;

    // Apaga a mensagem com a senha o quanto antes.
    await ctx.deleteMessage().catch(() => {});

    try {
      const response = await fetch(`${env.LOGINHUB_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, app_id: env.LOGINHUB_APP_ID }),
      });

      if (!response.ok) {
        await ctx.reply(
          '❌ <b>Credenciais inválidas.</b>\n\nDigite a sua <b>senha</b> novamente, ou cancele e confira se ' +
            'você já redefiniu a senha padrão em https://todo.astralwavelabel.com.',
          { parse_mode: 'HTML', ...cancelKeyboard }
        );
        return; // continua no mesmo passo esperando nova senha
      }

      const data = (await response.json()) as { token?: string; requirePasswordChange?: boolean };

      if (data.requirePasswordChange) {
        await ctx.reply(
          '⚠️ <b>Você ainda está com a senha padrão.</b>\n\n' +
            'Por segurança, o bot só libera o acesso depois que você redefinir a senha.\n' +
            '1️⃣ Acesse https://todo.astralwavelabel.com\n' +
            '2️⃣ Entre e defina a sua nova senha\n' +
            '3️⃣ Volte aqui e envie /start para fazer o login. 😉'
        );
        return ctx.scene.leave();
      }

      const loginhubId = data.token ? decodeLoginhubId(data.token) : null;
      if (!loginhubId) {
        await ctx.reply('❌ Não consegui validar o seu login. Tente novamente com /start.');
        return ctx.scene.leave();
      }

      const telegramId = String(ctx.from!.id);
      await botApi.linkTelegram(loginhubId, telegramId);
      markLinked(telegramId);

      await ctx.reply(
        `✅ <b>Conta vinculada com sucesso!</b>\n\n` +
          `Bem-vindo(a) ao TodoAPP Bot, ${ctx.from?.first_name ?? ''}! 🎉\n` +
          'Suas tarefas do site e do bot agora andam juntas, e você vai receber os lembretes por aqui.\n\n' +
          'O que deseja fazer?',
        { parse_mode: 'HTML', ...menuKeyboard }
      );
      return ctx.scene.leave();
    } catch (err) {
      console.error('[login] erro ao validar no LoginHub:', err);
      await ctx.reply('❌ Erro ao falar com o servidor de login. Tente novamente em instantes com /start.');
      return ctx.scene.leave();
    }
  }
);
