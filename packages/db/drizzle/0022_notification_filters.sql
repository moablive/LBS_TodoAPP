ALTER TABLE "reminder_settings" ADD COLUMN IF NOT EXISTS "notified_priorities" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "reminder_settings" ADD COLUMN IF NOT EXISTS "notification_period" varchar(10) DEFAULT 'all' NOT NULL;
ALTER TABLE "reminder_settings" ADD COLUMN IF NOT EXISTS "digest_today_only" boolean DEFAULT false NOT NULL;
