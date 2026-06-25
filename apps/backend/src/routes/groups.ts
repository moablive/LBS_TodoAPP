import { Router } from 'express';
import { db } from '@todoapp/db';
import { schema } from '@todoapp/db';
import { eq, and } from 'drizzle-orm';
import { createTaskGroupSchema, updateTaskGroupSchema } from '@todoapp/models';
import crypto from 'crypto';

export const groupsRouter = Router();

groupsRouter.use(async (req, res, next) => {
  const user = await db.query.userSettings.findFirst({
    where: eq(schema.userSettings.loginhubId, req.user!.id),
  });
  if (!user || !user.telegramId) {
    return res.status(400).json({ error: 'telegram_id_required' });
  }
  (req as any).telegramId = user.telegramId;
  next();
});

groupsRouter.get('/', async (req, res) => {
  const telegramId = (req as any).telegramId;
  const groups = await db.query.taskGroups.findMany({
    where: eq(schema.taskGroups.userId, telegramId),
    orderBy: (groups, { asc }) => [asc(groups.createdAt)],
  });
  res.json(groups);
});

groupsRouter.post('/', async (req, res) => {
  const telegramId = (req as any).telegramId;
  const parsed = createTaskGroupSchema.parse(req.body);
  const id = crypto.randomUUID().slice(0, 8);
  
  const inserted = await db.insert(schema.taskGroups).values({
    id,
    userId: telegramId,
    name: parsed.name,
  }).returning();
  
  res.status(201).json(inserted[0]);
});

groupsRouter.patch('/:id', async (req, res) => {
  const telegramId = (req as any).telegramId;
  const parsed = updateTaskGroupSchema.parse(req.body);
  
  const updated = await db.update(schema.taskGroups)
    .set({ name: parsed.name })
    .where(and(eq(schema.taskGroups.id, req.params.id), eq(schema.taskGroups.userId, telegramId)))
    .returning();
    
  if (!updated.length) return res.status(404).json({ error: 'not_found' });
  res.json(updated[0]);
});

groupsRouter.delete('/:id', async (req, res) => {
  const telegramId = (req as any).telegramId;
  await db.delete(schema.taskGroups)
    .where(and(eq(schema.taskGroups.id, req.params.id), eq(schema.taskGroups.userId, telegramId)));
  res.status(204).send();
});
