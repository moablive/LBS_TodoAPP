import { Router } from 'express';
import { db, schema } from '@todoapp/db';
import { eq } from 'drizzle-orm';
import {
  defaultReminderSettings,
  reminderSettingsSchema,
  updateReminderSettingsSchema,
} from '@todoapp/models';
import { resolveOwnerId } from '../middleware/owner-id.js';

export const remindersRouter = Router();

remindersRouter.use(resolveOwnerId);

remindersRouter.get('/', async (req, res) => {
  const row = await db.query.reminderSettings.findFirst({
    where: eq(schema.reminderSettings.userId, req.ownerId!),
  });
  res.json(row ? reminderSettingsSchema.parse(row) : defaultReminderSettings);
});

remindersRouter.patch('/', async (req, res) => {
  const parsed = updateReminderSettingsSchema.parse(req.body);
  const userId = req.ownerId!;

  const [row] = await db
    .insert(schema.reminderSettings)
    .values({ userId, ...defaultReminderSettings, ...parsed })
    .onConflictDoUpdate({
      target: schema.reminderSettings.userId,
      set: { ...parsed, updatedAt: new Date() },
    })
    .returning();

  res.json(reminderSettingsSchema.parse(row));
});
