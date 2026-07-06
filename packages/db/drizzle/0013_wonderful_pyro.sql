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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_prefs" (
	"user_id" varchar(50) PRIMARY KEY NOT NULL,
	"kanban_lists" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_groups" ALTER COLUMN "icon" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "recurrence" varchar(20);--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "details" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");