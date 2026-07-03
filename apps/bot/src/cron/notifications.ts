import cron from 'node-cron';
import { Telegraf } from 'telegraf';
import { botApi } from '@todo/api-client';
import type { BotContext } from '../context.js';
import { isNotificationEnabled } from '../utils/user-cache.js';
import { sendPushToUser } from '../utils/push.js';

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
        const priorityTasks = tasks.filter(t => t.priority === 'high');

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

        const highTasks   = tasks.filter(t => t.priority === 'high');
        const mediumTasks = tasks.filter(t => t.priority === 'medium');
        const lowTasks    = tasks.filter(t => t.priority === 'low');

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

// Um lembrete dispara quando o "gatilho" (horário da tarefa menos o offset)
// cai exatamente no minuto atual — mesma estratégia do cron antigo, agora com
// três gatilhos por tarefa: no horário, X minutos antes e X dias antes.
function isSameMinute(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()     &&
         a.getHours()    === b.getHours()    &&
         a.getMinutes()  === b.getMinutes();
}

// Tarefas recorrentes (estilo Google Calendar): `scheduledAt` é a primeira
// ocorrência e a regra gera as seguintes. Testa se `target` cai numa ocorrência.
function occursAt(base: Date, recurrence: string | null | undefined, target: Date): boolean {
  if (!recurrence) return isSameMinute(base, target);
  if (target.getTime() < base.getTime() - 59_000) return false; // antes da 1ª ocorrência
  if (base.getHours() !== target.getHours() || base.getMinutes() !== target.getMinutes()) return false;
  switch (recurrence) {
    case 'daily':   return true;
    case 'weekly':  return base.getDay() === target.getDay();
    case 'monthly': return base.getDate() === target.getDate();
    case 'yearly':  return base.getDate() === target.getDate() && base.getMonth() === target.getMonth();
    default:        return isSameMinute(base, target);
  }
}

export function startNotificationsCron(bot: Telegraf<BotContext>) {

  // Cada minuto — lembretes de tarefas com data (no horário / 30min antes / 7d antes)
  cron.schedule('* * * * *', async () => {
    try {
      const users = await botApi.getAllBotUsers();
      if (!users || users.length === 0) return;

      const now = new Date();

      for (const user of users) {
        if (!user.telegramId) continue;

        try {
          const settings = await botApi.getReminderSettings(user.id);
          const tasks = await botApi.listTasks(user.id);

          const dueNow: typeof tasks = [];
          const dueSoon: typeof tasks = [];
          const dueInDays: typeof tasks = [];

          // "X antes do evento" ⇔ o evento ocorre em (agora + X) — assim a
          // mesma checagem de ocorrência serve para tarefas únicas e recorrentes.
          const beforeTarget = new Date(now.getTime() + settings.remindBeforeMinutes * 60_000);
          const daysTarget   = new Date(now.getTime() + settings.remindDaysBefore * 86_400_000);

          for (const t of tasks) {
            if (!t.scheduledAt) continue;
            const s = new Date(t.scheduledAt);

            if (settings.remindAtTime && occursAt(s, t.recurrence, now)) dueNow.push(t);
            if (settings.remindBeforeEnabled && occursAt(s, t.recurrence, beforeTarget)) dueSoon.push(t);
            if (settings.remindDaysEnabled && occursAt(s, t.recurrence, daysTarget)) dueInDays.push(t);
          }

          if (dueNow.length === 0 && dueSoon.length === 0 && dueInDays.length === 0) continue;

          // Para recorrentes, a data exibida é a da OCORRÊNCIA (= alvo do
          // gatilho), não a primeira data agendada.
          const fmt = (t: any, when: Date) => {
            const occurrence = t.recurrence ? when : new Date(t.scheduledAt!);
            let line = `▫️ ${t.description} — 📅 ${occurrence.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;
            if (t.recurrence) line += ' 🔁';
            if (t.groupName) line += ` <i>[${t.groupName}]</i>`;
            return line;
          };

          let msg = '';
          const pushLines: string[] = [];
          if (dueNow.length) {
            msg += `⏰ <b>É agora!</b>\n${dueNow.map(t => fmt(t, now)).join('\n')}\n\n`;
            pushLines.push(`⏰ Agora: ${dueNow.map(t => t.description).join(', ')}`);
          }
          if (dueSoon.length) {
            msg += `🔜 <b>Em ${settings.remindBeforeMinutes} minutos</b>\n${dueSoon.map(t => fmt(t, beforeTarget)).join('\n')}\n\n`;
            pushLines.push(`🔜 Em ${settings.remindBeforeMinutes}min: ${dueSoon.map(t => t.description).join(', ')}`);
          }
          if (dueInDays.length) {
            msg += `📅 <b>Faltam ${settings.remindDaysBefore} dias</b>\n${dueInDays.map(t => fmt(t, daysTarget)).join('\n')}\n\n`;
            pushLines.push(`📅 Em ${settings.remindDaysBefore} dias: ${dueInDays.map(t => t.description).join(', ')}`);
          }

          if (settings.notifyTelegram && isNotificationEnabled(String(user.telegramId))) {
            await bot.telegram.sendMessage(user.telegramId, msg.trimEnd(), { parse_mode: 'HTML' });
            console.log(`⏰ Lembrete (telegram) enviado para ${user.telegramId}`);
          }

          if (settings.notifyPush) {
            await sendPushToUser(user.id, {
              title: '⏰ Lembrete de Tarefa',
              body: pushLines.join('\n'),
              url: '/',
            });
          }
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

  console.log('✅ Crons: 08h (bom dia + prioridades), 09h (resumo completo), 13h (tarde), lembretes por minuto (horário / antes / dias antes) via Telegram + Push.');
}
