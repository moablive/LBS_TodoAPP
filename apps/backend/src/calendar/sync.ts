import crypto from 'node:crypto';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@todoapp/db';
import type { CalendarSyncResult } from '@todoapp/models';
import { env, parseIcs, occurrenceDetails } from '@todoapp/services';
import { fetchIcsFeed, FeedError } from './fetch-feed.js';

/**
 * Sincroniza calendários externos (.ics) materializando cada ocorrência como
 * uma tarefa comum. Assim o evento entra no calendário, no Kanban, nos
 * lembretes e no bot sem nenhum caminho paralelo — o preço é manter a sync
 * idempotente, que é o que este módulo faz:
 *
 *  - a chave de cada ocorrência (`tasks.external_uid`) é estável entre syncs;
 *  - o que o usuário controla (concluir, sinalizar, prioridade, grupo) nunca é
 *    sobrescrito — só descrição/horário/duração/detalhes vêm do feed;
 *  - ocorrência que sumiu do feed é apagada; tarefa apagada à mão vira lápide
 *    (`calendar_ignored_events`) para não ressuscitar.
 */

type CalendarSubscription = typeof schema.calendarSubscriptions.$inferSelect;

const AGENDA_GROUP_NAME = '📅 Agenda';

function newId(): string {
  // Mesmo formato dos ids gerados pelas rotas de tarefas e pelo bot.
  return crypto.randomUUID().slice(0, 8);
}

/** Garante um grupo destino para o calendário (reaproveita o "📅 Agenda"). */
export async function ensureAgendaGroup(userId: string, color?: string | null): Promise<string> {
  const groups = await db.query.taskGroups.findMany({
    where: eq(schema.taskGroups.userId, userId),
    orderBy: [asc(schema.taskGroups.order)],
  });
  const existing = groups.find((g) => g.name === AGENDA_GROUP_NAME);
  if (existing) return existing.id;

  const id = newId();
  await db.insert(schema.taskGroups).values({
    id,
    userId,
    name: AGENDA_GROUP_NAME,
    color: color || '#5b8cff',
    icon: '📅',
    order: groups.length,
  });
  return id;
}

function syncWindow(): { start: Date; end: Date } {
  const now = Date.now();
  return {
    start: new Date(now - env.CALENDAR_PAST_DAYS * 86_400_000),
    end: new Date(now + env.CALENDAR_FUTURE_DAYS * 86_400_000),
  };
}

function sameInstant(a: Date | null, b: Date): boolean {
  return a instanceof Date && a.getTime() === b.getTime();
}

