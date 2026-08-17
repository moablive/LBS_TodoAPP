import { z } from "zod";

/** Só http(s) e webcal — nada de file://, ftp:// e afins. */
const feedUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .refine(
    (v) => /^(https?|webcal):\/\//i.test(v),
    "A URL deve começar com https://, http:// ou webcal://"
  );

const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Cor deve estar no formato #rrggbb");

export const calendarSubscriptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  color: z.string().nullable(),
  groupId: z.string().nullable(),
  enabled: z.boolean(),
  lastSyncAt: z.string().nullable(),
  lastStatus: z.string().nullable(),
  lastError: z.string().nullable(),
  lastEventCount: z.number().int(),
  createdAt: z.string(),
});
export type CalendarSubscriptionDto = z.infer<typeof calendarSubscriptionSchema>;

export const createCalendarSubscriptionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  url: feedUrlSchema,
  color: colorSchema.optional(),
  /** Grupo destino. Omitido = o app cria/reaproveita o grupo "📅 Agenda". */
  groupId: z.string().max(36).nullable().optional(),
});
export type CreateCalendarSubscriptionDto = z.infer<typeof createCalendarSubscriptionSchema>;

export const updateCalendarSubscriptionSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  url: feedUrlSchema.optional(),
  color: colorSchema.optional(),
  groupId: z.string().max(36).nullable().optional(),
  enabled: z.boolean().optional(),
});
export type UpdateCalendarSubscriptionDto = z.infer<typeof updateCalendarSubscriptionSchema>;

/** Resultado de uma sync — o que a UI mostra depois de "Sincronizar agora". */
export interface CalendarSyncResult {
  calendarId: string;
  ok: boolean;
  created: number;
  updated: number;
  deleted: number;
  events: number;
  truncated: boolean;
  error?: string;
}
