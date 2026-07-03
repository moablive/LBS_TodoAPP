import type { NextFunction, Request, Response } from 'express';
import { db, schema } from '@todoapp/db';
import { eq } from 'drizzle-orm';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      telegramId?: string;
    }
  }
}

/**
 * Tasks (and everything keyed alongside them: reminder settings, push
 * subscriptions) are stored under the Telegram user id, not the LoginHub id.
 * Resolve it from user_settings. While the account has no Telegram linked,
 * the user works in a private namespace keyed by their own loginhubId — the
 * bot's /link-telegram flow later migrates that data to the telegramId.
 * (The old fallback to a fixed id leaked the owner's tasks to invited users.)
 */
export async function resolveTelegramId(req: Request, _res: Response, next: NextFunction) {
  const user = await db.query.userSettings.findFirst({
    where: eq(schema.userSettings.loginhubId, req.user!.loginhubId),
  });
  req.telegramId = user?.telegramId || String(req.user!.loginhubId);
  next();
}
