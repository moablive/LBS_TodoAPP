import { Scenes, Markup } from 'telegraf';
import type { BotContext } from '../context.js';
import { getDbUserId } from '../utils/user-cache.js';
import { botApi } from '@todo/api-client';
import { handleListTasks } from '../handlers/tasks.js';
import { menuKeyboard } from '../ui/menu.js';



export const addTaskWizard = new Scenes.WizardScene<BotContext>(
  'ADD_TASK_WIZARD',
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
        '📝 <b>Nova Tarefa</b>\n\nEm qual lista deseja adicionar esta tarefa?',
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
        await ctx.reply('❌ Operação cancelada.');
        return ctx.scene.leave();
      }
      if (data.startsWith('group_')) {
        await ctx.answerCbQuery().catch(() => {});
        const groupId = data.replace('group_', '');
        (ctx.scene.session as any).selectedGroupId = groupId === 'none' ? undefined : groupId;
        
        await ctx.reply(
          'Por favor, digite a descrição da tarefa:',
          { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancelar', 'cancel')]]) }
        );
        return ctx.wizard.next();
      }
    }
    return; // Wait for correct input
  },
  async (ctx: BotContext) => {
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery && ctx.callbackQuery.data === 'cancel') {
        await ctx.answerCbQuery().catch(() => {});
        await ctx.reply('❌ Operação cancelada.', { ...menuKeyboard });
        return ctx.scene.leave();
    }
    if (!ctx.message || !('text' in ctx.message)) return;
    const text = ctx.message.text;

    (ctx.scene.session as any).taskDescription = text;

    await ctx.reply(
      '📅 <b>Data (Opcional)</b>\n\nEnvie a data para a tarefa (ex: 25/12/2026, hoje, amanhã).',
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('⏭ Pular', 'skip_date')],
          [Markup.button.callback('❌ Cancelar', 'cancel')]
        ])
      }
    );
    return ctx.wizard.next();
  },
  async (ctx: BotContext) => {
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      const data = ctx.callbackQuery.data;
      if (data === 'cancel') {
        await ctx.answerCbQuery().catch(() => {});
        await ctx.reply('❌ Operação cancelada.', { ...menuKeyboard });
        return ctx.scene.leave();
      }
      if (data === 'skip_date') {
        await ctx.answerCbQuery().catch(() => {});
        return await finalizeTask(ctx, undefined);
      } else {
        return;
      }
    } else if (ctx.message && 'text' in ctx.message) {
      let text = ctx.message.text.toLowerCase().trim();
      
      let dateObj: Date | null = null;
      if (text === 'hoje') {
        dateObj = new Date();
      } else if (text === 'amanhã' || text === 'amanha') {
        dateObj = new Date();
        dateObj.setDate(dateObj.getDate() + 1);
      } else {
        const parts = text.split('/');
        if (parts.length === 2 || parts.length === 3) {
          const day = parseInt(parts[0] ?? '', 10);
          const month = parseInt(parts[1] ?? '', 10) - 1;
          const year = parts.length === 3 ? parseInt(parts[2] ?? '', 10) : new Date().getFullYear();
          dateObj = new Date(year, month, day);
        } else {
          dateObj = new Date(text);
        }
      }

      if (!dateObj || isNaN(dateObj.getTime())) {
        await ctx.reply('⚠️ Formato de data inválido. Tente novamente (ex: 25/12/2026, hoje, amanhã), ou clique em "⏭ Pular".', {
          ...Markup.inlineKeyboard([
            [Markup.button.callback('⏭ Pular', 'skip_date')],
            [Markup.button.callback('❌ Cancelar', 'cancel')]
          ])
        });
        return; 
      }
      
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      (ctx.scene.session as any).taskDate = `${year}-${month}-${day}`;

      await ctx.reply(
        '⏰ <b>Hora (Opcional)</b>\n\nEnvie a hora para a tarefa (ex: 14:30).',
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('⏭ Pular', 'skip_time')],
            [Markup.button.callback('❌ Cancelar', 'cancel')]
          ])
        }
      );
      return ctx.wizard.next();
    } else {
      return;
    }
  },
  async (ctx: BotContext) => {
    let scheduledAt: string | undefined = undefined;
    const taskDateStr = (ctx.scene.session as any).taskDate;

    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      const data = ctx.callbackQuery.data;
      if (data === 'cancel') {
        await ctx.answerCbQuery().catch(() => {});
        await ctx.reply('❌ Operação cancelada.', { ...menuKeyboard });
        return ctx.scene.leave();
      }
      if (data === 'skip_time') {
        await ctx.answerCbQuery().catch(() => {});
        // Sem hora, definir como meia-noite
        const localDate = new Date(`${taskDateStr}T00:00:00`);
        scheduledAt = localDate.toISOString();
      } else {
        return;
      }
    } else if (ctx.message && 'text' in ctx.message) {
      const text = ctx.message.text.trim();
      const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
      const match = text.match(timeRegex);
      
      if (!match) {
        await ctx.reply('⚠️ Formato de hora inválido. Tente novamente (ex: 14:30), ou clique em "⏭ Pular".', {
          ...Markup.inlineKeyboard([
            [Markup.button.callback('⏭ Pular', 'skip_time')],
            [Markup.button.callback('❌ Cancelar', 'cancel')]
          ])
        });
        return;
      }
      
      const hours = (match[1] ?? '0').padStart(2, '0');
      const minutes = match[2] ?? '00';
      
      // Assumindo fuso horário -03:00 para Brasil
      const localDate = new Date(`${taskDateStr}T${hours}:${minutes}:00-03:00`);
      if (!isNaN(localDate.getTime())) {
          scheduledAt = localDate.toISOString();
      } else {
          scheduledAt = new Date(`${taskDateStr}T${hours}:${minutes}:00`).toISOString();
      }
    } else {
      return;
    }

    return await finalizeTask(ctx, scheduledAt);
  }
);

async function finalizeTask(ctx: BotContext, scheduledAt?: string) {
  try {
    const userId = await getDbUserId(ctx.from?.id);
    if (!userId) {
      await ctx.reply('Usuário não encontrado.', { ...menuKeyboard });
      return ctx.scene.leave();
    }

    const description = (ctx.scene.session as any).taskDescription!;
    const groupId = (ctx.scene.session as any).selectedGroupId;
    const task = await botApi.addTask(userId, description, scheduledAt, groupId);
    
    let msg = `✅ <b>Tarefa adicionada com sucesso!</b>\n\n`;
    msg += `🔹 <b>ID:</b> <code>${task.id}</code>\n`;
    msg += `📝 <b>Descrição:</b> ${task.description}`;
    if (task.scheduledAt) {
      msg += `\n⏰ <b>Agendada para:</b> ${new Date(task.scheduledAt).toLocaleString('pt-BR')}`;
    }

    await ctx.reply(msg, { parse_mode: 'HTML', ...menuKeyboard });
    await ctx.scene.leave();
    await handleListTasks(ctx);
  } catch (error) {
    console.error('Erro ao adicionar tarefa via wizard:', error);
    await ctx.reply('Ocorreu um erro ao adicionar a tarefa.', { ...menuKeyboard });
    return ctx.scene.leave();
  }
}
