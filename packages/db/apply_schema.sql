CREATE TABLE IF NOT EXISTS "calendar_subscriptions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"name" varchar(120) NOT NULL,
	"url" text NOT NULL,
	"color" varchar(20) DEFAULT '#5b8cff',
	"group_id" varchar(36) REFERENCES "task_groups"("id") ON DELETE SET NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_status" varchar(20),
	"last_error" text,
	"last_event_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "calendar_subscriptions_user_idx" ON "calendar_subscriptions" ("user_id");

ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "source" varchar(20) DEFAULT 'manual' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "calendar_id" varchar(36);
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "external_uid" varchar(255);
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "duration_minutes" integer;

DO $$ BEGIN
	ALTER TABLE "tasks" ADD CONSTRAINT "tasks_calendar_id_fkey"
		FOREIGN KEY ("calendar_id") REFERENCES "calendar_subscriptions"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "tasks_calendar_idx" ON "tasks" ("calendar_id");

CREATE UNIQUE INDEX IF NOT EXISTS "tasks_calendar_uid_uidx"
	ON "tasks" ("calendar_id", "external_uid")
	WHERE "calendar_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "calendar_ignored_events" (
	"calendar_id" varchar(36) NOT NULL REFERENCES "calendar_subscriptions"("id") ON DELETE CASCADE,
	"external_uid" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY ("calendar_id", "external_uid")
);

-- Handle unique constraint on user_settings
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_telegram_id_unique" UNIQUE ("telegram_id");
