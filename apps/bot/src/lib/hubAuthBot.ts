/**
 * Ligação do LoginHUB para os bots de Telegram.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ ARQUIVO SINCRONIZADO — não edite a cópia dentro de um bot.            │
 * │ Fonte: LoginHUB/packages/auth-kit/src/hubAuthBot.ts                    │
 * │ Propague com: LoginHUB/scripts/sync-auth-kit.sh                        │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * POR QUE O `hubAuthClient` SOZINHO NÃO SERVE AQUI
 *
 * O cliente dos frontends guarda a sessão num storage ambiente, e no browser
 * isso é seguro: há uma pessoa por processo. Um bot é o inverso — UM processo
 * atende N chats ao mesmo tempo, e um storage ambiente entregaria a sessão de
 * quem entrou por último a todos os outros. `getToken()` seria a credencial do
 * vizinho.
 *
 * Então aqui o storage não guarda NADA e o token volta para quem chamou, que o
 * amarra ao chat. Na prática nenhum bot precisa guardá-lo: a sessão serve para
 * descobrir de quem é a conta e gravar o vínculo `telegram_id → loginhub_id`;
 * depois disso é o vínculo que autoriza, e o token pode ser esquecido.
 *
 * O QUE ESTE ARQUIVO CONCENTRA
 *
 * O contrato é o mesmo do `hubAuthClient` — os três desfechos de `/auth/login`
 * —, e é justamente por isso que ele não é reescrito aqui: este módulo é uma
 * camada fina sobre aquele. O que ele acrescenta é o que cada bot vinha
 * resolvendo por conta própria, cada um do seu jeito:
 *
 *   • roteamento TOTP × código de recuperação (rotas diferentes no hub)
 *   • montagem do link da tela de enrolamento do hub
 *   • identificação do dono da sessão para gravar o vínculo
 */

import {
    createHubAuth,
    HubApiError,
    type HubSessionData,
    type HubStorage,
    type LoginResult,
    type MetodoSegundoFator,
} from './hubAuthClient.js';

export type { HubSessionData, LoginResult, MetodoSegundoFator };
export { HubApiError };

export interface HubAuthBotConfig {
    /** Base da API do hub, ex.: `http://server_loginhub_backend:3000/api`. */
    baseUrl: string;
    /**
     * ID deste app no hub.
     *
     * Sem ele, um e-mail cadastrado em mais de um app devolve 409
     * AMBIGUOUS_EMAIL — que no chat aparece como "erro interno".
     */
    appId?: string | number;
    /**
     * Painel PÚBLICO do hub, ex.: `https://loginhub.astralwavelabel.com`.
     *
     * Endereço público e não o interno do container: ele entra num link que a
     * pessoa abre no navegador do celular dela, fora da rede do Docker.
     */
    uiUrl?: string;
}

/** Quem é o dono da sessão que acabou de nascer. */
export interface DonoDaSessao {
    loginhubId: number;
    email?: string;
    nome?: string;
    role?: string;
}

/**
 * Storage que não guarda nada.
 *
 * É o coração da diferença entre bot e frontend. Não é economia de memória: é
 * a garantia de que duas conversas simultâneas não compartilham credencial.
 */
const storageNulo: HubStorage = {
    get: () => null,
    set: () => {},
    remove: () => {},
};

const textoUtil = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/**
 * Código do autenticador: exatamente 6 dígitos.
 *
 * O de recuperação tem formato próprio (`XXXXX-XXXXX`) e rota própria, porque é
 * de uso único e não passa pela conferência de TOTP. Mandar um na rota do outro
 * devolve 400 — daí a triagem morar aqui e não em cada wizard.
 */
export const ehCodigoTotp = (entrada: string): boolean => /^\d{6}$/.test(entrada.trim());

