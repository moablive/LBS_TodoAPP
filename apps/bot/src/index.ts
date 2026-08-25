import { Telegraf, session, Scenes } from 'telegraf';
import { env } from './config.js';
import type { BotContext } from './context.js';
import { auth, forgetLinked } from './auth.js';
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

/**
 * Reentra no login para trocar a conta do LoginHub vinculada a este Telegram.
 *
 * Sem isto não havia saída: o `auth` só abre o wizard quando NÃO acha vínculo,
 * então um vínculo apontando para uma conta que não existe mais no hub (caso
 * típico depois de recriar a conta) prendia a pessoa. O bot seguia funcionando
 * — os dados moram sob o telegramId —, mas a web, que resolve o namespace pelo
 * loginhubId, mostrava um app vazio, e não havia como religar os dois lados.
 */
bot.command('relogin', async (ctx) => {
  forgetLinked(String(ctx.from.id));
  await ctx.reply('🔐 Vamos revincular esta conta. Entre com o seu e-mail e senha do LoginHub.');
  return ctx.scene.enter('LOGIN_WIZARD');
});

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
