import crypto from 'node:crypto';
import { Router } from 'express';
import { and, asc, eq } from 'drizzle-orm';
import { db, schema } from '@todoapp/db';
import {
  createCalendarSubscriptionSchema,
  updateCalendarSubscriptionSchema,
} from '@todoapp/models';
import { resolveOwnerId } from '../middleware/owner-id.js';
import { ensureAgendaGroup, syncSubscription, syncUserCalendars } from '../calendar/sync.js';

export const calendarsRouter = Router();

calendarsRouter.use(resolveOwnerId);

async function findOwned(userId: string, id: string) {
  return db.query.calendarSubscriptions.findFirst({
    where: and(
      eq(schema.calendarSubscriptions.id, id),
      eq(schema.calendarSubscriptions.userId, userId),
    ),
  });
}

calendarsRouter.get('/', async (req, res) => {
  const rows = await db
    .select()
    .from(schema.calendarSubscriptions)
    .where(eq(schema.calendarSubscriptions.userId, req.ownerId!))
    .orderBy(asc(schema.calendarSubscriptions.createdAt));
  res.json(rows);
});

calendarsRouter.post('/', async (req, res) => {
  const parsed = createCalendarSubscriptionSchema.parse(req.body);
  const userId = req.ownerId!;

  const groupId = parsed.groupId ?? (await ensureAgendaGroup(userId, parsed.color));
  const [created] = await db
    .insert(schema.calendarSubscriptions)
    .values({
      id: crypto.randomUUID().slice(0, 8),
      userId,
      name: parsed.name,
      url: parsed.url,
      color: parsed.color ?? '#5b8cff',
      groupId,
    })
    .returning();

  // Primeira sync é síncrona: o usuário acabou de colar a URL e precisa saber
  // agora se ela presta (URL errada, feed privado, host interno…).
  const sync = await syncSubscription(created!);
  const fresh = await findOwned(userId, created!.id);
  res.status(201).json({ ...fresh, sync });
});

calendarsRouter.patch('/:id', async (req, res) => {
  const parsed = updateCalendarSubscriptionSchema.parse(req.body);
  const userId = req.ownerId!;
  const sub = await findOwned(userId, req.params.id!);
  if (!sub) return res.status(404).json({ error: 'not_found' });

  const updates: Record<string, unknown> = {};
  if (parsed.name !== undefined) updates.name = parsed.name;
  if (parsed.url !== undefined) updates.url = parsed.url;
  if (parsed.color !== undefined) updates.color = parsed.color;
  if (parsed.groupId !== undefined) updates.groupId = parsed.groupId;
  if (parsed.enabled !== undefined) updates.enabled = parsed.enabled;

  const [updated] = await db
    .update(schema.calendarSubscriptions)
    .set(updates)
    .where(eq(schema.calendarSubscriptions.id, sub.id))
    .returning();

  // Trocar a URL invalida tudo que veio da anterior; ressincroniza na hora.
  const sync = parsed.url !== undefined && parsed.url !== sub.url
    ? await syncSubscription(updated!)
    : undefined;

  res.json({ ...(await findOwned(userId, sub.id)), sync });
});

calendarsRouter.delete('/:id', async (req, res) => {
  const sub = await findOwned(req.ownerId!, req.params.id!);
  if (!sub) return res.status(404).json({ error: 'not_found' });
  // As tarefas geradas somem junto (FK ON DELETE CASCADE), assim como as
  // lápides — o grupo "📅 Agenda" fica, pode ter tarefas manuais dentro.
  await db
    .delete(schema.calendarSubscriptions)
    .where(eq(schema.calendarSubscriptions.id, sub.id));
  res.status(204).send();
});

calendarsRouter.post('/:id/sync', async (req, res) => {
  const sub = await findOwned(req.ownerId!, req.params.id!);
  if (!sub) return res.status(404).json({ error: 'not_found' });
  res.json(await syncSubscription(sub));
});

calendarsRouter.post('/sync', async (req, res) => {
  res.json(await syncUserCalendars(req.ownerId!));
});
