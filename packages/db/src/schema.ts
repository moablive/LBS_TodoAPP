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
    // Dono = `loginhub_id`, como no resto do app. Era `telegram_id`, e essa era
    // a mesma confusao de identidade que esvaziava a web quando a conta do hub
    // era recriada: o hub e o dono da identidade, o Telegram e so um canal.
    loginhubId: varchar("loginhub_id", { length: 50 }).notNull(),
    appId: integer("app_id").notNull(),
    appUserId: integer("app_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.loginhubId, t.appId] }),
  })
);

export const userSettings = pgTable("user_settings", {
  loginhubId: integer("loginhub_id").primaryKey(),
  telegramId: varchar("telegram_id", { length: 50 }).unique(),
});

/**
 * Passes de uso único que vinculam um Telegram a uma conta já autenticada.
 *
 * POR QUE ISTO EXISTE
 *
 * O vínculo era feito digitando e-mail, senha e o código do 2FA DENTRO do chat.
 * Três problemas, nessa ordem de gravidade: a senha fica no histórico do
 * Telegram (nos servidores deles, no aparelho e em qualquer backup de chat); o
 * código do autenticador também; e o bot precisava saber falar login com o hub,
 * o que duplicava o fluxo de 2FA num lugar onde ele não cabe — um chat não
 * desenha QR sem expor o segredo no mesmo canal.
 *
 * Aqui a ordem se inverte: a pessoa já entrou no app pelo PC, com 2FA, e de lá
 * emite um passe. O passe atravessa o chat — e ele é inofensivo: vale poucos
 * minutos, serve uma vez, e não abre nada além de gravar o vínculo.
 *
 * Guardamos o SHA-256 e não o passe: vazamento do banco não entrega passe
 * utilizável, do mesmo jeito que não se guarda senha em texto.
 */
export const telegramLinkTokens = pgTable("telegram_link_tokens", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  loginhubId: integer("loginhub_id").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
  /** Carimbo do consumo. Não-nulo = já usado, e não serve de novo. */
  usadoEm: timestamp("usado_em", { withTimezone: true }),
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

/**
 * Calendários externos assinados pelo usuário (feed .ics / webcal do Proton
 * Calendar, Google Calendar, Outlook…). A sync materializa cada ocorrência
 * como uma tarefa comum (`tasks.calendar_id`), então lembrete, bot e calendário
 * funcionam sem nenhum caminho novo.
 */
export const calendarSubscriptions = pgTable(
  "calendar_subscriptions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 50 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    url: text("url").notNull(),
    color: varchar("color", { length: 20 }).default("#5b8cff"),
    // Grupo onde as tarefas geradas caem (a criação garante um "📅 Agenda").
    groupId: varchar("group_id", { length: 36 }).references(() => taskGroups.id, {
      onDelete: "set null",
    }),
    enabled: boolean("enabled").default(true).notNull(),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    // 'ok' | 'error' — o que aconteceu na última tentativa de sync.
    lastStatus: varchar("last_status", { length: 20 }),
    lastError: text("last_error"),
    lastEventCount: integer("last_event_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({ userIdx: index("calendar_subscriptions_user_idx").on(t.userId) })
);

/**
 * Lápides: evento que o usuário apagou à mão no TodoAPP. Sem isso a próxima
 * sync ressuscitaria a tarefa, já que o evento continua no feed.
 */
export const calendarIgnoredEvents = pgTable(
  "calendar_ignored_events",
  {
    calendarId: varchar("calendar_id", { length: 36 })
      .notNull()
      .references(() => calendarSubscriptions.id, { onDelete: "cascade" }),
    externalUid: varchar("external_uid", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.calendarId, t.externalUid] }) })
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
    // 'manual' (criada no app/bot) | 'ics' (espelho de um calendário externo)
    source: varchar("source", { length: 20 }).default("manual").notNull(),
    calendarId: varchar("calendar_id", { length: 36 }).references(
      () => calendarSubscriptions.id,
      { onDelete: "cascade" }
    ),
    // Chave da ocorrência no feed: `UID` ou `UID#<início original>` numa série.
    externalUid: varchar("external_uid", { length: 255 }),
  },
  (t) => ({
    userIdx: index("tasks_user_idx").on(t.userId),
    groupIdx: index("tasks_group_idx").on(t.groupId),
    calendarIdx: index("tasks_calendar_idx").on(t.calendarId),
  })
);

// Mesmo `user_id` das tasks — o `loginhub_id`. Backend e cron do bot leem daqui
// sem passar pelo hub; o vinculo com o Telegram fica em `user_settings`.
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
  icsExportToken: varchar("ics_export_token", { length: 36 }),
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
export type TelegramLinkToken = typeof telegramLinkTokens.$inferSelect;
export type NewTelegramLinkToken = typeof telegramLinkTokens.$inferInsert;
export type TaskGroup = typeof taskGroups.$inferSelect;
export type NewTaskGroup = typeof taskGroups.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type CalendarSubscription = typeof calendarSubscriptions.$inferSelect;
export type NewCalendarSubscription = typeof calendarSubscriptions.$inferInsert;
