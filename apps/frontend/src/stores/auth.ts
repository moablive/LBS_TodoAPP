import { defineStore } from 'pinia';
import { createHubAuth } from '../lib/hubAuthClient';
import { createCofreEntrada } from '../lib/cofreEntrada';
import type { LoginRequest } from '@todoapp/models';

const LOGINHUB_API = import.meta.env.VITE_LOGINHUB_API_URL || 'https://loginhub.astralwavelabel.com/api';
/** Sem o app_id o hub responde 409 AMBIGUOUS_EMAIL para e-mail repetido entre apps. */
const APP_ID = import.meta.env.VITE_LOGINHUB_APP_ID as string | undefined;

const hub = createHubAuth({
  baseUrl: LOGINHUB_API,
  appId: APP_ID,
  tokenKey: 'token',
});

// Entrada pelo cofre do LoginHUB: a chave da conta mora no cofre, que abre com a digital.
const cofre = createCofreEntrada({ baseUrl: LOGINHUB_API, appId: APP_ID ?? '' });

/** Instancia do hub, exposta para a secao Seguranca (SegurancaConta.vue). */
export const hubCliente = hub;

/**
 * Sessao do LoginHUB.
 *
 * `/auth/login` responde 200 em TRES desfechos e so um traz sessao. A versao
 * anterior fazia `localStorage.setItem('token', res.token)` direto: nos
 * outros dois `res.token` e undefined, o DOM gravava a string "undefined" —
 * truthy — e o app se dava por autenticado com lixo, entrando num laco de 401.
 *
 * Toda a conversa com o hub passa agora pelo auth-kit (`lib/hubAuthClient.ts`),
 * fonte sincronizada e identica em todos os apps.
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: hub.getToken(),
    /**
     * Desafio pendente: a senha conferiu, mas a conta exige o codigo do
     * autenticador e a sessao ainda NAO existe.
     */
    challengeToken: null as string | null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    aguardandoSegundoFator: (state) => state.challengeToken !== null,
    /** O desafio pendente e de codigo por e-mail (claim `met`)? So escolhe o texto da tela. */
    desafioPorEmail: (state) => {
      if (!state.challengeToken) return false;
      try {
        const corpo = state.challengeToken.split('.')[1] ?? '';
        return JSON.parse(atob(corpo.replace(/-/g, '+').replace(/_/g, '/'))).met === 'email';
      } catch {
        return false;
      }
    },
  },
  actions: {
    /**
     * Devolve a etapa alcancada:
     *   'sessao'  — autenticado, pode navegar
     *   '2fa'     — pedir o codigo e chamar `verificarSegundoFator`
     *   'enrolar' — montar o QR aqui mesmo com `setupToken` (TwoFactorEnroll)
     */
    async login(payload: LoginRequest) {
      this.challengeToken = null;
      const r = await hub.login(payload.email, payload.password);

      if (r.status === 'desafio') {
        this.challengeToken = r.challengeToken;
        return { etapa: '2fa' as const };
      }
      if (r.status === 'enrolar') {
        return { etapa: 'enrolar' as const, setupToken: r.setupToken };
      }

      this.token = r.session.token;
      return { etapa: 'sessao' as const };
    },

    /** Pede o codigo de 6 digitos por e-mail (resposta igual exista a conta ou nao). */
    async emailStart(email: string) {
      this.challengeToken = null;
      return hub.emailStart(email);
    },

    /** Confere o codigo do e-mail: mesmos tres desfechos do login por senha. */
    async emailVerify(challengeId: string, codigo: string) {
      this.challengeToken = null;
      const r = await hub.emailVerify(challengeId, codigo);
      if (r.status === 'desafio') {
        this.challengeToken = r.challengeToken;
        return { etapa: '2fa' as const };
      }
      if (r.status === 'enrolar') {
        return { etapa: 'enrolar' as const, setupToken: r.setupToken };
      }
      this.token = r.session.token;
      return { etapa: 'sessao' as const };
    },

    /**
     * Enrolamento de 2FA, passo 1: pede o secret e a URI `otpauth://` ao hub.
     *
     * O QR e desenhado NO NAVEGADOR a partir dessa URI (ver TwoFactorEnroll) —
     * o segredo nao vai para gerador de terceiro nenhum, e nao atravessa
     * origem: antes o passe viajava na query string para o painel do hub, o que
     * o deixava no historico do navegador e em log de acesso.
     */
    async iniciarEnrolamento(setupToken: string) {
      return hub.twoFactor.setup(setupToken);
    },

    /**
     * Passo 2: confirma com o codigo do autenticador.
     *
     * A ativacao mata o passe que fez esta chamada e devolve uma sessao nova —
     * o kit ja a grava. Sincronizar `this.token` aqui e o que evita a pessoa
     * ser deslogada no exato momento em que terminou o convite.
     *
     * Os `backupCodes` aparecem UMA vez so; quem chama tem de mostra-los.
     */
    async confirmarEnrolamento(codigo: string, setupToken: string) {
      const r = await hub.twoFactor.verifySetup(codigo, setupToken);
      this.token = hub.getToken();
      return r;
    },

    /** Fecha o login pendente com o codigo do autenticador (ou de recuperacao). */
    async verificarSegundoFator(codigo: string, usarBackup = false) {
      if (!this.challengeToken) throw new Error('sem_desafio');
      const sessao = usarBackup
        ? await hub.twoFactor.verifyBackup(this.challengeToken, codigo)
        : await hub.twoFactor.verify(this.challengeToken, codigo);
      this.challengeToken = null;
      this.token = sessao.token;
    },

    /**
     * Define a senha pelo magic link (convite ou reset).
     *
     * Substitui o antigo `changePassword`, que batia em `/auth/change-password`
     * — rota removida do hub. Senha se define pelo magic link, e ponto.
     */
    async setupPassword(magicLinkToken: string, novaSenha: string) {
      const r = await hub.setupPassword(magicLinkToken, novaSenha);

      if (r.status === 'desafio') {
        // Conta que JA tem autenticador (tipico de reset): a senha nova sozinha
        // nao abre sessao, senao o reset seria atalho para pular o 2FA.
        this.challengeToken = r.challengeToken;
        return { etapa: '2fa' as const };
      }
      if (r.status === 'enrolar') {
        return { etapa: 'enrolar' as const, setupToken: r.setupToken };
      }

      this.token = r.session.token;
      return { etapa: 'sessao' as const };
    },

    /**
     * Renova o JWT no LoginHub (grace de 7 dias). Retorna true se renovou.
     * Chamado pelo api-client via `tryRefresh` — o single-flight e o logout
     * em caso de falha (`onUnauthorized`) ficam por conta do client.
     */
    async refreshToken(): Promise<boolean> {
      const novo = await hub.refresh();
      if (!novo) return false;
      this.token = novo;
      return true;
    },

    /** Sai do app para o cofre do LoginHUB, que abre com a digital e assina a entrada. A volta e em `/entrar`. */
    async irAoCofreParaEntrar() {
      this.challengeToken = null;
      await cofre.irParaEntrar();
    },

    /**
     * Volta do cofre: troca a assinatura que veio no `#` pela sessao (a mesma do
     * login completo). Devolve `false` quando a tela abriu sem volta do cofre.
     */
    async concluirEntradaPeloCofre(): Promise<boolean> {
      const sessao = await cofre.concluir();
      if (!sessao) return false;
      // O hub pode omitir o `role` aqui; o kit guarda o perfil com o campo sempre presente.
      hub.salvarSessao({ ...sessao, usuario: sessao.usuario && { ...sessao.usuario, role: sessao.usuario.role ?? '' } });
      this.token = sessao.token;
      return true;
    },

    logout() {
      hub.logout();
      this.token = null;
      this.challengeToken = null;
      window.location.href = '/login';
    },
  },
});
