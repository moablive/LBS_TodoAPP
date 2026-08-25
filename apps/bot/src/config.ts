import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),

  // LoginHub — o bot valida e-mail+senha direto no LoginHub (padrão MoneyAPP)
  // e então vincula o telegramId ao usuário no banco do TodoAPP.
  LOGINHUB_API_URL: z.string().default('http://server_loginhub_backend:3000/api'),
  // Login publico DESTE app — e para ca que o bot manda quem precisa
  // enrolar 2FA. O QR mora na propria tela do app desde que cada um
  // passou a enrolar em casa; o painel do hub saiu do caminho.
  APP_LOGIN_URL: z.string().default('https://todo.astralwavelabel.com/login'),
  LOGINHUB_APP_ID: z.coerce.number().default(4),
  // API interna do proprio app. So o vinculo hibrido passa por aqui — o resto
  // do bot fala direto com o Postgres. A logica do passe de uso unico (hash,
  // validade, consumo) vive no backend, que e quem manda no schema; duplica-la
  // aqui abriria espaco para as duas copias divergirem num ponto sensivel.
  BACKEND_API_URL: z.string().default('http://todoapp_backend:3000/api'),
  // Mesma chave do backend: e o que autoriza o bot em /api/bot/*.
  BOT_SERVICE_KEY: z.string().min(1, 'BOT_SERVICE_KEY is required'),
  // Web Push (VAPID) — mesmas chaves do backend; opcional, sem elas o bot só
  // envia lembretes pelo Telegram.
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default('mailto:admin@astralwavelabel.com'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('[bot] Ambiente inválido:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
