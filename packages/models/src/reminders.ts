import { z } from "zod";

export const reminderSettingsSchema = z.object({
  remindAtTime: z.boolean(),
  remindBeforeEnabled: z.boolean(),
  remindBeforeMinutes: z.number().int().min(1).max(1440),
  remindDaysEnabled: z.boolean(),
  remindDaysBefore: z.number().int().min(1).max(60),
  notifyPush: z.boolean(),
  notifyTelegram: z.boolean(),
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
});
export type UpdateUserPrefsDto = z.infer<typeof updateUserPrefsSchema>;
