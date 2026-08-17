import { db, schema } from '@todoapp/db';
import { and, eq, gte, isNotNull } from 'drizzle-orm';
import * as ics from 'ics';
import { env } from '@todoapp/services';

/**
 * Gera um feed ICS (.ics) contendo as tarefas agendadas do usuário.
 * Para manter o feed leve e rápido, incluímos apenas tarefas agendadas e
 * limitamos as tarefas passadas aos últimos 30 dias.
 */
export async function generateUserIcsFeed(userId: string): Promise<string> {
  const past30Days = new Date();
  past30Days.setDate(past30Days.getDate() - 30);

  const userTasks = await db.query.tasks.findMany({
    where: and(
      eq(schema.tasks.userId, userId),
      isNotNull(schema.tasks.scheduledAt),
      gte(schema.tasks.scheduledAt, past30Days)
    )
  });

  const events: ics.EventAttributes[] = userTasks.map(task => {
    const start = task.scheduledAt!;
    
    // Convert Date to [year, month, day, hour, minute] for ICS
    // ics library expects 1-indexed months
    const startArray: ics.DateArray = [
      start.getFullYear(),
      start.getMonth() + 1,
      start.getDate(),
      start.getHours(),
      start.getMinutes()
    ];

    const durationMinutes = task.durationMinutes || 60; // Padrão 1 hora

    return {
      title: task.description,
      description: task.details || '',
      start: startArray,
      duration: { minutes: durationMinutes },
      uid: task.id,
      status: task.completedAt ? 'CONFIRMED' : 'TENTATIVE', // Opcional, apenas semântico
      // url: env.VITE_APP_URL ? `${env.VITE_APP_URL}` : undefined // Poderíamos ter link de volta
    };
  });

  if (events.length === 0) {
    // ics fails if array is empty, we must return an empty calendar string manually
    return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//TodoAPP//Calendar Export//PT-BR\r\nEND:VCALENDAR\r\n';
  }

  const { error, value } = ics.createEvents(events);
  if (error || !value) {
    throw new Error('Falha ao gerar o feed ICS');
  }

  return value;
}
