import type { NextFunction, Request, Response } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Dono dos dados: o `loginhub_id`, como string (as colunas são varchar). */
      ownerId?: string;
    }
  }
}

/**
 * Quem é o dono da linha — sempre o `loginhub_id`.
 *
 * POR QUE ISTO MUDOU
 *
 * Até aqui o dono era o `telegram_id`, resolvido em `user_settings`, com fallback
 * para o `loginhubId` enquanto não houvesse Telegram vinculado. Duas identidades
 * para a mesma pessoa, e o vínculo decidindo qual valia — foi a origem de quase
 * todo defeito que passamos a semana caçando:
 *
 *   • vincular o Telegram MIGRAVA os dados de um namespace para o outro, e a
 *     migração tinha de ser repetida em cada caminho novo (wizard, passe);
 *   • recriar a conta no hub trocava o `loginhub_id`, o vínculo antigo apontava
 *     para uma conta morta e a web mostrava um app VAZIO enquanto o bot seguia
 *     enxergando tudo — os dados estavam sob o telegram_id;
 *   • `user_settings` acumulava linhas órfãs de contas que não existiam mais.
 *
 * O MoneyAPP nunca teve nada disso porque sempre chaveou por `loginhub_id`. O
 * hub é o dono da identidade; o Telegram é só mais um canal por onde a mesma
 * pessoa fala. Agora é assim aqui também.
 *
 * Não lê o banco: o `loginhubId` já veio assinado no JWT e validado pela guarda.
 */
export function resolveOwnerId(req: Request, _res: Response, next: NextFunction) {
  req.ownerId = String(req.user!.loginhubId);
  next();
}
