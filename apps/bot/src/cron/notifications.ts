import cron from 'node-cron';
import { Telegraf } from 'telegraf';
import { botApi } from '@todo/api-client';
import type { BotContext } from '../context.js';
import { isNotificationEnabled } from '../utils/user-cache.js';
import { sendPushToUser } from '../utils/push.js';

// ── helpers ────────────────────────────────────────────────────────────────

const escHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');



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

// Helper para verificar se a tarefa ocorre no dia alvo
function occursToday(base: Date, recurrence: string | null | undefined, today: Date): boolean {
  if (!recurrence) {
    return base.getFullYear() === today.getFullYear() &&
           base.getMonth() === today.getMonth() &&
           base.getDate() === today.getDate();
  }
  
  const baseDay = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const targetDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (targetDay.getTime() < baseDay.getTime()) return false;

  switch (recurrence) {
    case 'daily':   return true;
    case 'weekdays': return today.getDay() >= 1 && today.getDay() <= 5;
    case 'weekly':  return base.getDay() === today.getDay();
    case 'monthly': return base.getDate() === today.getDate();
    case 'yearly':  return base.getDate() === today.getDate() && base.getMonth() === today.getMonth();
    default:        return baseDay.getTime() === targetDay.getTime();
  }
}

export const sendUserMorningGreeting = async (bot: Telegraf<BotContext>, user: any, tasks: any[], settings: any) => {
  if (!isNotificationEnabled(String(user.telegramId))) return;

  try {
    const now = new Date();
    const todayTasks = tasks.filter(t => {
      if (!t.scheduledAt) return false;
      return occursToday(new Date(t.scheduledAt), t.recurrence, now);
    });

    const todayStr = now.toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long'
    });
    const todayNum = now.toLocaleDateString('pt-BR');
    const today = `${todayNum} - ${todayStr}`;
    
    const name = settings.displayName?.trim() ? escHtml(settings.displayName.trim()) : 'Patrão';
    let msg = `☀️ <b>Bom dia, ${name}!</b>\n`;
    msg += `📅 ${today}\n\n`;

    if (todayTasks.length === 0) {
      msg += `✅ Nenhuma tarefa agendada para hoje. Aproveite o dia! 🎉`;
    } else {
      msg += `🔴 <b>Tarefas do Dia (${todayTasks.length})</b>\n`;
      for (const t of todayTasks) {
        msg += `▫️ ${t.description}`;
        if (t.scheduledAt) {
           const occ = new Date(t.scheduledAt);
           occ.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
           msg += ` (⏰ ${occ.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})`;
           if (t.recurrence) msg += ' 🔁';
        }
        if (t.groupName) msg += ` <i>[${t.groupName}]</i>`;
        msg += '\n';
      }
    }

    if (settings.notifyTelegram) {
      await bot.telegram.sendMessage(user.telegramId, msg, { parse_mode: 'HTML' });
      console.log(`☀️ Bom dia enviado para ${user.telegramId}`);
    }
  } catch (err) {
    console.error(`Erro ao enviar bom dia para ${user.id}:`, err);
  }
};

// ── Resumos da tarde e noite ───────────────────────────────────────────────────

