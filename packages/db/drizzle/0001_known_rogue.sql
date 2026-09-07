-- Camada da Astral Wave Label no calendário (chip + Preferências).
--
-- `IF NOT EXISTS` não é enfeite: as duas colunas já existiam em produção
-- quando esta migration nasceu (foram aplicadas à mão durante o
-- desenvolvimento, contra a regra 3 da seção "Migrations" do README). Sem isto
-- o `db:migrate` quebraria aqui neste servidor com "column already exists",
-- enquanto num banco novo passaria — o pior tipo de migration, a que só falha
-- onde importa. O efeito é idêntico ao do DDL que o drizzle-kit gerou.
ALTER TABLE "user_prefs" ADD COLUMN IF NOT EXISTS "show_astralwave_events" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_prefs" ADD COLUMN IF NOT EXISTS "astralwave_color" text DEFAULT '#a855f7';
