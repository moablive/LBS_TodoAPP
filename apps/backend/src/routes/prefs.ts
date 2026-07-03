import { Router } from 'express';
import { db, schema } from '@todoapp/db';
import { eq } from 'drizzle-orm';
import { updateUserPrefsSchema } from '@todoapp/models';
import { resolveTelegramId } from '../middleware/telegram-id.js';

export const prefsRouter = Router();

prefsRouter.use(resolveTelegramId);

prefsRouter.get('/', async (req, res) => {
  const row = await db.query.userPrefs.findFirst({
    where: eq(schema.userPrefs.userId, req.telegramId!),
  });
  res.json({ kanbanLists: row?.kanbanLists ?? [] });
});

prefsRouter.patch('/', async (req, res) => {
  const parsed = updateUserPrefsSchema.parse(req.body);
  const userId = req.telegramId!;

  const [row] = await db
    .insert(schema.userPrefs)
    .values({ userId, kanbanLists: parsed.kanbanLists ?? [] })
    .onConflictDoUpdate({
      target: schema.userPrefs.userId,
      set: { ...(parsed.kanbanLists !== undefined ? { kanbanLists: parsed.kanbanLists } : {}), updatedAt: new Date() },
    })
    .returning();

  res.json({ kanbanLists: row?.kanbanLists ?? [] });
});
