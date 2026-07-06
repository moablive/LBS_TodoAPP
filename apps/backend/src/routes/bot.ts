import { Router } from 'express';
import { db } from '@todoapp/db';
import { schema } from '@todoapp/db';
import { eq } from 'drizzle-orm';

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
