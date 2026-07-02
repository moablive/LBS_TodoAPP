import { Scenes, Markup } from 'telegraf';
import type { BotContext } from '../context.js';
import { getDbUserId } from '../utils/user-cache.js';
import { botApi } from '@todo/api-client';
import { menuKeyboard } from '../ui/menu.js';

export const addGroupWizard = new Scenes.WizardScene<BotContext>(
  'ADD_GROUP_WIZARD',
  async (ctx: BotContext) => {
    await ctx.reply(
      '📁 <b>Nova Lista</b>\n\nPor favor, digite o nome da lista:',
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
    const name = ctx.message.text.trim();

    try {
      const userId = await getDbUserId(ctx.from?.id);
      if (!userId) {
        await ctx.reply('Usuário não encontrado.');
        return ctx.scene.leave();
      }

      const group = await botApi.createGroup(userId, name);
      await ctx.reply(`✅ Lista <b>${group.name}</b> criada com sucesso!`, { 
        parse_mode: 'HTML',
        ...menuKeyboard
      });
    } catch (error) {
      console.error('Erro ao criar lista via wizard:', error);
      await ctx.reply('Ocorreu um erro ao criar a lista.', { ...menuKeyboard });
    }

    return ctx.scene.leave();
  }
);