/**
 * Lê o `sub` do JWT SEM conferir assinatura.
 *
 * Pode: este token não veio de um chamador desconhecido, veio da resposta do
 * hub para uma requisição que o próprio bot acabou de fazer por HTTP. O bot não
 * tem — nem deve ter — o `JWT_SECRET`; quem valida token de terceiro é a API do
 * app, com o `hubAuthServer`. Aqui o payload só serve para nomear a linha que
 * vai receber o vínculo.
 */
function subDoToken(token: string): number | null {
    try {
        const parte = token.split('.')[1];
        if (!textoUtil(parte)) return null;
        const payload = JSON.parse(Buffer.from(parte, 'base64url').toString()) as { sub?: unknown };
        const id = parseInt(String(payload.sub), 10);
        return Number.isFinite(id) ? id : null;
    } catch {
        return null;
    }
}

export function criarHubAuthBot(config: HubAuthBotConfig) {
    const hub = createHubAuth({
        baseUrl: config.baseUrl,
        appId: config.appId,
        storage: storageNulo,
    });

    // Tolerante na construção, rigoroso no uso — mesma regra do `hubAuthClient`:
    // um bot sem `uiUrl` ainda faz login e vincula; só não sabe montar o link de
    // enrolamento, e o erro sai lá, com código.
    const ui = (config.uiUrl ?? '').replace(/\/+$/, '');

    return {
        /**
         * Primeira etapa. Devolve qual dos três desfechos ocorreu — e nada é
         * gravado em lugar nenhum.
         *
         *   sessao   → conta sem pendência; siga para o vínculo
         *   desafio  → peça o código e chame `segundoFator` (janela de 5 min)
         *   enrolar  → mande o link de `linkEnrolamento` (janela de 10 min)
         */
        login(email: string, password: string): Promise<LoginResult> {
            return hub.login(email, password);
        },

        /**
         * Segunda etapa: fecha o login que o `login` deixou pendente.
         *
         * Aceita o código do autenticador ou um de recuperação — a rota certa
         * sai do formato, ver `ehCodigoTotp`.
         */
        segundoFator(challengeToken: string, entrada: string): Promise<HubSessionData> {
            const codigo = entrada.trim();
            return ehCodigoTotp(codigo)
                ? hub.twoFactor.verify(challengeToken, codigo)
                : hub.twoFactor.verifyBackup(challengeToken, codigo);
        },

        /**
         * Link da tela de enrolamento do hub, para o desfecho `enrolar`.
         *
         * Um bot não escaneia QR nem hospeda tela: ele manda a pessoa para a
         * página que TODOS os apps compartilham. Reimplementar enrolamento no
         * chat significaria o secret do TOTP passeando pelo histórico do
         * Telegram — o mesmo canal por onde o bot conversa.
         */
        linkEnrolamento(setupToken: string): string {
            if (!ui) {
                throw new HubApiError(
                    500,
                    'CONFIG_AUSENTE',
                    'A URL do painel do LoginHUB nao esta configurada neste bot.',
                );
            }
            return `${ui}/enrolar-2fa?token=${encodeURIComponent(setupToken)}`;
        },

        /**
         * De quem é a sessão — é este id que vira o vínculo com o telegram_id.
         *
         * `usuario` vem preenchido no `/auth/login` e no `/auth/2fa/verify`,
         * mas nem toda resposta de sessão o traz; o `sub` do token é o mesmo
         * dado e está sempre lá.
         */
        donoDaSessao(session: HubSessionData): DonoDaSessao | null {
            const doPayload = subDoToken(session.token);
            const doCorpo = session.usuario ? parseInt(String(session.usuario.id), 10) : NaN;
            const loginhubId = Number.isFinite(doCorpo) ? doCorpo : doPayload;
            if (loginhubId === null || !Number.isFinite(loginhubId)) return null;

            return {
                loginhubId,
                email: session.usuario?.email,
                nome: session.usuario?.nome,
                role: session.usuario?.role,
            };
        },
    };
}

export type HubAuthBot = ReturnType<typeof criarHubAuthBot>;
