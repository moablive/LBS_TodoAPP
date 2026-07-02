import { Scenes, Markup } from 'telegraf';
import { getDbUserId } from '../utils/user-cache.js';
import { botApi } from '@todo/api-client';
import type { BotContext } from '../context.js';
import { menuKeyboard } from '../ui/menu.js';

export const completeTaskWizard = new Scenes.WizardScene<BotContext>(
  'COMPLETE_TASK_WIZARD',
  async (ctx: BotContext) => {
    try {
      const userId = await getDbUserId(ctx.from?.id);
      if (!userId) {
         await ctx.reply('Usuário não encontrado.');
         return ctx.scene.leave();
      }
      const groups = await botApi.listGroups(userId);
      
      const buttons = groups.map(g => [Markup.button.callback(`📁 ${g.name}`, `group_${g.id}`)]);
      buttons.push([Markup.button.callback('📌 Geral (Nenhuma lista)', 'group_none')]);
      buttons.push([Markup.button.callback('❌ Cancelar', 'cancel')]);

      await ctx.reply(
        '✅ <b>Concluir Tarefa</b>\n\nDe qual lista você deseja concluir uma tarefa?',
        { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
      );
      return ctx.wizard.next();
    } catch (e) {
      console.error(e);
      await ctx.reply('Erro ao carregar listas.');
      return ctx.scene.leave();
    }
  },
  async (ctx: BotContext) => {
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      const data = ctx.callbackQuery.data;
      if (data === 'cancel') {
        await ctx.answerCbQuery().catch(() => {});
        await ctx.reply('❌ Operação cancelada.', { ...menuKeyboard });
        return ctx.scene.leave();
      }
      if (data.startsWith('group_')) {
        await ctx.answerCbQuery().catch(() => {});
        const groupId = data.replace('group_', '');
        
        try {
          const userId = await getDbUserId(ctx.from?.id);
          if (!userId) return ctx.scene.leave();

          const allTasks = await botApi.listTasks(userId);
          // Filtrar tarefas da lista selecionada
          const groupTasks = allTasks.filter(t => 
            groupId === 'none' ? !t.groupId : t.groupId === groupId
          );

          if (groupTasks.length === 0) {
            await ctx.reply('Nenhuma tarefa ativa encontrada nesta lista.');
            return ctx.scene.leave();
          }

          // Guardar na sessão o mapeamento (indice -> taskId)
          (ctx.scene.session as any).tasksToComplete = groupTasks;

          let msg = 'Selecione o número da tarefa que deseja marcar como concluída:\n\n';
          groupTasks.forEach((task, index) => {
            msg += `<b>${index + 1}</b> - ${task.description}\n`;
          });

          await ctx.reply(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancelar', 'cancel')]]) });
          return ctx.wizard.next();

        } catch (e) {
          console.error('Erro ao listar tarefas do grupo', e);
          await ctx.reply('Erro ao carregar as tarefas da lista.');
          return ctx.scene.leave();
        }
      }
    }
    return;
  },
  async (ctx: BotContext) => {
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery && ctx.callbackQuery.data === 'cancel') {
        await ctx.answerCbQuery().catch(() => {});
        await ctx.reply('❌ Operação cancelada.', { ...menuKeyboard });
        return ctx.scene.leave();
    }

    if (!ctx.message || !('text' in ctx.message)) return;
    const text = ctx.message.text.trim();
    
    const index = parseInt(text) - 1;
    const groupTasks = (ctx.scene.session as any).tasksToComplete || [];

    if (isNaN(index) || index < 0 || index >= groupTasks.length) {
      await ctx.reply('⚠️ Número inválido. Digite um dos números da lista acima, ou cancele a operação.', {
        ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancelar', 'cancel')]])
      });
      return; 
    }

    const taskToComplete = groupTasks[index];

    try {
      const userId = await getDbUserId(ctx.from?.id);
      if (!userId) return ctx.scene.leave();

      await botApi.completeTask(userId, taskToComplete.id);
      await ctx.reply(`🎉 Fantástico! A tarefa <b>"${taskToComplete.description}"</b> foi marcada como concluída!`, { parse_mode: 'HTML', ...menuKeyboard });
    } catch (error) {
      console.error('Erro ao concluir tarefa via wizard:', error);
      await ctx.reply('Ocorreu um erro ao concluir a tarefa.', { ...menuKeyboard });
    }

    return ctx.scene.leave();
  }
);
