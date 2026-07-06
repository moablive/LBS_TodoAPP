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
  res.json({ 
    kanbanLists: row?.kanbanLists ?? [],
    showMoneyAppEvents: row?.showMoneyAppEvents ?? true
  });
});

prefsRouter.patch('/', async (req, res) => {
  const parsed = updateUserPrefsSchema.parse(req.body);
  const userId = req.telegramId!;

  const setObj: any = { updatedAt: new Date() };
  if (parsed.kanbanLists !== undefined) setObj.kanbanLists = parsed.kanbanLists;
  if (parsed.showMoneyAppEvents !== undefined) setObj.showMoneyAppEvents = parsed.showMoneyAppEvents;

  const [row] = await db
    .insert(schema.userPrefs)
    .values({ 
      userId, 
      kanbanLists: parsed.kanbanLists ?? [],
      showMoneyAppEvents: parsed.showMoneyAppEvents ?? true
    })
    .onConflictDoUpdate({
      target: schema.userPrefs.userId,
      set: setObj,
    })
    .returning();

  res.json({ 
    kanbanLists: row?.kanbanLists ?? [],
    showMoneyAppEvents: row?.showMoneyAppEvents ?? true
  });
});
