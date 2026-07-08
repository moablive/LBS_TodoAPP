import { z } from "zod";

export const reminderSettingsSchema = z.object({
  remindAtTime: z.boolean(),
  remindBeforeEnabled: z.boolean(),
  remindBeforeMinutes: z.number().int().min(1).max(1440),
  remindDaysEnabled: z.boolean(),
  remindDaysBefore: z.number().int().min(1).max(60),
  notifyPush: z.boolean(),
  notifyTelegram: z.boolean(),
  displayName: z.string().max(60).nullable(),
  morningDigestEnabled: z.boolean(),
  morningDigestTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  afternoonDigestEnabled: z.boolean(),
  afternoonDigestTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  nightDigestEnabled: z.boolean(),
  nightDigestTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  notificationStyle: z.enum(['all', 'category', 'priority']),
  notifiedCategories: z.array(z.string()),
  notifiedPriorities: z.array(z.enum(['low', 'medium', 'high'])),
  notificationPeriod: z.enum(['today', 'all']),
  digestTodayOnly: z.boolean(),
});
export type ReminderSettingsDto = z.infer<typeof reminderSettingsSchema>;

export const updateReminderSettingsSchema = reminderSettingsSchema.partial();
export type UpdateReminderSettingsDto = z.infer<typeof updateReminderSettingsSchema>;

export const defaultReminderSettings: ReminderSettingsDto = {
  remindAtTime: true,
  remindBeforeEnabled: true,
  remindBeforeMinutes: 30,
  remindDaysEnabled: true,
  remindDaysBefore: 7,
  notifyPush: true,
  notifyTelegram: true,
  displayName: null,
  morningDigestEnabled: true,
  morningDigestTime: "08:00",
  afternoonDigestEnabled: true,
  afternoonDigestTime: "13:00",
  nightDigestEnabled: false,
  nightDigestTime: "20:00",
  notificationStyle: 'all',
  notifiedCategories: [],
  notifiedPriorities: [],
  notificationPeriod: 'all',
  digestTodayOnly: false,
};

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});
export type PushSubscribeDto = z.infer<typeof pushSubscribeSchema>;

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url(),
});
export type PushUnsubscribeDto = z.infer<typeof pushUnsubscribeSchema>;

// Preferências de UI por usuário (kanban: listas visíveis; 'none' = Sem Lista)
export const updateUserPrefsSchema = z.object({
  kanbanLists: z.array(z.string().max(50)).max(100).optional(),
  showMoneyAppEvents: z.boolean().optional(),
  moneyAppColor: z.string().optional(),
  showHolidays: z.boolean().optional(),
  holidayColor: z.string().optional(),
});
export type UpdateUserPrefsDto = z.infer<typeof updateUserPrefsSchema>;
