import 'dotenv/config';
import { z } from 'zod';

// z.coerce.boolean() trata QUALQUER string nao-vazia como true ("false" -> true).
// Aqui a leitura e explicita: so 1/true/yes/on (case-insensitive) contam como
// verdadeiro; qualquer outra coisa, ou ausencia, cai no padrao informado.
const boolEnv = (padrao: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined ? padrao : /^(1|true|yes|on)$/i.test(v.trim())));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  // Shared with LoginHub: requireAuth verifies LoginHub-issued user JWTs with
  // this secret. shares.ts also signs/verifies its own share-link tokens with it.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  // ID do TodoAPP no LoginHub. Obrigatorio: `requireAuth` recusa token de outro
  // tenant, e sem esse id nao ha como delimitar o escopo — um JWT assinado
  // para qualquer outro app do hub passaria por aqui.
  LOGINHUB_APP_ID: z.coerce.number().int().positive(),
  /**
   * API interna do hub — usada pela introspeccao de revogacao de sessao
   * (`GET /auth/session-floor`). DNS do Docker, sem sair para o Cloudflare.
   */
  LOGINHUB_API_URL: z.string().default('http://server_loginhub_backend:3000/api'),
  // Shared secret the Telegram bot presents (x-api-key) to call /bot/* routes.
  // Optional — bot runs in a separate repo (TodoAPP_BOT).
  BOT_SERVICE_KEY: z.string().min(32, 'BOT_SERVICE_KEY must be at least 32 chars').optional(),
  /**
   * Mantem o ramo LEGADO do `requireAuth` (x-api-key + x-user-id confiado cego).
   * `true` enquanto o bot ainda nao repassa JWT do LoginHub; vira `false` para
   * FECHAR de vez a delegacao cega. Ver middleware/auth.ts e middleware/rede.ts.
   */
  ALLOW_LEGACY_BOT_DELEGATION: boolEnv(true),
  /**
   * Escape hatch: aceitar chave de servico vinda da borda publica. Fica `false`
   * — so ligar se a topologia mudar (algum chamador legitimo passar a entrar
   * pelo nginx do frontend). Ver middleware/rede.ts.
   */
  TRUST_EDGE_SERVICE_KEY: boolEnv(false),
  /**
   * Username do bot, sem `@` — entra no deep link do vinculo hibrido
   * (`https://t.me/<username>?start=<passe>`). Opcional: sem ele o app segue
   * inteiro, so a rota `/api/telegram/link-token` responde CONFIG_AUSENTE.
   */
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  CORS_ORIGIN: z.string().default('*').transform((val) => {
    if (val === '*') return val;
    return val.split(',').map(s => s.trim());
  }),
  MAX_RECEIPT_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  // ── Calendários externos (.ics) ─────────────────────────────────────────
  // Intervalo entre syncs automáticas dos feeds assinados. 0 desliga o
  // agendador (a sync manual pelo app continua funcionando).
  CALENDAR_SYNC_MINUTES: z.coerce.number().int().min(0).default(15),
  // Fuso usado para eventos de dia inteiro e para feeds que não informam TZID.
  CALENDAR_TZ: z.string().default('America/Sao_Paulo'),
  // Janela materializada como tarefas: passado curto (histórico) + 1 ano.
  CALENDAR_PAST_DAYS: z.coerce.number().int().min(0).default(30),
  CALENDAR_FUTURE_DAYS: z.coerce.number().int().min(1).default(365),
  CALENDAR_MAX_BYTES: z.coerce.number().int().positive().default(8 * 1024 * 1024),
  // O backend fica na rede interna do Docker: por padrão recusamos feeds que
  // resolvam para IP privado/loopback (SSRF). Ligue só para um .ics interno.
  CALENDAR_ALLOW_PRIVATE_HOSTS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  // Web Push (VAPID). Optional — push routes respond 503 when not configured.
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default('mailto:admin@astralwavelabel.com'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
