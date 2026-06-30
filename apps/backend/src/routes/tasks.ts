import { Router } from 'express';
import { db } from '@todoapp/db';
import { schema } from '@todoapp/db';
import { eq, and } from 'drizzle-orm';
import { createTaskSchema, updateTaskSchema, reorderTasksSchema } from '@todoapp/models';
import crypto from 'crypto';

export const tasksRouter = Router();

// Middleware to ensure user has telegramId linked and pass it as req.telegramId
tasksRouter.use(async (req, _res, next) => {
  const user = await db.query.userSettings.findFirst({
    where: eq(schema.userSettings.loginhubId, req.user!.loginhubId),
  });
  if (!user || !user.telegramId) {
    // Fallback to the known telegram ID if none is linked yet
    (req as any).telegramId = '442697753';
  } else {
    (req as any).telegramId = user.telegramId;
  }
  next();
});

tasksRouter.get('/', async (req, res) => {
  const telegramId = (req as any).telegramId;
  const tasks = await db.query.tasks.findMany({
    where: eq(schema.tasks.userId, telegramId),
    orderBy: (tasks, { asc, desc }) => [asc(tasks.order), desc(tasks.createdAt)],
  });
  res.json(tasks);
});

tasksRouter.post('/', async (req, res) => {
  const telegramId = (req as any).telegramId;
  const parsed = createTaskSchema.parse(req.body);
  const id = crypto.randomUUID().slice(0, 8); // match bot ID format
  
  const inserted = await db.insert(schema.tasks).values({
    id,
    userId: telegramId,
    description: parsed.description,
    scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt) : null,
    groupId: parsed.groupId || null,
    isFlagged: parsed.isFlagged || false,
    isUrgent: parsed.isUrgent || false,
    order: parsed.order || 0,
  }).returning();
  
  res.status(201).json(inserted[0]);
});

tasksRouter.patch('/:id', async (req, res) => {
  const telegramId = (req as any).telegramId;
  const parsed = updateTaskSchema.parse(req.body);
  
  const updates: any = {};
  if (parsed.description !== undefined) updates.description = parsed.description;
  if (parsed.scheduledAt !== undefined) updates.scheduledAt = parsed.scheduledAt ? new Date(parsed.scheduledAt) : null;
  if (parsed.groupId !== undefined) updates.groupId = parsed.groupId || null;
  if (parsed.completedAt !== undefined) updates.completedAt = parsed.completedAt ? new Date(parsed.completedAt) : null;
  if (parsed.isFlagged !== undefined) updates.isFlagged = parsed.isFlagged;
  if (parsed.isUrgent !== undefined) updates.isUrgent = parsed.isUrgent;
  if (parsed.order !== undefined) updates.order = parsed.order;

  const updated = await db.update(schema.tasks)
    .set(updates)
    .where(and(eq(schema.tasks.id, req.params.id), eq(schema.tasks.userId, telegramId)))
    .returning();
    
  if (!updated.length) return res.status(404).json({ error: 'not_found' });
  res.json(updated[0]);
});

tasksRouter.delete('/:id', async (req, res) => {
  const telegramId = (req as any).telegramId;
  await db.delete(schema.tasks)
    .where(and(eq(schema.tasks.id, req.params.id), eq(schema.tasks.userId, telegramId)));
  res.status(204).send();
});

tasksRouter.post('/reorder', async (req, res) => {
  const telegramId = (req as any).telegramId;
  const parsed = reorderTasksSchema.parse(req.body);
  
  await db.transaction(async (tx) => {
    let order = 0;
    for (const taskId of parsed.taskIds) {
      await tx.update(schema.tasks)
        .set({ order })
        .where(and(
          eq(schema.tasks.id, taskId),
          eq(schema.tasks.userId, telegramId)
        ));
      order++;
    }
  });

  res.status(204).send();
});
