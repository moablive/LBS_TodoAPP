import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  text,
  timestamp,
  varchar,
  pgTable,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";

export const userIntegrations = pgTable(
  "user_integrations",
  {
    telegramId: varchar("telegram_id", { length: 50 }).notNull(),
    appId: integer("app_id").notNull(),
    appUserId: integer("app_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.telegramId, t.appId] }),
  })
);

export const userSettings = pgTable("user_settings", {
  loginhubId: integer("loginhub_id").primaryKey(),
  telegramId: varchar("telegram_id", { length: 50 }).unique(),
});

export const taskGroups = pgTable(
  "task_groups",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 50 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    color: varchar("color", { length: 20 }),
    icon: text("icon"),
    order: integer("order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({ userIdx: index("task_groups_user_idx").on(t.userId) })
);

export const tasks = pgTable(
  "tasks",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 50 }).notNull(),
    description: text("description").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    groupId: varchar("group_id", { length: 36 }).references(() => taskGroups.id, {
      onDelete: "set null",
    }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    isFlagged: boolean("is_flagged").default(false).notNull(),
    isUrgent: boolean("is_urgent").default(false).notNull(),
    priority: varchar("priority", { length: 10 }).default("low").notNull(),
    order: integer("order").default(0).notNull(),
    // null = não se repete; senão 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly'
    recurrence: varchar("recurrence", { length: 20 }),
    details: text("details"),
    // null = duração padrão (1h no calendário)
    durationMinutes: integer("duration_minutes"),
  },
  (t) => ({
    userIdx: index("tasks_user_idx").on(t.userId),
    groupIdx: index("tasks_group_idx").on(t.groupId),
  })
);

// Keyed by the same user_id as tasks (the telegramId) so both the backend and
// the bot cron can read it without going through loginhub.
export const reminderSettings = pgTable("reminder_settings", {
  userId: varchar("user_id", { length: 50 }).primaryKey(),
  remindAtTime: boolean("remind_at_time").default(true).notNull(),
  remindBeforeEnabled: boolean("remind_before_enabled").default(true).notNull(),
  remindBeforeMinutes: integer("remind_before_minutes").default(30).notNull(),
  remindDaysEnabled: boolean("remind_days_enabled").default(true).notNull(),
  remindDaysBefore: integer("remind_days_before").default(7).notNull(),
  notifyPush: boolean("notify_push").default(true).notNull(),
  notifyTelegram: boolean("notify_telegram").default(true).notNull(),
  // Como o bot chama o usuário nas mensagens (null = "Patrão")
  displayName: varchar("display_name", { length: 60 }),
  
  // Resumos diários
  morningDigestEnabled: boolean("morning_digest_enabled").default(true).notNull(),
  morningDigestTime: varchar("morning_digest_time", { length: 5 }).default("08:00").notNull(),
  afternoonDigestEnabled: boolean("afternoon_digest_enabled").default(true).notNull(),
  afternoonDigestTime: varchar("afternoon_digest_time", { length: 5 }).default("13:00").notNull(),
  nightDigestEnabled: boolean("night_digest_enabled").default(false).notNull(),
  nightDigestTime: varchar("night_digest_time", { length: 5 }).default("20:00").notNull(),

  // Filtros de notificação
  notificationStyle: varchar("notification_style", { length: 20 }).default("all").notNull(), // 'all' | 'category' | 'priority'
  notifiedCategories: jsonb("notified_categories").$type<string[]>().default([]).notNull(),
  notifiedPriorities: jsonb("notified_priorities").$type<string[]>().default([]).notNull(),
  notificationPeriod: varchar("notification_period", { length: 10 }).default("all").notNull(), // 'today' | 'all'
  digestTodayOnly: boolean("digest_today_only").default(false).notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Preferências de UI por usuário (mesma chave telegramId de tasks — e a mesma
// identidade que o MoneyAPP usa, preparando a integração do ecossistema).
export const userPrefs = pgTable("user_prefs", {
  userId: varchar("user_id", { length: 50 }).primaryKey(),
  // ids das listas visíveis no kanban ('none' = coluna Sem Lista)
  kanbanLists: jsonb("kanban_lists").$type<string[]>().default([]).notNull(),
  showMoneyAppEvents: boolean("show_moneyapp_events").default(true).notNull(),
  moneyAppColor: text("moneyapp_color").default('#30d158'),
  showHolidays: boolean("show_holidays").default(true).notNull(),
  holidayColor: text("holiday_color").default('#6b7280'),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 50 }).notNull(),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({ userIdx: index("push_subscriptions_user_idx").on(t.userId) })
);

export const taskGroupsRelations = relations(taskGroups, ({ many }) => ({
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  group: one(taskGroups, {
    fields: [tasks.groupId],
    references: [taskGroups.id],
  }),
}));

export type ReminderSettings = typeof reminderSettings.$inferSelect;
export type NewReminderSettings = typeof reminderSettings.$inferInsert;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
export type UserSettingsType = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
export type TaskGroup = typeof taskGroups.$inferSelect;
export type NewTaskGroup = typeof taskGroups.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
