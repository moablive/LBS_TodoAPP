import cron from 'node-cron';
import { Telegraf } from 'telegraf';
import { botApi } from '@todo/api-client';
import type { BotContext } from '../context.js';
import { isNotificationEnabled } from '../utils/user-cache.js';

// ── helpers ────────────────────────────────────────────────────────────────

function buildSection(title: string, taskList: any[], icon: string): string {
  let s = `${icon} <b>${title}</b>\n`;
  if (taskList.length === 0) {
    s += `<i>Nenhuma tarefa.</i>\n\n`;
  } else {
    for (const t of taskList) {
      s += `▫️ ${t.description}`;
      if (t.scheduledAt) {
        s += ` (⏰ ${new Date(t.scheduledAt).toLocaleString('pt-BR')})`;
      }
      if (t.groupName) {
        s += ` <i>[${t.groupName}]</i>`;
      }
      s += '\n';
    }
    s += '\n';
  }
  return s;
}

// ── 08:00 — Bom dia + somente prioritárias (alto) ─────────────────────────

export const sendMorningGreeting = async (bot: Telegraf<BotContext>) => {
  try {
    const users = await botApi.getAllBotUsers();
    if (!users || users.length === 0) return;

    for (const user of users) {
      if (!user.telegramId) continue;
      if (!isNotificationEnabled(String(user.telegramId))) continue;

      try {
        const tasks = await botApi.listTasks(user.id);
        const priorityTasks = tasks.filter(t => t.priority === 'alto');

        const today = new Date().toLocaleDateString('pt-BR', {
          weekday: 'long', day: '2-digit', month: 'long'
        });

        let msg = `☀️ <b>Bom dia, Patrão Moab!</b>\n`;
        msg += `📅 ${today}\n\n`;

        if (priorityTasks.length === 0) {
          msg += `✅ Nenhuma tarefa prioritária hoje. Aproveite o dia! 🎉`;
        } else {
          msg += `🔴 <b>Tarefas Prioritárias do Dia (${priorityTasks.length})</b>\n`;
          for (const t of priorityTasks) {
            msg += `▫️ ${t.description}`;
            if (t.scheduledAt) {
              msg += ` (⏰ ${new Date(t.scheduledAt).toLocaleString('pt-BR')})`;
            }
            if (t.groupName) msg += ` <i>[${t.groupName}]</i>`;
            msg += '\n';
          }
        }

        await bot.telegram.sendMessage(user.telegramId, msg, { parse_mode: 'HTML' });
        console.log(`☀️ Bom dia enviado para ${user.telegramId}`);
      } catch (uErr) {
        console.error(`Erro ao enviar bom dia para ${user.id}:`, uErr);
      }
    }
  } catch (err) {
    console.error('Erro no bom dia:', err);
  }
};

// ── 09:00 e 13:00 — Resumo completo (todas as tarefas) ────────────────────

export const sendDailySummary = async (bot: Telegraf<BotContext>, label: string) => {
  try {
    const users = await botApi.getAllBotUsers();
    if (!users || users.length === 0) return;

    for (const user of users) {
      if (!user.telegramId) continue;
      if (!isNotificationEnabled(String(user.telegramId))) continue;

      try {
        const tasks = await botApi.listTasks(user.id);
        if (tasks.length === 0) continue;

        const highTasks   = tasks.filter(t => t.priority === 'alto');
        const mediumTasks = tasks.filter(t => t.priority === 'médio');
        const lowTasks    = tasks.filter(t => t.priority === 'baixo');

        let msg = `📋 <b>${label}</b>\n`;
        msg += `Total de tarefas pendentes: <b>${tasks.length}</b>\n\n`;
        msg += buildSection('Prioridade Alta', highTasks, '🔴');
        msg += buildSection('Prioridade Média', mediumTasks, '🟡');
        msg += buildSection('Prioridade Baixa', lowTasks, '🟢');

        await bot.telegram.sendMessage(user.telegramId, msg, { parse_mode: 'HTML' });
        console.log(`📋 Resumo "${label}" enviado para ${user.telegramId}`);
      } catch (uErr) {
        console.error(`Erro ao enviar resumo para ${user.id}:`, uErr);
      }
    }
  } catch (err) {
    console.error('Erro no resumo:', err);
  }
};

// ── Cron jobs ──────────────────────────────────────────────────────────────

export function startNotificationsCron(bot: Telegraf<BotContext>) {

  // Cada minuto — lembrete de tarefa com scheduledAt atingido
  cron.schedule('* * * * *', async () => {
    try {
      const users = await botApi.getAllBotUsers();
      if (!users || users.length === 0) return;

      const now = new Date();

      for (const user of users) {
        if (!user.telegramId) continue;
        if (!isNotificationEnabled(String(user.telegramId))) continue;

        try {
          const tasks = await botApi.listTasks(user.id);
          const dueTasks = tasks.filter(t => {
            if (!t.scheduledAt) return false;
            const s = new Date(t.scheduledAt);
            return s.getFullYear() === now.getFullYear() &&
                   s.getMonth()    === now.getMonth()    &&
                   s.getDate()     === now.getDate()     &&
                   s.getHours()    === now.getHours()    &&
                   s.getMinutes()  === now.getMinutes();
          });

          if (dueTasks.length === 0) continue;

          let msg = `⏰ <b>Lembrete de Tarefa</b>\n\n`;
          for (const t of dueTasks) {
            msg += `▫️ ${t.description} — 📅 ${new Date(t.scheduledAt!).toLocaleString('pt-BR')}\n`;
          }

          await bot.telegram.sendMessage(user.telegramId, msg, { parse_mode: 'HTML' });
          console.log(`⏰ Lembrete enviado para ${user.telegramId}`);
        } catch (uErr) {
          console.error(`Erro ao processar lembrete para ${user.id}:`, uErr);
        }
      }
    } catch (err) {
      console.error('Erro no cron de lembretes:', err);
    }
  });

  // 08:00 — Bom dia + somente prioritárias
  cron.schedule('0 8 * * *', async () => {
    await sendMorningGreeting(bot);
  }, { timezone: 'America/Sao_Paulo' });

  // 09:00 — Resumo completo matinal
  cron.schedule('0 9 * * *', async () => {
    await sendDailySummary(bot, 'Resumo Matinal de Tarefas 🌅');
  }, { timezone: 'America/Sao_Paulo' });

  // 13:00 — Resumo da tarde
  cron.schedule('0 13 * * *', async () => {
    await sendDailySummary(bot, 'Resumo da Tarde ☀️');
  }, { timezone: 'America/Sao_Paulo' });

  console.log('✅ Crons: 08h (bom dia + prioridades), 09h (resumo completo), 13h (tarde), lembretes por minuto.');
}
