import { Telegraf, session, Scenes } from 'telegraf';
import { env } from './config.js';
import type { BotContext } from './context.js';
import { auth, markLinked } from './auth.js';
import { handleAddTask, handleListTasks, handleRemoveTask } from './handlers/tasks.js';
import { handleVoiceMessage } from './handlers/voice.js';
import { startNotificationsCron } from './cron/notifications.js';
import { addTaskWizard } from './scenes/addTaskWizard.js';
import { removeTaskWizard } from './scenes/removeTaskWizard.js';
import { completeTaskWizard } from './scenes/completeTaskWizard.js';
import { addGroupWizard } from './scenes/addGroupWizard.js';
import { loginWizard } from './scenes/loginWizard.js';
import { menuKeyboard } from './ui/menu.js';
import { botApi } from '@todo/api-client';

// Inicializar Bot
const bot = new Telegraf<BotContext>(env.TELEGRAM_BOT_TOKEN);

// Sessão e Stages precisam vir ANTES do auth: usuários não vinculados são
// jogados no LOGIN_WIZARD, e isso exige ctx.scene disponível.
const stage = new Scenes.Stage<BotContext>([
  addTaskWizard,
  removeTaskWizard,
  completeTaskWizard,
  addGroupWizard,
  loginWizard
]);
bot.use(session());
bot.use(stage.middleware());

/**
 * Vínculo híbrido: `/start <passe>` vindo do deep link emitido no app.
 *
 * Vem ANTES do `auth` de propósito. Quem chega por aqui ainda não tem vínculo —
 * é o que veio criar —, e o `auth` jogaria a pessoa no wizard de senha, que é
 * exatamente o fluxo que este caminho existe para aposentar: senha e código do
 * 2FA digitados dentro do chat ficam no histórico do Telegram.
 *
 * A autenticação de verdade já aconteceu no PC, com 2FA. O que chega aqui é um
 * passe de uso único que só abre uma porta: gravar o vínculo.
 */
bot.use(async (ctx, next) => {
  const texto = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
  const passe = /^\/start\s+(\S+)/.exec(texto ?? '')?.[1];
  if (!passe) return next();

  const telegramId = String(ctx.from!.id);
  try {
    const r = await botApi.consumirPasseDeVinculo(passe, telegramId);
    markLinked(telegramId);
    // O passe some do chat: ele já morreu no consumo, mas deixá-lo à vista
    // convida a reenviar e a receber "não vale mais" sem entender por quê.
    await ctx.deleteMessage().catch(() => {});
    await ctx.reply(
      `✅ <b>Telegram vinculado!</b>\n\n` +
        `Sua conta do TodoAPP (#${r.loginhubId}) agora fala com este chat. ` +
        'Suas tarefas do site e do bot andam juntas, e os lembretes chegam por aqui.\n\n' +
        'O que deseja fazer?',
      { parse_mode: 'HTML', ...menuKeyboard }
    );
  } catch (err) {
    console.error('[vinculo] falha ao consumir o passe:', err);
    await ctx.deleteMessage().catch(() => {});
    await ctx.reply(
      '❌ <b>Este link de vínculo não vale mais.</b>\n\n' +
        'Ele serve uma vez só e expira em 10 minutos. Abra o TodoAPP no navegador, ' +
        'entre na sua conta e gere outro em <b>Vincular Telegram</b>.',
      { parse_mode: 'HTML' }
    );
  }
});

// Middleware de autenticação (LoginHub via bot — padrão MoneyAPP)
bot.use(auth);

// Iniciar cron jobs
startNotificationsCron(bot);

// Menu principal / Start
bot.start(async (ctx) => {
  let name = 'Patrão';
  try {
    const settings = await botApi.getReminderSettings(String(ctx.from.id));
    if (settings.displayName?.trim()) name = settings.displayName.trim();
  } catch { /* usa fallback */ }
  await ctx.reply(
    `👋 Fala, ${name}! Aqui é o seu Assistente Pessoal.\n\nO que o chefe deseja fazer agora?`,
    menuKeyboard
  );
});

// Mensagem de voz
bot.on('voice', handleVoiceMessage);

// Ações dos Botões
bot.hears('✅ Concluir Tarefa', (ctx) => ctx.scene.enter('COMPLETE_TASK_WIZARD'));
bot.hears('📋 Listar Tarefas', handleListTasks);
bot.hears('📂 Minhas Listas', handleListTasks);
bot.hears('📁 Nova Lista', (ctx) => ctx.scene.enter('ADD_GROUP_WIZARD'));
bot.hears('📝 Adicionar Tarefa', (ctx) => ctx.scene.enter('ADD_TASK_WIZARD'));
bot.hears('❌ Remover Tarefa', (ctx) => ctx.scene.enter('REMOVE_TASK_WIZARD'));

// Comandos
bot.command('add', handleAddTask);
bot.command('list', handleListTasks);
bot.command('remove', handleRemoveTask);

bot.catch((err, ctx) => {
  console.error(`[bot] erro ao processar update ${ctx.updateType}:`, err);
});

bot.launch({ dropPendingUpdates: true }).catch((err: unknown) => {
  console.error('[bot] polling encerrado por erro:', err);
  process.exit(1);
});
console.log('🤖 TODO Bot rodando...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
