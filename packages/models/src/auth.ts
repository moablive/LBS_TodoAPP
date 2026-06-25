import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export type LoginRequest = z.infer<typeof loginSchema>;

export const userSettingsSchema = z.object({
  telegramId: z.string().nullable().optional(),
});
export type UserSettingsRequest = z.infer<typeof userSettingsSchema>;
