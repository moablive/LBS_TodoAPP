// Sobras do monorepo do MoneyAPP, de onde este projeto foi clonado:
// `categories.ts` e `investments.ts` consultavam `schema.categories`,
// `schema.investments`, `schema.transactions` e `schema.accounts` — tabelas que
// nunca existiram no TodoAPP. Nada aqui as importava (0 usos em backend, bot,
// frontend, models e api-client), mas o `tsc --noEmit` do backend as compilava
// pelo `include` e falhava com 25 erros. Removidas em 27/08/2026.
export * from './ics.js';
export * from './config/env.js';
