import type { BotContext } from '../context.js';
import { getDbUserId } from '../utils/user-cache.js';
import { botApi } from '@todo/api-client';
import { menuKeyboard } from '../ui/menu.js';

export async function handleAddTask(ctx: BotContext) {
  try {
    const text = ('text' in (ctx.message || {})) ? (ctx.message as any).text : '';
    // Format: /add <description> [date/time]
    const args = text.replace('/add', '').trim();
    if (!args) {
      return ctx.reply('Formato inválido. Use: /add <descrição> [data/hora]');
    }

    // Split args into description and optional date
    // This is a simple regex that assumes date/time is at the end, e.g., "Buy milk 2023-12-01 10:00"
    // Or just look for a date pattern. For simplicity, we split by last occurrence of bracket or just assume simple split if provided.
    // To keep it simple: /add Buy milk 2026-06-25T10:00:00
    let description = args;
    let scheduledAt: string | undefined = undefined;
    
    // Check if the last word is a valid date (simplistic ISO check)
    const parts = args.split(' ');
    const lastPart = parts[parts.length - 1];
    if (lastPart && !isNaN(Date.parse(lastPart))) {
      scheduledAt = new Date(lastPart).toISOString();
      description = parts.slice(0, -1).join(' ');
    }

    const userId = await getDbUserId(ctx.from?.id);
    if (!userId) return;

    const task = await botApi.addTask(userId, description, scheduledAt);
    
    let msg = `✅ Tarefa criada com ID: ${task.id}\nDescrição: ${task.description}`;
    if (task.scheduledAt) {
      msg += `\nAgendada para: ${new Date(task.scheduledAt).toLocaleString('pt-BR')}`;
    }
    
    await ctx.reply(msg);
    await handleListTasks(ctx);
  } catch (error) {
    console.error('Erro ao adicionar tarefa:', error);
    await ctx.reply('Ocorreu um erro ao adicionar a tarefa.');
  }
}

export async function handleListTasks(ctx: BotContext) {
  try {
    const userId = await getDbUserId(ctx.from?.id);
    if (!userId) return;

    const groups = await botApi.listGroups(userId);
    const tasks = await botApi.listTasks(userId);
    
    if (groups.length === 0 && tasks.length === 0) {
      return ctx.reply('Nenhuma tarefa ativa ou lista criada no momento.', { ...menuKeyboard });
    }

    const grouped: Record<string, any[]> = {};
    
    // Initialize all groups with empty arrays to ensure they show up
    for (const group of groups) {
      grouped[group.name] = [];
    }

    for (const task of tasks) {
      const gName = task.groupName || '📌 Geral';
      if (!grouped[gName]) grouped[gName] = [];
      grouped[gName].push(task);
    }

    const numberEmojis = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const getEmoji = (n: number) => {
      if (n <= 10) return numberEmojis[n];
      return n.toString().split('').map(d => numberEmojis[parseInt(d)]).join('');
    };

    let msg = '📂 <b>Minhas Listas:</b>\n\n';
    
    for (const [gName, gTasks] of Object.entries(grouped)) {
      let taskCounter = 1;
      msg += `📁 <b>${gName}</b> (${gTasks.length})\n`;
      
      if (gTasks.length === 0) {
        msg += `   ▫️ <i>Vazia</i>\n`;
      } else {
        for (const task of gTasks) {
          let formattedDesc = task.description;
          if (task.description.startsWith('http')) {
            try {
              const url = new URL(task.description);
              const domain = url.hostname.replace('www.', '');
              formattedDesc = `<a href="${task.description}">🔗 Acessar Link (${domain})</a>`;
            } catch {
              // fallback if not a valid URL despite starting with http
            }
          }
          msg += `   ▫️ ${getEmoji(taskCounter)} - ${formattedDesc}`;
          if (task.scheduledAt) {
            msg += ` (⏰ ${new Date(task.scheduledAt).toLocaleString('pt-BR')})`;
          }
          msg += '\n';
          taskCounter++;
        }
      }
      msg += '\n';
    }

    await ctx.reply(msg, { parse_mode: 'HTML', ...menuKeyboard });
  } catch (error) {
    console.error('Erro ao listar tarefas:', error);
    await ctx.reply('Ocorreu um erro ao listar as tarefas.', { ...menuKeyboard });
  }
}

export async function handleRemoveTask(ctx: BotContext) {
  try {
    const text = ('text' in (ctx.message || {})) ? (ctx.message as any).text : '';
    const taskId = text.replace('/remove', '').trim();
    
    if (!taskId) {
      return ctx.reply('Por favor, informe o ID da tarefa. Ex: /remove 123');
    }

    const userId = await getDbUserId(ctx.from?.id);
    if (!userId) return;

    await botApi.removeTask(userId, taskId);
    await ctx.reply(`✅ Tarefa ${taskId} removida com sucesso.`, { ...menuKeyboard });
  } catch (error) {
    console.error('Erro ao remover tarefa:', error);
    await ctx.reply('Ocorreu um erro ao remover a tarefa.', { ...menuKeyboard });
  }
}
