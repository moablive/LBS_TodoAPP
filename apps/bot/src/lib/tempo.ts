/**
 * Hora local do usuário — e por que ela não é `new Date()`.
 *
 * O container do bot roda sem `TZ`, ou seja, em UTC. A coluna `tasks.scheduled_at`
 * é `timestamp` SEM fuso e guarda a **hora de parede de São Paulo** (foi assim
 * que a produção sempre gravou, e é o que a web lê de volta como hora local).
 *
 * Misturar as duas coisas dava dois defeitos reais:
 *
 *  - o prompt da IA dizia "Hoje é <ISO em UTC>", então entre 21h e meia-noite
 *    em São Paulo o modelo achava que já era o dia seguinte e agendava "amanhã"
 *    um dia à frente;
 *  - o cron comparava o carimbo nu (lido como UTC) com o instante real e
 *    disparava o lembrete 3 horas antes.
 *
 * A saída é trabalhar com "Date nu": um Date cujos componentes de parede são os
 * de São Paulo. Ele só serve para comparar e formatar com o MESMO fuso do
 * processo — nunca converta um destes com `timeZone`, ou o deslocamento volta.
 */

export const FUSO = 'America/Sao_Paulo';

const DIAS = [
  'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
  'quinta-feira', 'sexta-feira', 'sábado',
];

/** Agora, em hora de parede de São Paulo, como Date nu. */
export function agoraLocal(): Date {
  // 'sv-SE' dá "2026-09-16 22:25:03", que é ISO o bastante para reparsear.
  const s = new Date().toLocaleString('sv-SE', { timeZone: FUSO });
  return new Date(s.replace(' ', 'T'));
}

/** "quarta-feira, 16/09/2026, 22:25" — o que a IA precisa saber, por extenso. */
export function descricaoAgora(base: Date = agoraLocal()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${DIAS[base.getDay()]}, ${p(base.getDate())}/${p(base.getMonth() + 1)}/${base.getFullYear()}, ` +
    `${p(base.getHours())}:${p(base.getMinutes())}`
  );
}

/** "2026-09-17 15:00:00" — o formato que a coluna sem fuso espera. */
export function carimboNu(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
}

export type QuandoTipo = 'hoje' | 'amanha' | 'depois_de_amanha' | 'dia_da_semana' | 'data';

export interface QuandoBruto {
  tipo: QuandoTipo;
  diaDaSemana?: string | null;
  data?: string | null;
  hora?: string | null;
  semanaQueVem?: boolean;
}

const INDICE_DIA: Record<string, number> = {
  domingo: 0, segunda: 1, terca: 2, terça: 2, quarta: 3,
  quinta: 4, sexta: 5, sabado: 6, sábado: 6,
};

/** Meia-noite da segunda-feira que abre a próxima semana. */
function proximaSegunda(agora: Date): Date {
  const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  d.setDate(d.getDate() + ((8 - agora.getDay()) % 7 || 7));
  return d;
}

/**
 * Resolve a data EM CÓDIGO, não na IA.
 *
 * O modelo de 7B classifica bem a frase ("sexta", "amanhã", "que vem") e erra
 * feio a aritmética: pedindo a data pronta, "sexta-feira" voltou 15/09 numa
 * rodada e 22/09 noutra — uma terça em ambas. Aqui ele só diz QUE tipo de
 * referência ouviu; a conta do calendário é determinística e testável.
 */
export function resolverQuando(q: QuandoBruto, agora: Date = agoraLocal()): Date | null {
  // Sem hora não há compromisso: `''.split(':')` daria 0 e agendaria meia-noite
  // caladamente, que é pior do que devolver null e pedir para regravar.
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(q.hora ?? '').trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh > 23 || mm > 59) return null;

  const base = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), hh, mm, 0, 0);

  // O modelo inventa rótulo fora da lista — já devolveu "semana_que_vem", que
  // não existe no enum e caía no `default`, virando "sem data". Como ele acerta
  // os CAMPOS mesmo quando erra o rótulo, o tipo é deduzido do que veio junto.
  let tipo: string = String(q.tipo ?? '');
  if (!['hoje', 'amanha', 'depois_de_amanha', 'dia_da_semana', 'data'].includes(tipo)) {
    if (q.diaDaSemana) tipo = 'dia_da_semana';
    else if (q.data) tipo = 'data';
    else if (/amanha|amanhã/.test(tipo)) tipo = 'amanha';
    else if (/hoje/.test(tipo)) tipo = 'hoje';
    else return null;
  }

  switch (tipo) {
    case 'hoje':
      return base;

    case 'amanha':
      base.setDate(base.getDate() + 1);
      return base;

    case 'depois_de_amanha':
      base.setDate(base.getDate() + 2);
      return base;

    case 'data': {
      const bruto = (q.data || '').trim();
      // Pede-se YYYY-MM-DD, mas ele às vezes responde DD/MM/YYYY.
      const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(bruto);
      if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), hh, mm, 0, 0);
      const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(bruto);
      if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]), hh, mm, 0, 0);
      return null;
    }

    case 'dia_da_semana': {
      const chave = (q.diaDaSemana || '')
        .toLowerCase()
        .replace(/-feira| feira/g, '')
        .trim();
      const alvo = INDICE_DIA[chave];
      if (alvo === undefined) return null;

      let delta = (alvo - agora.getDay() + 7) % 7;
      // Mesmo dia com a hora já vencida = a próxima semana, não daqui a pouco.
      if (delta === 0 && base.getTime() <= agora.getTime()) delta = 7;
      base.setDate(base.getDate() + delta);

      // "que vem" = na semana seguinte a esta, e só empurra se a data achada
      // ainda cair NESTA semana. Numa quarta-feira, "terça que vem" já é a
      // terça da outra semana por si só — somar 7 pularia para a subsequente.
      if (q.semanaQueVem && base.getTime() < proximaSegunda(agora).getTime()) {
        base.setDate(base.getDate() + 7);
      }
      return base;
    }

    default:
      return null;
  }
}

/** A string tem fuso embutido (Z ou ±hh:mm)? */
export function temFuso(iso: string): boolean {
  return /(?:Z|[+-]\d{2}:?\d{2})$/.test(iso.trim());
}

/**
 * Normaliza o que a IA devolveu para hora de parede.
 *
 * Se vier com `Z`, o modelo quase sempre quis dizer "15h para o usuário" e
 * carimbou o fuso por hábito do exemplo — respeitar o Z literalmente deslocaria
 * a reunião em 3 horas. Por isso o fuso é descartado, não convertido.
 */
export function paraHoraDeParede(iso: string): Date | null {
  const limpo = iso.trim().replace(/(?:Z|[+-]\d{2}:?\d{2})$/, '');
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(limpo);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? 0));
}
