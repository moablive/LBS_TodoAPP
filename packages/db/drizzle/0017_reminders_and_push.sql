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
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"endpoint" text NOT NULL UNIQUE,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "push_subscriptions_user_idx" ON "push_subscriptions" ("user_id");
