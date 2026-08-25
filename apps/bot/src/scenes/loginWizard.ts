import { Scenes, Markup } from 'telegraf';
import type { BotContext } from '../context.js';
import { env } from '../config.js';
import { botApi } from '@todo/api-client';
import { markLinked } from '../auth.js';
import { menuKeyboard } from '../ui/menu.js';
import { criarHubAuthBot, HubApiError, type HubSessionData } from '../lib/hubAuthBot.js';

const cancelKeyboard = Markup.inlineKeyboard([[Markup.button.callback('❌ Cancelar', 'cancel')]]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Integração com o hub pela fonte canônica (`src/lib/`, sincronizada pelo
 * LoginHUB). Este wizard já tratava os três desfechos do `/auth/login` — mas
 * com `fetch` cru e uma cópia local do contrato, que é exatamente como nasceram
 * as forks divergentes do cliente antigo. Quem conhece rotas, desfechos e a
 * diferença entre TOTP e código de recuperação é o kit; aqui só mora a conversa.
 */
const hub = criarHubAuthBot({
  baseUrl: env.LOGINHUB_API_URL,
  appId: env.LOGINHUB_APP_ID,
  appLoginUrl: env.APP_LOGIN_URL,
});

async function handleCancel(ctx: BotContext): Promise<boolean> {
  if (ctx.callbackQuery && 'data' in ctx.callbackQuery && ctx.callbackQuery.data === 'cancel') {
    await ctx.answerCbQuery().catch(() => {});
    await ctx.reply('❌ Login cancelado. Envie /relogin quando quiser tentar novamente.');
    await ctx.scene.leave();
    return true;
  }
  return false;
}

/** Fecha o login: descobre o dono da sessão, vincula o Telegram e libera o menu. */
async function concluirVinculo(ctx: BotContext, session: HubSessionData) {
  const dono = hub.donoDaSessao(session);
  if (!dono) {
    await ctx.reply('❌ Não consegui validar o seu login. Tente novamente com /relogin.');
    return ctx.scene.leave();
  }

  const telegramId = String(ctx.from!.id);
  await botApi.linkTelegram(dono.loginhubId, telegramId);
  markLinked(telegramId);

  await ctx.reply(
    `✅ <b>Conta vinculada com sucesso!</b>\n\n` +
      `Bem-vindo(a) ao TodoAPP Bot, ${dono.nome ?? ctx.from?.first_name ?? ''}! 🎉\n` +
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
  // Passo 3 — validar no LoginHub
  //
  // `/auth/login` responde 200 em TRÊS desfechos e só um traz sessão. Com o 2FA
  // exigido de TODA conta do hub, os outros dois viraram a regra.
  async (ctx: BotContext) => {
    if (await handleCancel(ctx)) return;
    if (!ctx.message || !('text' in ctx.message)) return;

    const password = ctx.message.text;
    const email = (ctx.scene.session as any).loginEmail as string;

    // Apaga a mensagem com a senha o quanto antes.
    await ctx.deleteMessage().catch(() => {});

    try {
      const r = await hub.login(email, password);

      // Enrolamento pendente: a senha conferiu, mas a conta exige um segundo
      // fator que ainda não existe. O passe vale 10 minutos e só abre as rotas
      // de enrolamento — a tela do QR é a do hub, e é para lá que se manda. O
      // bot não desenha QR nenhum: o secret não passeia pelo chat.
      if (r.status === 'enrolar') {
        await ctx.reply(
          '🔐 <b>Falta configurar a verificação em duas etapas.</b>\n\n' +
            'Abra o link abaixo no navegador e entre com o mesmo e-mail e senha. A própria tela ' +
            'mostra o QR para escanear no seu app autenticador (Google Authenticator, Authy, ' +
            '1Password...). <b>Guarde os códigos de recuperação</b> — eles aparecem uma vez só.\n\n' +
            `${hub.linkEnrolamento()}\n\n` +
            'Terminou? Volte aqui e envie /relogin.',
          { parse_mode: 'HTML' }
        );
        return ctx.scene.leave();
      }

      // Desafio: a senha conferiu e a sessão ainda NÃO existe. Ela só nasce
      // depois do código — é exatamente isso que o segundo fator compra.
      if (r.status === 'desafio') {
        (ctx.scene.session as any).challengeToken = r.challengeToken;
        await ctx.reply(
          '🔢 <b>Verificação em duas etapas</b>\n\n' +
            'Digite o <b>código de 6 dígitos</b> do seu app autenticador.\n' +
            '<i>Perdeu o acesso ao autenticador? Mande um dos seus códigos de recuperação.</i>',
          { parse_mode: 'HTML', ...cancelKeyboard }
        );
        return ctx.wizard.next();
      }

      return concluirVinculo(ctx, r.session);
    } catch (err) {
      if (err instanceof HubApiError && err.status === 401) {
        await ctx.reply(
          '❌ <b>Credenciais inválidas.</b>\n\nDigite a sua <b>senha</b> novamente, ou cancele e confira se ' +
            'você já definiu a senha pelo link do e-mail de convite em https://todo.astralwavelabel.com.',
          { parse_mode: 'HTML', ...cancelKeyboard }
        );
        return; // continua no mesmo passo esperando nova senha
      }
      // Conta ou app suspensos (403) e e-mail em mais de um app (409) têm
      // mensagem própria no hub, e ela diz mais do que "erro interno".
      if (err instanceof HubApiError && err.status !== 0) {
        await ctx.reply(`❌ ${err.message}`);
        return ctx.scene.leave();
      }
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

    if (!challengeToken) {
      await ctx.reply('⚠️ A janela de verificação expirou. Envie /relogin para começar de novo.');
      return ctx.scene.leave();
    }

    try {
      // TOTP ou código de recuperação: a rota certa sai do formato, e quem
      // decide isso é o kit.
      const session = await hub.segundoFator(challengeToken, codigo);
      return concluirVinculo(ctx, session);
    } catch (err) {
      // CHALLENGE_INVALIDO é a janela de 5 min vencida: não adianta insistir no
      // mesmo desafio, tem que refazer o login.
      if (err instanceof HubApiError && err.code === 'CHALLENGE_INVALIDO') {
        await ctx.reply('⚠️ A janela de verificação expirou. Envie /relogin para começar de novo.');
        return ctx.scene.leave();
      }
      if (err instanceof HubApiError && err.status === 401) {
        await ctx.reply(`❌ ${err.message}\n\nDigite o próximo código do autenticador:`, cancelKeyboard);
        return; // continua no mesmo passo esperando outro código
      }
      console.error('[login] erro ao verificar o segundo fator:', err);
      await ctx.reply('❌ Erro ao falar com o servidor de login. Tente novamente em instantes com /relogin.');
      return ctx.scene.leave();
    }
  }
);
