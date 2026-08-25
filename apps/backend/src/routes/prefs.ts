import crypto from 'node:crypto';
import { Router } from 'express';
import { db, schema } from '@todoapp/db';
import { eq } from 'drizzle-orm';
import { updateUserPrefsSchema } from '@todoapp/models';
import { resolveOwnerId } from '../middleware/owner-id.js';

export const prefsRouter = Router();

prefsRouter.use(resolveOwnerId);

prefsRouter.get('/', async (req, res) => {
  let row = await db.query.userPrefs.findFirst({
    where: eq(schema.userPrefs.userId, req.ownerId!),
  });
  
  if (row && !row.icsExportToken) {
    const token = crypto.randomUUID();
    const [updated] = await db.update(schema.userPrefs)
      .set({ icsExportToken: token })
      .where(eq(schema.userPrefs.userId, req.ownerId!))
      .returning();
    row = updated;
  }

  res.json({ 
    kanbanLists: row?.kanbanLists ?? [],
    showMoneyAppEvents: row?.showMoneyAppEvents ?? true,
    moneyAppColor: row?.moneyAppColor ?? '#30d158',
    showHolidays: row?.showHolidays ?? true,
    holidayColor: row?.holidayColor ?? '#6b7280',
    icsExportToken: row?.icsExportToken ?? null
  });
});

prefsRouter.patch('/', async (req, res) => {
  const parsed = updateUserPrefsSchema.parse(req.body);
  const userId = req.ownerId!;

  const setObj: any = { updatedAt: new Date() };
  if (parsed.kanbanLists !== undefined) setObj.kanbanLists = parsed.kanbanLists;
  if (parsed.showMoneyAppEvents !== undefined) setObj.showMoneyAppEvents = parsed.showMoneyAppEvents;
  if (parsed.moneyAppColor !== undefined) setObj.moneyAppColor = parsed.moneyAppColor;
  if (parsed.showHolidays !== undefined) setObj.showHolidays = parsed.showHolidays;
  if (parsed.holidayColor !== undefined) setObj.holidayColor = parsed.holidayColor;

  const [row] = await db
    .insert(schema.userPrefs)
    .values({ 
      userId, 
      kanbanLists: parsed.kanbanLists ?? [],
      showMoneyAppEvents: parsed.showMoneyAppEvents ?? true,
      moneyAppColor: parsed.moneyAppColor ?? '#30d158',
      showHolidays: parsed.showHolidays ?? true,
      holidayColor: parsed.holidayColor ?? '#6b7280'
    })
    .onConflictDoUpdate({
      target: schema.userPrefs.userId,
      set: setObj,
    })
    .returning();

  res.json({ 
    kanbanLists: row?.kanbanLists ?? [],
    showMoneyAppEvents: row?.showMoneyAppEvents ?? true,
    moneyAppColor: row?.moneyAppColor ?? '#30d158',
    showHolidays: row?.showHolidays ?? true,
    holidayColor: row?.holidayColor ?? '#6b7280',
    icsExportToken: row?.icsExportToken ?? null
  });
});