/** Baixa o feed e reconcilia as tarefas do calendário. Nunca lança. */
export async function syncSubscription(sub: CalendarSubscription): Promise<CalendarSyncResult> {
  const result: CalendarSyncResult = {
    calendarId: sub.id,
    ok: false,
    created: 0,
    updated: 0,
    deleted: 0,
    events: 0,
    truncated: false,
  };

  try {
    const raw = await fetchIcsFeed(sub.url);
    const { start, end } = syncWindow();
    const parsed = parseIcs(raw, {
      defaultTimeZone: env.CALENDAR_TZ,
      windowStart: start,
      windowEnd: end,
    });

    const ignored = new Set(
      (
        await db
          .select({ uid: schema.calendarIgnoredEvents.externalUid })
          .from(schema.calendarIgnoredEvents)
          .where(eq(schema.calendarIgnoredEvents.calendarId, sub.id))
      ).map((r) => r.uid),
    );

    const existing = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.calendarId, sub.id));
    const byKey = new Map(existing.filter((t) => t.externalUid).map((t) => [t.externalUid!, t]));

    const groupId = sub.groupId ?? (await ensureAgendaGroup(sub.userId, sub.color));
    const keep = new Set<string>();

    for (const occ of parsed.occurrences) {
      if (ignored.has(occ.key)) continue;
      keep.add(occ.key);
      result.events++;

      const description = occ.summary.slice(0, 500);
      const details = occurrenceDetails(occ);
      const durationMinutes = Math.max(1, Math.min(occ.durationMinutes, 24 * 60));
      const current = byKey.get(occ.key);

      if (!current) {
        await db
          .insert(schema.tasks)
          .values({
            id: newId(),
            userId: sub.userId,
            description,
            scheduledAt: occ.start,
            durationMinutes,
            details,
            groupId,
            source: 'ics',
            calendarId: sub.id,
            externalUid: occ.key,
          })
          // Corrida entre a sync agendada e a manual: quem chegar depois não
          // duplica (o índice único (calendar_id, external_uid) segura).
          .onConflictDoNothing();
        result.created++;
        continue;
      }

      const changed =
        current.description !== description ||
        !sameInstant(current.scheduledAt, occ.start) ||
        (current.durationMinutes ?? null) !== durationMinutes ||
        (current.details ?? null) !== details;

      if (changed) {
        // Só os campos que o feed manda. Conclusão, flags, prioridade, ordem e
        // grupo continuam sendo do usuário.
        await db
          .update(schema.tasks)
          .set({ description, scheduledAt: occ.start, durationMinutes, details })
          .where(eq(schema.tasks.id, current.id));
        result.updated++;
      }
    }

    const stale = existing.filter((t) => !t.externalUid || !keep.has(t.externalUid));
    if (stale.length) {
      await db.delete(schema.tasks).where(
        inArray(
          schema.tasks.id,
          stale.map((t) => t.id),
        ),
      );
      result.deleted = stale.length;
    }

    result.truncated = parsed.truncated;
    result.ok = true;

    await db
      .update(schema.calendarSubscriptions)
      .set({
        lastSyncAt: new Date(),
        lastStatus: 'ok',
        lastError: null,
        lastEventCount: result.events,
        groupId,
      })
      .where(eq(schema.calendarSubscriptions.id, sub.id));
  } catch (err) {
    const message =
      err instanceof FeedError ? err.message : err instanceof Error ? err.message : String(err);
    result.error = message.slice(0, 500);
    // eslint-disable-next-line no-console
    console.error(`[calendar-sync] "${sub.name}" (${sub.id}): ${message}`);
    await db
      .update(schema.calendarSubscriptions)
      .set({ lastSyncAt: new Date(), lastStatus: 'error', lastError: result.error })
      .where(eq(schema.calendarSubscriptions.id, sub.id))
      .catch(() => undefined);
  }

  return result;
}

/** Sincroniza todos os calendários ativos de um usuário. */
export async function syncUserCalendars(userId: string): Promise<CalendarSyncResult[]> {
  const subs = await db
    .select()
    .from(schema.calendarSubscriptions)
    .where(
      and(
        eq(schema.calendarSubscriptions.userId, userId),
        eq(schema.calendarSubscriptions.enabled, true),
      ),
    );
  const out: CalendarSyncResult[] = [];
  for (const sub of subs) out.push(await syncSubscription(sub));
  return out;
}

let running = false;

/** Uma rodada em TODOS os calendários ativos (de todos os usuários). */
export async function syncAllCalendars(): Promise<void> {
  if (running) return; // uma rodada por vez: feed lento não empilha timers
  running = true;
  try {
    const subs = await db
      .select()
      .from(schema.calendarSubscriptions)
      .where(eq(schema.calendarSubscriptions.enabled, true));
    if (!subs.length) return;

    let events = 0;
    let failed = 0;
    for (const sub of subs) {
      const r = await syncSubscription(sub);
      events += r.events;
      if (!r.ok) failed++;
    }
    // eslint-disable-next-line no-console
    console.log(
      `[calendar-sync] ${subs.length} calendário(s), ${events} evento(s)` +
        (failed ? `, ${failed} com erro` : ''),
    );
  } finally {
    running = false;
  }
}

/** Agendador periódico — chamado uma vez na subida do servidor. */
export function startCalendarScheduler(): void {
  const minutes = env.CALENDAR_SYNC_MINUTES;
  if (minutes <= 0) {
    // eslint-disable-next-line no-console
    console.log('Sync de calendários externos desativada (CALENDAR_SYNC_MINUTES=0).');
    return;
  }
  // Espera o processo estabilizar antes da primeira rodada.
  setTimeout(() => void syncAllCalendars().catch(() => undefined), 30_000);
  setInterval(() => void syncAllCalendars().catch(() => undefined), minutes * 60_000);
  // eslint-disable-next-line no-console
  console.log(`Sync de calendários externos ativa (a cada ${minutes} min).`);
}
