import { Router } from 'express';
import { db } from '@todoapp/db';
import { schema } from '@todoapp/db';
import { eq, and } from 'drizzle-orm';
import { createTaskSchema, updateTaskSchema, reorderTasksSchema } from '@todoapp/models';
import crypto from 'crypto';
import { resolveOwnerId } from '../middleware/owner-id.js';

export const tasksRouter = Router();

tasksRouter.use(resolveOwnerId);

tasksRouter.get('/', async (req, res) => {
  const ownerId = (req as any).ownerId;
  const tasks = await db.query.tasks.findMany({
    where: eq(schema.tasks.userId, ownerId),
    orderBy: (tasks, { asc, desc }) => [asc(tasks.order), desc(tasks.createdAt)],
  });
  res.json(tasks);
});

tasksRouter.post('/', async (req, res) => {
  const ownerId = (req as any).ownerId;
  const parsed = createTaskSchema.parse(req.body);
  const id = crypto.randomUUID().slice(0, 8); // match bot ID format
  
  const inserted = await db.insert(schema.tasks).values({
    id,
    userId: ownerId,
    description: parsed.description,
    scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt) : null,
    groupId: parsed.groupId || null,
    isFlagged: parsed.isFlagged || false,
    isUrgent: parsed.isUrgent || false,
    priority: parsed.priority || 'low',
    order: parsed.order || 0,
    recurrence: parsed.recurrence || null,
    details: parsed.details || null,
    durationMinutes: parsed.durationMinutes ?? null,
  }).returning();
  
  res.status(201).json(inserted[0]);
});

tasksRouter.patch('/:id', async (req, res) => {
  const ownerId = (req as any).ownerId;
  const parsed = updateTaskSchema.parse(req.body);
  
  const updates: any = {};
  if (parsed.description !== undefined) updates.description = parsed.description;
  if (parsed.scheduledAt !== undefined) updates.scheduledAt = parsed.scheduledAt ? new Date(parsed.scheduledAt) : null;
  if (parsed.groupId !== undefined) updates.groupId = parsed.groupId || null;
  if (parsed.completedAt !== undefined) updates.completedAt = parsed.completedAt ? new Date(parsed.completedAt) : null;
  if (parsed.isFlagged !== undefined) updates.isFlagged = parsed.isFlagged;
  if (parsed.isUrgent !== undefined) updates.isUrgent = parsed.isUrgent;
  if (parsed.priority !== undefined) updates.priority = parsed.priority;
  if (parsed.order !== undefined) updates.order = parsed.order;
  if (parsed.recurrence !== undefined) updates.recurrence = parsed.recurrence || null;
  if (parsed.details !== undefined) updates.details = parsed.details || null;
  if (parsed.durationMinutes !== undefined) updates.durationMinutes = parsed.durationMinutes ?? null;

  const updated = await db.update(schema.tasks)
    .set(updates)
    .where(and(eq(schema.tasks.id, req.params.id), eq(schema.tasks.userId, ownerId)))
    .returning();
    
  if (!updated.length) return res.status(404).json({ error: 'not_found' });
  res.json(updated[0]);
});

tasksRouter.delete('/:id', async (req, res) => {
  const ownerId = (req as any).ownerId;

  // Tarefa espelhada de um calendário externo: registra a lápide antes, senão
  // a próxima sync a recria (o evento continua no feed).
  const task = await db.query.tasks.findFirst({
    where: and(eq(schema.tasks.id, req.params.id), eq(schema.tasks.userId, ownerId)),
  });
  if (task?.calendarId && task.externalUid) {
    await db.insert(schema.calendarIgnoredEvents)
      .values({ calendarId: task.calendarId, externalUid: task.externalUid })
      .onConflictDoNothing();
  }

  await db.delete(schema.tasks)
    .where(and(eq(schema.tasks.id, req.params.id), eq(schema.tasks.userId, ownerId)));
  res.status(204).send();
});

tasksRouter.post('/reorder', async (req, res) => {
  const ownerId = (req as any).ownerId;
  const parsed = reorderTasksSchema.parse(req.body);
  
  await db.transaction(async (tx) => {
    let order = 0;
    for (const taskId of parsed.taskIds) {
      await tx.update(schema.tasks)
        .set({ order })
        .where(and(
          eq(schema.tasks.id, taskId),
          eq(schema.tasks.userId, ownerId)
        ));
      order++;
    }
  });

  res.status(204).send();
});
