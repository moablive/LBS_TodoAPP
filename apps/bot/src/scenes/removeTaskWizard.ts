import { Scenes, Markup } from 'telegraf';
import type { BotContext } from '../context.js';
import { getDbUserId } from '../utils/user-cache.js';
import { botApi } from '@todo/api-client';
import { menuKeyboard } from '../ui/menu.js';



export const removeTaskWizard = new Scenes.WizardScene<BotContext>(
  'REMOVE_TASK_WIZARD',
  async (ctx: BotContext) => {
    await ctx.reply(
      '🗑 <b>Remover Tarefa</b>\n\nPor favor, envie o <b>ID</b> da tarefa que deseja remover:\n<i>(Dica: Use "📋 Listar Tarefas" para ver os IDs)</i>',
      { 
        parse_mode: 'HTML', 
        ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancelar', 'cancel')]]) 
      }
    );
    return ctx.wizard.next();
  },
  async (ctx: BotContext) => {
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery && ctx.callbackQuery.data === 'cancel') {
      await ctx.answerCbQuery().catch(() => {});
      await ctx.reply('❌ Operação cancelada.', { ...menuKeyboard });
      return ctx.scene.leave();
    }

    if (!ctx.message || !('text' in ctx.message)) return;
    const text = ctx.message.text.trim();

    try {
      const userId = await getDbUserId(ctx.from?.id);
      if (!userId) {
        await ctx.reply('Usuário não encontrado.');
        return ctx.scene.leave();
      }

      await botApi.removeTask(userId, text);
      await ctx.reply(`✅ Tarefa <code>${text}</code> removida com sucesso.`, { 
        parse_mode: 'HTML',
        ...menuKeyboard
      });
    } catch (error) {
      console.error('Erro ao remover tarefa via wizard:', error);
      await ctx.reply('Ocorreu um erro ao remover a tarefa. Verifique se o ID está correto.', { ...menuKeyboard });
    }

    return ctx.scene.leave();
  }
);
