CREATE TABLE IF NOT EXISTS "user_prefs" (
	"user_id" varchar(50) PRIMARY KEY NOT NULL,
	"kanban_lists" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
