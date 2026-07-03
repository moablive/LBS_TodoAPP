import { Router } from 'express';
import { db } from '@todoapp/db';
import { schema } from '@todoapp/db';
import { eq, and } from 'drizzle-orm';
import { createTaskGroupSchema, updateTaskGroupSchema } from '@todoapp/models';
import crypto from 'crypto';
import { resolveTelegramId } from '../middleware/telegram-id.js';

export const groupsRouter = Router();

groupsRouter.use(resolveTelegramId);

groupsRouter.get('/', async (req, res) => {
  const telegramId = (req as any).telegramId;
  const groups = await db.query.taskGroups.findMany({
    where: eq(schema.taskGroups.userId, telegramId),
    orderBy: (groups, { asc }) => [asc(groups.order), asc(groups.createdAt)],
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
    color: parsed.color,
    icon: parsed.icon,
    order: await db.query.taskGroups.findMany({ where: eq(schema.taskGroups.userId, telegramId) }).then(res => res.length),
  }).returning();
  
  res.status(201).json(inserted[0]);
});

groupsRouter.post('/reorder', async (req, res) => {
  const telegramId = (req as any).telegramId;
  const { groupIds } = req.body;
  
  if (!Array.isArray(groupIds)) {
    return res.status(400).json({ error: 'invalid_request' });
  }

  for (let i = 0; i < groupIds.length; i++) {
    await db.update(schema.taskGroups)
      .set({ order: i })
      .where(and(eq(schema.taskGroups.id, groupIds[i]), eq(schema.taskGroups.userId, telegramId)));
  }

  res.status(200).json({ success: true });
});

groupsRouter.patch('/:id', async (req, res) => {
  const telegramId = (req as any).telegramId;
  const parsed = updateTaskGroupSchema.parse(req.body);
  
  const updateData: any = {};
  if (parsed.name !== undefined) updateData.name = parsed.name;
  if (parsed.color !== undefined) updateData.color = parsed.color;
  if (parsed.icon !== undefined) updateData.icon = parsed.icon;
  if (parsed.order !== undefined) updateData.order = parsed.order;

  const updated = await db.update(schema.taskGroups)
    .set(updateData)
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
