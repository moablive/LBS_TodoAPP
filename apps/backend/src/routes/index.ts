import { Router } from 'express';
import { tasksRouter } from './tasks.js';
import { groupsRouter } from './groups.js';
import { userRouter } from './user.js';
import { pushRouter } from './push.js';
import { remindersRouter } from './reminders.js';
import { prefsRouter } from './prefs.js';
import { integrationsRouter } from './integrations.js';
import { calendarsRouter } from './calendars.js';
import { botRouter } from './bot.js';
import { telegramRouter, telegramBotRouter } from './telegram.js';
import { requireAuth, requireBotKey } from '../middleware/auth.js';
import { db } from '@todoapp/db';
import { schema } from '@todoapp/db';
import { eq } from 'drizzle-orm';

export const apiRouter = Router();

// O proxy `POST /auth/login` foi removido: o frontend fala direto com o
// LoginHUB pelo auth-kit (`lib/hubAuthClient.ts`), e a CORS do hub ja libera
// *.astralwavelabel.com. Repassar o login por aqui so acrescentava um salto e
// uma copia do contrato — que ficou desatualizada quando o hub passou a
// responder tres desfechos em vez de um.

import { feedRouter } from './feed.js';

apiRouter.use('/feed', feedRouter);

// O consumo do passe de vinculo entra pela MESMA guarda do resto do /bot: e o
// bot chamando com a chave de servico, nao a pessoa com sessao.
apiRouter.use('/bot', requireBotKey, telegramBotRouter);
apiRouter.use('/bot', requireBotKey, botRouter);

apiRouter.use(requireAuth);
apiRouter.use(async (req, _res, next) => {
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
apiRouter.use('/telegram', telegramRouter);
apiRouter.use('/tasks', tasksRouter);
apiRouter.use('/groups', groupsRouter);
apiRouter.use('/push', pushRouter);
apiRouter.use('/reminders', remindersRouter);
apiRouter.use('/prefs', prefsRouter);
apiRouter.use('/integrations', integrationsRouter);
apiRouter.use('/calendars', calendarsRouter);
