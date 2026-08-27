CREATE TABLE IF NOT EXISTS "user_integrations" (
	"user_id" varchar(50) NOT NULL,
	"app_name" varchar(50) NOT NULL,
	"app_user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_integrations_user_id_app_name_pk" PRIMARY KEY("user_id","app_name")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_integrations_user_idx" ON "user_integrations" USING btree ("user_id");