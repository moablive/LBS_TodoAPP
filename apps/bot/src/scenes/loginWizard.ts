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
    await ctx.reply('❌ Login cancelado. Envie /relogin quando quiser tentar novamente.');
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

/**
 * `/auth/login` responde 200 em TRÊS desfechos e só um traz sessão — é o mesmo
 * contrato que o auth-kit expõe aos frontends (`lib/hubAuthClient.ts`).
 *
 *   token                        sessão de 24 h, segue direto
 *   requires2FA + challengeToken 2FA ativo: o código fecha o login (5 min)
 *   require2FASetup + setupToken 2FA exigido e não configurado (10 min)
 *
 * Este wizard só conhecia o primeiro. Como o 2FA passou a ser exigido de TODA
 * conta do hub, os outros dois viraram a regra e o login pelo bot parou de
 * funcionar: `data.token` vinha `undefined` e caía no "não consegui validar".
 */
interface RespostaLogin {
  token?: string;
  requires2FA?: boolean;
  challengeToken?: string;
  require2FASetup?: boolean;
  setupToken?: string;
}

/** `true` só para string não vazia — `undefined` aqui vira login fantasma. */
const texto = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/** Fecha o login: extrai o dono da sessão, vincula o Telegram e libera o menu. */
async function concluirVinculo(ctx: BotContext, token: string) {
  const loginhubId = decodeLoginhubId(token);
  if (!loginhubId) {
    await ctx.reply('❌ Não consegui validar o seu login. Tente novamente com /relogin.');
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
}

export const loginWizard = new Scenes.WizardScene<BotContext>(
  'LOGIN_WIZARD',
  // Passo 1 — intro + pedir e-mail
  async (ctx: BotContext) => {
    await ctx.reply(
      '🔐 <b>Login TodoAPP</b>\n\n' +
        'Para usar o bot, faça login com a sua conta do TodoAPP (a mesma do site).\n\n' +
        '⚠️ <b>Importante:</b> é necessário já ter <b>definido a sua senha</b> pelo link que ' +
        'você recebeu no e-mail de convite. Se ainda não definiu, acesse ' +
        'https://todo.astralwavelabel.com primeiro e depois volte aqui.\n\n' +
        '🔢 A conta exige <b>verificação em duas etapas</b>: tenha o seu app autenticador à mão.\n\n' +
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
            'você já definiu a senha pelo link do e-mail de convite em https://todo.astralwavelabel.com.',
          { parse_mode: 'HTML', ...cancelKeyboard }
        );
        return; // continua no mesmo passo esperando nova senha
      }

      const data = (await response.json()) as RespostaLogin;

      // Enrolamento pendente: a senha conferiu, mas a conta exige um segundo
      // fator que ainda não existe. O passe vale 10 minutos e só abre as rotas
      // de enrolamento — a tela do QR é a do hub, e é para lá que se manda.
      if (data.require2FASetup === true && texto(data.setupToken)) {
        await ctx.reply(
          '🔐 <b>Falta configurar a verificação em duas etapas.</b>\n\n' +
            'Abra o link abaixo no navegador e escaneie o QR com o seu app autenticador ' +
            '(Google Authenticator, Authy, 1Password...). <b>Guarde os códigos de recuperação</b> — ' +
            'eles aparecem uma vez só.\n\n' +
            `${env.LOGINHUB_UI_URL}/enrolar-2fa?token=${encodeURIComponent(data.setupToken)}\n\n` +
            '⏳ O link vale 10 minutos. Terminou? Volte aqui e envie /relogin.',
          { parse_mode: 'HTML' }
        );
        return ctx.scene.leave();
      }

      // Desafio: a senha conferiu e a sessão ainda NÃO existe. Ela só nasce
      // depois do código — é exatamente isso que o segundo fator compra.
      if (data.requires2FA === true && texto(data.challengeToken)) {
        (ctx.scene.session as any).challengeToken = data.challengeToken;
        await ctx.reply(
          '🔢 <b>Verificação em duas etapas</b>\n\n' +
            'Digite o <b>código de 6 dígitos</b> do seu app autenticador.\n' +
            '<i>Perdeu o acesso ao autenticador? Mande um dos seus códigos de recuperação.</i>',
          { parse_mode: 'HTML', ...cancelKeyboard }
        );
        return ctx.wizard.next();
      }

      if (!texto(data.token)) {
        await ctx.reply('❌ Não consegui validar o seu login. Tente novamente com /relogin.');
        return ctx.scene.leave();
      }

      return concluirVinculo(ctx, data.token);
    } catch (err) {
      console.error('[login] erro ao validar no LoginHub:', err);
      await ctx.reply('❌ Erro ao falar com o servidor de login. Tente novamente em instantes com /relogin.');
      return ctx.scene.leave();
    }
  },
  // Passo 4 — segundo fator. Fecha o login que o passo 3 deixou pendente.
  async (ctx: BotContext) => {
    if (await handleCancel(ctx)) return;
    if (!ctx.message || !('text' in ctx.message)) return;

    const codigo = ctx.message.text.trim();
    const challengeToken = (ctx.scene.session as any).challengeToken as string | undefined;

    // O código é credencial: sai da conversa como a senha sai.
    await ctx.deleteMessage().catch(() => {});

    if (!texto(challengeToken)) {
      await ctx.reply('⚠️ A janela de verificação expirou. Envie /relogin para começar de novo.');
      return ctx.scene.leave();
    }

    // Código de recuperação tem formato próprio (XXXXX-XXXXX) e rota própria —
    // é de uso único e não passa pela conferência de TOTP.
    const backup = !/^\d{6}$/.test(codigo);
    const rota = backup ? '/auth/2fa/verify-backup' : '/auth/2fa/verify';
    const corpo = backup ? { challengeToken, backupCode: codigo } : { challengeToken, codigo };

    try {
      const response = await fetch(`${env.LOGINHUB_API_URL}${rota}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      const data = (await response.json().catch(() => ({}))) as RespostaLogin & { error?: string; message?: string };

      if (!response.ok) {
        // CHALLENGE_INVALIDO é a janela de 5 min vencida: não adianta insistir
        // no mesmo desafio, tem que refazer o login.
        if (data.error === 'CHALLENGE_INVALIDO') {
          await ctx.reply('⚠️ A janela de verificação expirou. Envie /relogin para começar de novo.');
          return ctx.scene.leave();
        }
        await ctx.reply(
          `❌ ${data.message ?? 'Código inválido.'}\n\nDigite o próximo código do autenticador:`,
          cancelKeyboard
        );
        return; // continua no mesmo passo esperando outro código
      }

      if (!texto(data.token)) {
        await ctx.reply('❌ Não consegui validar o seu login. Tente novamente com /relogin.');
        return ctx.scene.leave();
      }

      return concluirVinculo(ctx, data.token);
    } catch (err) {
      console.error('[login] erro ao verificar o segundo fator:', err);
      await ctx.reply('❌ Erro ao falar com o servidor de login. Tente novamente em instantes com /relogin.');
      return ctx.scene.leave();
    }
  }
);
