import cron from 'node-cron';
import { Telegraf } from 'telegraf';
import { botApi } from '@todo/api-client';
import type { BotContext } from '../context.js';
import { isNotificationEnabled } from '../utils/user-cache.js';

export const sendDailySummary = async (bot: Telegraf<BotContext>) => {
  try {
    const users = await botApi.getAllBotUsers();
    if (!users || users.length === 0) return;

    for (const user of users) {
      if (!user.telegramId) continue;
      if (!isNotificationEnabled(String(user.telegramId))) continue;

      try {
        const tasks = await botApi.listTasks(user.id);
        if (tasks.length === 0) continue; // Não envia resumo se não houver tarefas

        const highTasks = tasks.filter(t => t.priority === 'alto');
        const mediumTasks = tasks.filter(t => t.priority === 'médio');
        const lowTasks = tasks.filter(t => t.priority === 'baixo');

        const buildSection = (title: string, taskList: any[], icon: string) => {
          let sectionText = `${icon} <b>${title}</b>\n`;
          if (taskList.length === 0) {
            sectionText += `<i>Nenhuma tarefa.</i>\n\n`;
          } else {
            for (const t of taskList) {
              sectionText += `▫️ ${t.description}`;
              if (t.scheduledAt) {
                 sectionText += ` (⏰ ${new Date(t.scheduledAt).toLocaleString('pt-BR')})`;
              }
              sectionText += '\n';
            }
            sectionText += '\n';
          }
          return sectionText;
        };

        let msgText = `📋 <b>Resumo Diário de Tarefas</b> 📋\nAqui estão suas tarefas ativas para programar seu dia:\n\n`;
        msgText += buildSection('Prioridade Alta', highTasks, '🔴');
        msgText += buildSection('Prioridade Média', mediumTasks, '🟡');
        msgText += buildSection('Prioridade Baixa', lowTasks, '🟢');

        await bot.telegram.sendMessage(user.telegramId, msgText, { parse_mode: 'HTML' });

        console.log(`✅ Resumos de tarefas enviados para ${user.telegramId}`);

      } catch (uErr) {
        console.error(`Erro ao processar resumo para usuário ${user.id}:`, uErr);
      }
    }
  } catch (err) {
    console.error('Erro ao enviar resumo:', err);
  }
};

export function startNotificationsCron(bot: Telegraf<BotContext>) {
  // Roda a cada minuto para verificar tarefas que atingiram a data/hora
  cron.schedule('* * * * *', async () => {
    try {
      const users = await botApi.getAllBotUsers();
      if (!users || users.length === 0) return;

      const now = new Date();

      for (const user of users) {
        if (!user.telegramId) continue;
        if (!isNotificationEnabled(String(user.telegramId))) continue;

        try {
          // A API client no backend cuidaria do filtro de data. 
          // O bot pega as tarefas ativas do usuário
          const tasks = await botApi.listTasks(user.id);

          const dueTasks = tasks.filter(t => {
            if (!t.scheduledAt) return false;
            const scheduledTime = new Date(t.scheduledAt);
            // Verifica se a tarefa venceu (<= agora) e nós podemos notificar
            // Em um sistema real o backend marcaria como 'notificada' para não repetir
            // Aqui fazemos uma checagem simples de minuto (no mesmo minuto)
            return scheduledTime.getFullYear() === now.getFullYear() &&
                   scheduledTime.getMonth() === now.getMonth() &&
                   scheduledTime.getDate() === now.getDate() &&
                   scheduledTime.getHours() === now.getHours() &&
                   scheduledTime.getMinutes() === now.getMinutes();
          });

          if (dueTasks.length === 0) continue;

          let msgText = `⏰ <b>Lembrete de Tarefas</b> ⏰\n\n`;

          for (const t of dueTasks) {
            const dt = new Date(t.scheduledAt!);
            const formattedDate = dt.toLocaleString('pt-BR');
            msgText += `- ${t.description} (ID: ${t.id}) - 📅 ${formattedDate}\n`;
          }

          await bot.telegram.sendMessage(user.telegramId, msgText, { parse_mode: 'HTML' });
          console.log(`✅ Notificação Telegram enviada para ${user.telegramId}`);

        } catch (uErr) {
          console.error(`Erro ao processar notificações para usuário ${user.id}:`, uErr);
        }
      }
    } catch (err) {
      console.error('Erro no Cron Job de Notificações:', err);
    }
  });

  // Resumo de Tarefas às 08:00 e 13:00 (Fuso horário de SP)
  cron.schedule('0 8,13 * * *', async () => {
    await sendDailySummary(bot);
  }, {
    timezone: "America/Sao_Paulo"
  });

  console.log('✅ Cron Job de Notificações e Resumos Diários agendados.');
}
