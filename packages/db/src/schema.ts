import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  text,
  timestamp,
  varchar,
  pgTable,
  integer,
} from "drizzle-orm/pg-core";

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
  },
  (t) => ({
    userIdx: index("tasks_user_idx").on(t.userId),
    groupIdx: index("tasks_group_idx").on(t.groupId),
  })
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

export type UserSettingsType = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
export type TaskGroup = typeof taskGroups.$inferSelect;
export type NewTaskGroup = typeof taskGroups.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