export const sendUserDailySummary = async (bot: Telegraf<BotContext>, user: any, tasks: any[], settings: any, label: string) => {
  if (!isNotificationEnabled(String(user.telegramId))) return;

  try {
    // Se "Somente tarefas do dia" estiver ligado, filtra apenas as de hoje
    let filteredTasks = tasks;
    if (settings.digestTodayOnly) {
      const now = new Date();
      filteredTasks = tasks.filter(t => {
        if (!t.scheduledAt) return false;
        return occursToday(new Date(t.scheduledAt), t.recurrence, now);
      });
    }

    if (filteredTasks.length === 0) return;

    const highTasks   = filteredTasks.filter(t => t.priority === 'high');
    const mediumTasks = filteredTasks.filter(t => t.priority === 'medium');
    const lowTasks    = filteredTasks.filter(t => t.priority === 'low' || !t.priority);

    const periodLabel = settings.digestTodayOnly ? ' (apenas hoje)' : '';
    let msg = `📋 <b>${label}</b>${periodLabel}\n`;
    msg += `Total de tarefas pendentes: <b>${filteredTasks.length}</b>\n\n`;
    msg += buildSection('Prioridade Alta', highTasks, '🔴');
    msg += buildSection('Prioridade Média', mediumTasks, '🟡');
    msg += buildSection('Prioridade Baixa', lowTasks, '🟢');

    if (settings.notifyTelegram) {
      await bot.telegram.sendMessage(user.telegramId, msg, { parse_mode: 'HTML' });
      console.log(`📋 Resumo "${label}" enviado para ${user.telegramId}`);
    }
  } catch (err) {
    console.error(`Erro ao enviar resumo para ${user.id}:`, err);
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
    case 'weekdays': return target.getDay() >= 1 && target.getDay() <= 5;
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
          let tasks = await botApi.listTasks(user.id);

          // Filtrar por período (somente do dia)
          if (settings.notificationPeriod === 'today') {
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(now);
            todayEnd.setHours(23, 59, 59, 999);
            tasks = tasks.filter(t => {
              if (!t.scheduledAt) return false;
              const d = new Date(t.scheduledAt);
              return d >= todayStart && d <= todayEnd;
            });
          }

          // Filtrar por categoria
          if (settings.notificationStyle === 'category' && settings.notifiedCategories?.length) {
            tasks = tasks.filter(t => t.groupId && settings.notifiedCategories.includes(t.groupId));
          }

          // Filtrar por prioridade
          if (settings.notificationStyle === 'priority' && settings.notifiedPriorities?.length) {
            tasks = tasks.filter(t => t.priority && settings.notifiedPriorities.includes(t.priority as any));
          }

          // Resumos diários (verifica apenas o horário local no formato HH:MM)
          const nowStr = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
          // Dia corrente em São Paulo, no formato YYYY-MM-DD ('en-CA' devolve
          // ISO). Entra no `eventId` do LBS Notify junto com `nowStr`: só a
          // hora não basta, porque 08:00 se repete todo dia e o Notify trataria
          // o lembrete de amanhã como duplicata do de hoje — a pessoa pararia
          // de receber a partir do segundo dia.
          const nowDay = now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
          
          if (settings.morningDigestEnabled && settings.morningDigestTime === nowStr) {
             await sendUserMorningGreeting(bot, user, tasks, settings);
          }
          if (settings.afternoonDigestEnabled && settings.afternoonDigestTime === nowStr) {
             await sendUserDailySummary(bot, user, tasks, settings, 'Resumo da Tarde ☀️');
          }
          if (settings.nightDigestEnabled && settings.nightDigestTime === nowStr) {
             await sendUserDailySummary(bot, user, tasks, settings, 'Resumo da Noite 🌙');
          }

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
            const skipDaysReminder = t.recurrence === 'daily' || t.recurrence === 'weekdays' || t.recurrence === 'weekly';
            if (settings.remindDaysEnabled && !skipDaysReminder && occursAt(s, t.recurrence, daysTarget)) dueInDays.push(t);
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
            await sendPushToUser(
              user.id,
              {
                title: '⏰ Lembrete de Tarefa',
                body: pushLines.join('\n'),
                url: '/',
              },
              {
                type: 'todo.reminder',
                // Id ESTÁVEL: usuário + o minuto do disparo. Este cron roda a
                // cada minuto e o conjunto de tarefas vencendo é o mesmo dentro
                // do minuto, então um restart do bot no meio da execução não
                // manda o lembrete duas vezes — o LBS Notify reconhece o
                // `eventId` repetido e devolve `duplicated`. Um `Date.now()`
                // aqui devolveria um id novo e desligaria a idempotência.
                eventId: `todo:reminder:${user.id}:${nowDay}T${nowStr}`,
              },
            );
          }
        } catch (uErr) {
          console.error(`Erro ao processar lembrete para ${user.id}:`, uErr);
        }
      }
    } catch (err) {
      console.error('Erro no cron de lembretes:', err);
    }
  });

  console.log('✅ Cron: lembretes por minuto (horário / antes / dias antes) via Telegram + Push, além dos resumos diários configurados pelo usuário.');
}
