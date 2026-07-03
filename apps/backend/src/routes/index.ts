import { Router } from 'express';
import { tasksRouter } from './tasks.js';
import { groupsRouter } from './groups.js';
import { userRouter } from './user.js';
import { pushRouter } from './push.js';
import { remindersRouter } from './reminders.js';
import { prefsRouter } from './prefs.js';
import { requireAuth } from '../middleware/auth.js';
import { db } from '@todoapp/db';
import { schema } from '@todoapp/db';
import { eq } from 'drizzle-orm';

export const apiRouter = Router();

apiRouter.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }
  
  try {
    const loginhubUrl = process.env.VITE_LOGINHUB_API_URL || process.env.LOGINHUB_API_URL || 'https://api-auth.astralwavelabel.com/api';
    const response = await fetch(`${loginhubUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, app_id: Number(process.env.LOGINHUB_APP_ID) || 4 })
    });
    
    const data = await response.json();
    if (!response.ok) {
       return res.status(response.status).json(data);
    }
    
    return res.json(data);
  } catch (error) {
    console.error('Erro no proxy de auth:', error);
    return res.status(500).json({ error: 'Erro ao conectar ao LoginHUB' });
  }
});

apiRouter.use(requireAuth);
apiRouter.use(async (req, res, next) => {
  // auto-create user_settings if not exists
  if (req.user) {
    const existing = await db.query.userSettings.findFirst({
      where: eq(schema.userSettings.loginhubId, req.user.loginhubId),
    });
    if (!existing) {
      await db.insert(schema.userSettings).values({ loginhubId: req.user.loginhubId }).onConflictDoNothing();
    }
  }
  next();
});

apiRouter.use('/user', userRouter);
apiRouter.use('/tasks', tasksRouter);
apiRouter.use('/groups', groupsRouter);
apiRouter.use('/push', pushRouter);
apiRouter.use('/reminders', remindersRouter);
apiRouter.use('/prefs', prefsRouter);
