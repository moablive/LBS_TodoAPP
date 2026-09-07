import { Router, Request, Response, NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '@todoapp/db';
import { env } from '@todoapp/services';
import { resolveOwnerId } from '../middleware/owner-id.js';

export const integrationsRouter = Router();

integrationsRouter.use(resolveOwnerId);

/** MoneyAPP = aplicativo 3 no LoginHUB. */
const MONEYAPP_APP_ID = 3;

/** Astral Wave Label = aplicativo 8 no LoginHUB. */
const ASTRALWAVE_APP_ID = 8;

/**
 * A linha que casa a conta desta pessoa aqui com a dela no MoneyAPP.
 *
 * Ela é cadastrada uma a uma: no hub a unicidade é `(email, app_id)`, então a
 * mesma pessoa tem um id por app — e nem o e-mail precisa ser o mesmo nos dois
 * lados. Sem esta linha não há como afirmar que as duas contas são da mesma
 * pessoa, e é por isso que ninguém entra vinculado por convite.
 */
const vinculoMoneyApp = (ownerId: string) =>
  db.query.userIntegrations.findFirst({
    where: and(
      eq(schema.userIntegrations.loginhubId, ownerId),
      eq(schema.userIntegrations.appId, MONEYAPP_APP_ID)
    )
  });

/**
 * Mesma ideia do vínculo acima, agora para a Astral Wave Label.
 *
 * Vale a mesma leitura: a linha existe porque alguém a cadastrou, uma pessoa
 * por vez. Ter conta no painel do label não liga nada aqui, e ter conta aqui
 * não dá acesso a release nenhum lá — quem decide o que essa conta enxerga é a
 * própria Astral Wave, pelo `x-user-id` que mandamos.
 */
const vinculoAstralWave = (ownerId: string) =>
  db.query.userIntegrations.findFirst({
    where: and(
      eq(schema.userIntegrations.loginhubId, ownerId),
      eq(schema.userIntegrations.appId, ASTRALWAVE_APP_ID)
    )
  });

/**
 * Esta pessoa tem o vínculo com o MoneyAPP?
 *
 * A tela precisa saber ANTES de desenhar. Sem isto o TodoAPP oferecia a camada
 * do MoneyAPP a todo mundo — chip no calendário e ajuste em Preferências — e
 * respondia lista vazia para quem não tem MoneyAPP: botão morto, e a promessa
 * de um app que a pessoa não assina.
 */
integrationsRouter.get('/moneyapp/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ linked: !!(await vinculoMoneyApp(req.ownerId!)) });
  } catch (error) {
    next(error);
  }
});

integrationsRouter.get('/moneyapp/calendar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ownerId = req.ownerId!;
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'Missing start or end date' });
    }

    const integration = await vinculoMoneyApp(ownerId);

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

// Comprovante de um item do calendário do MoneyAPP. O id chega no formato
// `tx-<uuid>` ou `loan-<uuid>` (mesmo id que o /api/calendar retorna).
integrationsRouter.get('/moneyapp/receipt/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ownerId = req.ownerId!;
    const match = /^(tx|loan)-(.+)$/.exec(req.params.id!);
    if (!match) {
      return res.status(400).json({ error: 'Invalid receipt id' });
    }
    const resource = match[1] === 'tx' ? 'transactions' : 'loans';

    const integration = await vinculoMoneyApp(ownerId);

    if (!integration) {
      return res.status(404).json({ error: 'No MoneyApp integration' });
    }

    const moneyappRes = await fetch(`http://moneyapp_backend:3000/api/${resource}/${match[2]}/receipt`, {
      headers: {
        'x-api-key': env.BOT_SERVICE_KEY as string,
        'x-user-id': integration.appUserId.toString()
      }
    });

    if (!moneyappRes.ok) {
      return res.status(moneyappRes.status).json({ error: 'Failed to fetch receipt' });
    }

    res.setHeader('Content-Type', moneyappRes.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.end(Buffer.from(await moneyappRes.arrayBuffer()));
  } catch (error) {
    next(error);
  }
});

/**
 * Esta pessoa tem o vínculo com a Astral Wave Label?
 *
 * Mesmo motivo do `/moneyapp/status`: a tela precisa saber antes de desenhar o
 * chip. Quem não é do label não ganha um botão morto no calendário.
 */
integrationsRouter.get('/astralwave/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ linked: !!env.ASTRALWAVE_SERVICE_KEY && !!(await vinculoAstralWave(req.ownerId!)) });
  } catch (error) {
    next(error);
  }
});

/**
 * A agenda de lançamentos da Astral Wave, na janela que o calendário pediu.
 *
 * Os releases continuam morando lá e são lidos na hora, sem cópia — igual aos
 * lançamentos do MoneyAPP. O que atravessa a rede interna é só a chave de
 * serviço e o id da conta do label; o recorte de "o que essa pessoa pode ver"
 * é decidido do outro lado.
 */
integrationsRouter.get('/astralwave/calendar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'Missing start or end date' });
    }

    const integration = await vinculoAstralWave(req.ownerId!);
    if (!integration || !env.ASTRALWAVE_SERVICE_KEY) {
      return res.json([]);
    }

    const astralRes = await fetch(
      `http://astralwave_api:3000/api/calendar?start=${start}&end=${end}`,
      {
        headers: {
          'x-api-key': env.ASTRALWAVE_SERVICE_KEY,
          'x-user-id': integration.appUserId.toString()
        }
      }
    );

    if (!astralRes.ok) {
      console.error(`Astral Wave API devolveu ${astralRes.status}`);
      return res.status(502).json({ error: 'Failed to fetch from Astral Wave' });
    }

    res.json(await astralRes.json());
  } catch (error) {
    next(error);
  }
});
