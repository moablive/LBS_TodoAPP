import type { NextFunction, Request, Response } from 'express';
import { env } from '@todoapp/services';
import { verifyHubToken, HubAuthError, bearerDoRequest, criarVerificadorDeRevogacao } from '../lib/hubAuthServer.js';
// `@todoapp/models` nunca exportou `LoginHubPayload` — o import estava quebrado
// desde antes desta mudanca. `HubSession` do auth-kit descreve o mesmo payload.
import type { HubSession as LoginHubPayload } from '../lib/hubAuthServer.js';

/** Config da guarda do hub. Uma so, montada a partir do env validado. */
const hubConfig = { secret: env.JWT_SECRET, appId: env.LOGINHUB_APP_ID };

/**
 * Revogacao de sessao. Ativar o 2FA (ou um reset administrativo) carimba um
 * piso no hub a partir do qual so valem tokens novos — e o `verifyHubToken`,
 * que e local de proposito, nao enxerga isso. Sem este verificador um token
 * emitido antes do corte seguia aceito aqui por ate 24 h.
 *
 * Cache curto por usuario: o piso muda raríssimo, entao nao ha ida a rede por
 * requisicao. Falha ABERTA se o hub nao responder — ver o kit.
 */
const revogacao = criarVerificadorDeRevogacao({ baseUrl: env.LOGINHUB_API_URL });

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { loginhubId: number; email: string };
    }
  }
}

/**
 * Verify the Bearer token against the (LoginHub) JWT secret. Returns the
 * decoded payload, or `null` when the header is missing/malformed/invalid.
 * Does NOT touch the database — callers decide how to resolve the identity.
 */
/**
 * Delega ao `verifyHubToken` do auth-kit, que alem da assinatura recusa os
 * passes de etapa unica do hub (`action: '2fa-challenge' | '2fa-setup' |
 * 'setup-password'`) e os tokens de outro tenant. Um `jwt.verify` cru aceitava
 * os tres: o passe de enrolamento se obtem so com a senha e carrega `sub`,
 * `email` e `role`, entao valia como sessao aqui — o segundo fator nao
 * protegia esta API.
 */
export function verifyBearer(req: Request): LoginHubPayload | null {
  const token = bearerDoRequest(req);
  if (!token) return null;
  try {
    return verifyHubToken(token, hubConfig) as LoginHubPayload;
  } catch {
    return null;
  }
}

/**
 * Authenticate a user request. Two accepted identities:
 *
 *  1. **Web user** — a LoginHub-issued Bearer JWT. Identity is owned by
 *     LoginHub.
 *  2. **Trusted bot** — `x-api-key: BOT_SERVICE_KEY` plus `x-user-id: <id>`,
 *     the bot acting on behalf of a Telegram-linked user. The bot validated the
 *     user against LoginHub before linking, so we trust the delegated id.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 1) Trusted bot, delegated identity.
    const apiKey = req.headers['x-api-key'];
    if (typeof apiKey === 'string' && apiKey === env.BOT_SERVICE_KEY) {
      const onBehalfOf = req.headers['x-user-id'];
      if (typeof onBehalfOf !== 'string' || !onBehalfOf || isNaN(Number(onBehalfOf))) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }
      req.user = { loginhubId: parseInt(onBehalfOf, 10), email: '' }; // Bot might not send email
      next();
      return;
    }

    // 2) Web user, LoginHub token.
    const token = bearerDoRequest(req);
    if (!token) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    // O erro sai com o codigo do hub em vez de virar um `unauthorized`
    // generico: o frontend precisa distinguir "sessao expirada" (renova) de
    // "isto e um passe de etapa unica" (conclua o 2FA).
    let payload: LoginHubPayload;
    try {
      payload = verifyHubToken(token, hubConfig) as LoginHubPayload;
    } catch (err) {
      const e = err as HubAuthError;
      const status = e instanceof HubAuthError ? e.status : 401;
      res.status(status).json({ error: e instanceof HubAuthError ? e.code : 'unauthorized', message: e?.message });
      return;
    }

    if (!payload.sub || !payload.email) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    if (await revogacao.revogada(token, payload)) {
      res.status(401).json({
        error: 'SESSAO_REVOGADA',
        message: 'Sua sessao foi encerrada. Entre novamente.',
      });
      return;
    }
    
    req.user = { loginhubId: parseInt(payload.sub, 10), email: payload.email };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Guard for service-to-service `/bot/*` routes that don't act as a single user
 * (the user id travels in the query/body). The Telegram bot presents the shared
 * key; end-user credentials are validated by the bot against LoginHub directly.
 */
export function requireBotKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-api-key'];
  if (typeof key !== 'string' || key !== env.BOT_SERVICE_KEY) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}
