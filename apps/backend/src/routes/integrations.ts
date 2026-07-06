import { Router, Request, Response, NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '@todoapp/db';
import { env } from '@todoapp/services';
import { resolveTelegramId } from '../middleware/telegram-id.js';

export const integrationsRouter = Router();

integrationsRouter.use(resolveTelegramId);

integrationsRouter.get('/moneyapp/calendar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const telegramId = req.telegramId!;
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'Missing start or end date' });
    }

    // Buscar mapeamento
    const integration = await db.query.userIntegrations.findFirst({
      where: and(
        eq(schema.userIntegrations.telegramId, telegramId),
        eq(schema.userIntegrations.appId, 3) // MoneyAPP = 3
      )
    });

    if (!integration) {
      return res.json([]);
    }

    // Fazer chamada para o MoneyApp backend
    const moneyappUrl = `http://moneyapp_backend:3000/api/calendar?start=${start}&end=${end}`;
    
    const moneyappRes = await fetch(moneyappUrl, {
      method: 'GET',
      headers: {
        'x-api-key': env.BOT_SERVICE_KEY as string,
        'x-user-id': integration.appUserId.toString()
      }
    });

    if (!moneyappRes.ok) {
      console.error(`MoneyApp backend returned ${moneyappRes.status}`);
      return res.status(500).json({ error: 'Failed to fetch from MoneyApp' });
    }

    const data = await moneyappRes.json();
    res.json(data);
  } catch (error) {
    next(error);
  }
});
