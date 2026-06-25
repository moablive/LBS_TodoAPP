import { Router } from 'express';
import { tasksRouter } from './tasks.js';
import { groupsRouter } from './groups.js';
import { userRouter } from './user.js';
import { requireAuth } from '../middleware/auth.js';
import { db } from '@todoapp/db';
import { schema } from '@todoapp/db';
import { eq } from 'drizzle-orm';

export const apiRouter = Router();

apiRouter.use('/auth', async (req, res) => {
  // dummy login for loginhub just to ensure user exists
  res.json({ ok: true });
});

apiRouter.use(requireAuth);
apiRouter.use(async (req, res, next) => {
  // auto-create user_settings if not exists
  if (req.user) {
    const existing = await db.query.userSettings.findFirst({
      where: eq(schema.userSettings.loginhubId, req.user.id),
    });
    if (!existing) {
      await db.insert(schema.userSettings).values({ loginhubId: req.user.id }).onConflictDoNothing();
    }
  }
  next();
});

apiRouter.use('/user', userRouter);
apiRouter.use('/tasks', tasksRouter);
apiRouter.use('/groups', groupsRouter);
