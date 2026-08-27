CREATE TABLE IF NOT EXISTS "calendar_ignored_events" (
	"calendar_id" varchar(36) NOT NULL,
	"external_uid" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_ignored_events_calendar_id_external_uid_pk" PRIMARY KEY("calendar_id","external_uid")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calendar_subscriptions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"name" varchar(120) NOT NULL,
	"url" text NOT NULL,
	"color" varchar(20) DEFAULT '#5b8cff',
	"group_id" varchar(36),
	"enabled" boolean DEFAULT true NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_status" varchar(20),
	"last_error" text,
	"last_event_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reminder_settings" (
	"user_id" varchar(50) PRIMARY KEY NOT NULL,
	"remind_at_time" boolean DEFAULT true NOT NULL,
	"remind_before_enabled" boolean DEFAULT true NOT NULL,
	"remind_before_minutes" integer DEFAULT 30 NOT NULL,
	"remind_days_enabled" boolean DEFAULT true NOT NULL,
	"remind_days_before" integer DEFAULT 7 NOT NULL,
	"notify_push" boolean DEFAULT true NOT NULL,
	"notify_telegram" boolean DEFAULT true NOT NULL,
	"display_name" varchar(60),
	"morning_digest_enabled" boolean DEFAULT true NOT NULL,
	"morning_digest_time" varchar(5) DEFAULT '08:00' NOT NULL,
	"afternoon_digest_enabled" boolean DEFAULT true NOT NULL,
	"afternoon_digest_time" varchar(5) DEFAULT '13:00' NOT NULL,
	"night_digest_enabled" boolean DEFAULT false NOT NULL,
	"night_digest_time" varchar(5) DEFAULT '20:00' NOT NULL,
	"notification_style" varchar(20) DEFAULT 'all' NOT NULL,
	"notified_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notified_priorities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notification_period" varchar(10) DEFAULT 'all' NOT NULL,
	"digest_today_only" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_groups" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"name" varchar(120) NOT NULL,
	"color" varchar(20),
	"icon" text,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tasks" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"scheduled_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"group_id" varchar(36),
	"completed_at" timestamp,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"is_urgent" boolean DEFAULT false NOT NULL,
	"priority" varchar(10) DEFAULT 'low' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"recurrence" varchar(20),
	"details" text,
	"duration_minutes" integer,
	"source" varchar(20) DEFAULT 'manual' NOT NULL,
	"calendar_id" varchar(36),
	"external_uid" varchar(255)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "telegram_link_tokens" (
	"token_hash" varchar(64) PRIMARY KEY NOT NULL,
	"loginhub_id" integer NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"usado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_integrations" (
	"loginhub_id" varchar(50) NOT NULL,
	"app_id" integer NOT NULL,
	"app_user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_integrations_loginhub_id_app_id_pk" PRIMARY KEY("loginhub_id","app_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_prefs" (
	"user_id" varchar(50) PRIMARY KEY NOT NULL,
	"kanban_lists" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"show_moneyapp_events" boolean DEFAULT true NOT NULL,
	"moneyapp_color" text DEFAULT '#30d158',
	"show_holidays" boolean DEFAULT true NOT NULL,
	"holiday_color" text DEFAULT '#6b7280',
	"ics_export_token" varchar(36),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_settings" (
	"loginhub_id" integer PRIMARY KEY NOT NULL,
	"telegram_id" varchar(50),
	CONSTRAINT "user_settings_telegram_id_unique" UNIQUE("telegram_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calendar_ignored_events" ADD CONSTRAINT "calendar_ignored_events_calendar_id_calendar_subscriptions_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."calendar_subscriptions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calendar_subscriptions" ADD CONSTRAINT "calendar_subscriptions_group_id_task_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."task_groups"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_group_id_task_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."task_groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_calendar_id_calendar_subscriptions_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."calendar_subscriptions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_subscriptions_user_idx" ON "calendar_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_groups_user_idx" ON "task_groups" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_user_idx" ON "tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_group_idx" ON "tasks" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_calendar_idx" ON "tasks" USING btree ("calendar_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tasks_calendar_uid_uidx" ON "tasks" USING btree ("calendar_id","external_uid") WHERE calendar_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_link_tokens_expira_idx" ON "telegram_link_tokens" USING btree ("expira_em");