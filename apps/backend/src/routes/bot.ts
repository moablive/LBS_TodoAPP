import { Router } from 'express';
import { db, schema } from '@todoapp/db';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { ensureAgendaGroup } from '../calendar/sync.js';

export const botRouter = Router();

botRouter.get('/tasks', async (req, res) => {
  const { telegramId } = req.query;
  
  if (typeof telegramId !== 'string' || !telegramId) {
    return res.status(400).json({ error: 'telegramId is required' });
  }

  const tasks = await db.query.tasks.findMany({
    where: eq(schema.tasks.userId, telegramId),
    orderBy: (tasks, { asc, desc }) => [asc(tasks.order), desc(tasks.createdAt)],
  });

  return res.json(tasks);
});

botRouter.post('/calendar-events', async (req, res) => {
  try {
    const { summary, start, end, durationMinutes, description, details, externalUid, telegramId } = req.body;

    if (!summary || !start) {
      return res.status(400).json({ error: 'summary and start are required' });
    }

    let targetUserId = telegramId;
    if (!targetUserId) {
      const user = await db.query.userSettings.findFirst();
      if (user?.telegramId) {
        targetUserId = user.telegramId;
      } else if (user?.loginhubId) {
        targetUserId = String(user.loginhubId);
      } else {
        targetUserId = '1';
      }
    }

    const groupId = await ensureAgendaGroup(targetUserId, '#5b8cff');
    const scheduledAt = new Date(start);

    let calculatedDuration = durationMinutes;
    if (!calculatedDuration && end) {
      const diffMs = new Date(end).getTime() - scheduledAt.getTime();
      if (diffMs > 0) {
        calculatedDuration = Math.round(diffMs / 60000);
      }
    }
    if (!calculatedDuration) {
      calculatedDuration = 60;
    }

    const uidKey = externalUid || `mail-event-${scheduledAt.getTime()}-${summary.slice(0, 30)}`;

    const existing = await db.query.tasks.findFirst({
      where: and(
        eq(schema.tasks.userId, targetUserId),
        eq(schema.tasks.externalUid, uidKey)
      )
    });

    if (existing) {
      const updated = await db.update(schema.tasks)
        .set({
          description: summary.slice(0, 500),
          scheduledAt,
          durationMinutes: calculatedDuration,
          details: details || description || null,
        })
        .where(eq(schema.tasks.id, existing.id))
        .returning();
      return res.json({ status: 'updated', task: updated[0] });
    }

    const id = crypto.randomUUID().slice(0, 8);
    const inserted = await db.insert(schema.tasks).values({
      id,
      userId: targetUserId,
      description: summary.slice(0, 500),
      scheduledAt,
      durationMinutes: calculatedDuration,
      details: details || description || null,
      groupId,
      source: 'ics',
      externalUid: uidKey,
    }).returning();

    return res.status(201).json({ status: 'created', task: inserted[0] });
  } catch (error) {
    console.error('Error in /api/bot/calendar-events:', error);
    return res.status(500).json({ error: String(error) });
  }
});

