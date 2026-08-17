/**
 * Parser + expansor de iCalendar (RFC 5545) — sem dependências externas.
 *
 * Cobre o que feeds reais de Proton Calendar, Google Calendar e Outlook emitem:
 * VEVENT com DTSTART/DTEND/DURATION, TZID (IANA e os nomes do Windows),
 * eventos de dia inteiro, RRULE (DAILY/WEEKLY/MONTHLY/YEARLY + INTERVAL,
 * COUNT, UNTIL, BYDAY, BYMONTHDAY, BYMONTH), EXDATE, RECURRENCE-ID
 * (ocorrência remarcada) e STATUS:CANCELLED.
 *
 * As datas são resolvidas para instantes absolutos (UTC) usando a base de
 * fusos do ICU via `Intl` — a recorrência é expandida no CALENDÁRIO LOCAL do
 * evento (é assim que o RFC define), então uma reunião das 09h continua às 09h
 * depois da virada do horário de verão.
 */

// ── Fusos ────────────────────────────────────────────────────────────────────

// Outlook/Exchange emitem nomes de fuso do Windows em vez de IANA. Mapa dos
// que aparecem na prática por aqui; qualquer outro cai no fuso padrão do app.
const WINDOWS_TZ: Record<string, string> = {
  'E. South America Standard Time': 'America/Sao_Paulo',
  'SA Eastern Standard Time': 'America/Fortaleza',
  'SA Western Standard Time': 'America/La_Paz',
  'SA Pacific Standard Time': 'America/Bogota',
  'Argentina Standard Time': 'America/Argentina/Buenos_Aires',
  'UTC': 'UTC',
  'GMT Standard Time': 'Europe/London',
  'W. Europe Standard Time': 'Europe/Berlin',
  'Romance Standard Time': 'Europe/Paris',
  'Central Europe Standard Time': 'Europe/Budapest',
  'Eastern Standard Time': 'America/New_York',
  'Central Standard Time': 'America/Chicago',
  'Mountain Standard Time': 'America/Denver',
  'Pacific Standard Time': 'America/Los_Angeles',
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** Normaliza o TZID do arquivo para um fuso IANA que o ICU aceite. */
export function resolveTimeZone(tzid: string | undefined, fallback: string): string {
  if (!tzid) return fallback;
  const clean = tzid.replace(/^"|"$/g, '').trim();
  const candidate = WINDOWS_TZ[clean] ?? clean;
  try {
    formatterFor(candidate);
    return candidate;
  } catch {
    return fallback;
  }
}

/** Deslocamento (ms) do fuso `tz` no instante dado. */
function tzOffsetMs(instant: number, tz: string): number {
  const parts = formatterFor(tz).formatToParts(new Date(instant));
  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(num('year'), num('month') - 1, num('day'), num('hour'), num('minute'), num('second'));
  return asUtc - instant;
}

/** Data/hora "de parede" (sem fuso) — como o RFC representa um horário local. */
export interface Civil {
  y: number;
  m: number; // 1-12
  d: number;
  h: number;
  mi: number;
  s: number;
}

/** Converte um horário de parede num fuso para o instante absoluto (epoch ms). */
export function civilToInstant(c: Civil, tz: string): number {
  const asUtc = Date.UTC(c.y, c.m - 1, c.d, c.h, c.mi, c.s);
  const first = tzOffsetMs(asUtc, tz);
  const ts = asUtc - first;
  // Segunda passada: perto da virada de horário de verão o offset usado na
  // primeira estimativa pode ser o do lado errado da transição.
  const second = tzOffsetMs(ts, tz);
  return second === first ? ts : asUtc - second;
}

function civilFromUtc(instant: number): Civil {
  const d = new Date(instant);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth() + 1,
    d: d.getUTCDate(),
    h: d.getUTCHours(),
    mi: d.getUTCMinutes(),
    s: d.getUTCSeconds(),
  };
}

/** Serializa o campo de data (ignora a hora) como número YYYYMMDD comparável. */
function civilDayNum(c: Civil): number {
  return c.y * 10000 + c.m * 100 + c.d;
}

function addDays(c: Civil, days: number): Civil {
  const t = Date.UTC(c.y, c.m - 1, c.d + days);
  const d = new Date(t);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: c.h, mi: c.mi, s: c.s };
}

/** Dia da semana 0=domingo (calculado sobre os campos civis, sem fuso). */
function weekday(c: Civil): number {
  return new Date(Date.UTC(c.y, c.m - 1, c.d)).getUTCDay();
}

function daysBetween(a: Civil, b: Civil): number {
  const ms = Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d);
  return Math.round(ms / 86_400_000);
}

// ── Tokenização ──────────────────────────────────────────────────────────────

interface Prop {
  name: string;
  params: Record<string, string>;
  value: string;
}

/** Desfaz o "line folding" do RFC (continuação começa com espaço ou tab). */
function unfold(raw: string): string[] {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length) {
      out[out.length - 1] += line.slice(1);
    } else if (line.length) {
      out.push(line);
    }
  }
  return out;
}

function unescapeText(v: string): string {
  return v
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function parseProp(line: string): Prop | null {
  // O ':' que separa nome/valor é o primeiro fora de aspas.
  let colon = -1;
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') quoted = !quoted;
    else if (ch === ':' && !quoted) {
      colon = i;
      break;
    }
  }
  if (colon < 0) return null;

  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const segments = head.split(';');
  const name = (segments.shift() ?? '').toUpperCase();
  const params: Record<string, string> = {};
  for (const seg of segments) {
    const eq = seg.indexOf('=');
    if (eq < 0) continue;
    params[seg.slice(0, eq).toUpperCase()] = seg.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name, params, value };
}

// ── Datas do iCalendar ───────────────────────────────────────────────────────

interface IcsDate {
  civil: Civil;
  tz: string;
  instant: number;
  allDay: boolean;
}

function parseIcsDate(prop: Prop, defaultTz: string): IcsDate | null {
  const raw = prop.value.trim();
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(raw);
  if (dateOnly || prop.params.VALUE === 'DATE') {
    const m = dateOnly ?? /^(\d{4})(\d{2})(\d{2})/.exec(raw);
    if (!m) return null;
    // Dia inteiro: meia-noite no fuso de exibição do app — é o que faz o bloco
    // cair no dia certo no calendário do usuário.
    const civil: Civil = { y: +m[1]!, m: +m[2]!, d: +m[3]!, h: 0, mi: 0, s: 0 };
    return { civil, tz: defaultTz, instant: civilToInstant(civil, defaultTz), allDay: true };
  }

  const dt = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(raw);
  if (!dt) return null;
  const civil: Civil = { y: +dt[1]!, m: +dt[2]!, d: +dt[3]!, h: +dt[4]!, mi: +dt[5]!, s: +dt[6]! };
  if (dt[7]) {
    const instant = Date.UTC(civil.y, civil.m - 1, civil.d, civil.h, civil.mi, civil.s);
    return { civil, tz: 'UTC', instant, allDay: false };
  }
  const tz = resolveTimeZone(prop.params.TZID, defaultTz);
  return { civil, tz, instant: civilToInstant(civil, tz), allDay: false };
}

/** DURATION do RFC: P[n]W | P[n]DT[n]H[n]M[n]S. Retorna minutos. */
function parseDuration(value: string): number | null {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value.trim());
  if (!m) return null;
  const sign = m[1] === '-' ? -1 : 1;
  const minutes =
    (Number(m[2] ?? 0) * 7 * 24 * 60) +
    (Number(m[3] ?? 0) * 24 * 60) +
    (Number(m[4] ?? 0) * 60) +
    Number(m[5] ?? 0) +
    Math.round(Number(m[6] ?? 0) / 60);
  return sign * minutes;
}

// ── RRULE ────────────────────────────────────────────────────────────────────

const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

interface ByDay {
  ordinal: number | null; // 2TU = 2ª terça; -1FR = última sexta
  day: number; // 0=domingo
}

interface RRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  count: number | null;
  untilInstant: number | null;
  byDay: ByDay[];
  byMonthDay: number[];
  byMonth: number[];
  wkst: number;
}

function parseRRule(value: string, defaultTz: string): RRule | null {
  const parts: Record<string, string> = {};
  for (const chunk of value.split(';')) {
    const eq = chunk.indexOf('=');
    if (eq > 0) parts[chunk.slice(0, eq).toUpperCase()] = chunk.slice(eq + 1);
  }
  const freq = (parts.FREQ ?? '').toUpperCase();
  if (freq !== 'DAILY' && freq !== 'WEEKLY' && freq !== 'MONTHLY' && freq !== 'YEARLY') {
    // SECONDLY/MINUTELY/HOURLY não fazem sentido num calendário de tarefas.
    return null;
  }

  let untilInstant: number | null = null;
  if (parts.UNTIL) {
    const parsed = parseIcsDate({ name: 'UNTIL', params: {}, value: parts.UNTIL }, defaultTz);
    untilInstant = parsed?.instant ?? null;
  }

  const byDay: ByDay[] = [];
  for (const token of (parts.BYDAY ?? '').split(',').filter(Boolean)) {
    const m = /^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/i.exec(token.trim());
    if (!m) continue;
    byDay.push({ ordinal: m[1] ? Number(m[1]) : null, day: WEEKDAY_CODES.indexOf(m[2]!.toUpperCase()) });
  }

  const numbers = (raw: string | undefined) =>
    (raw ?? '')
      .split(',')
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n) && n !== 0);

  return {
    freq,
    interval: Math.max(1, Number(parts.INTERVAL ?? 1) || 1),
    count: parts.COUNT ? Number(parts.COUNT) : null,
    untilInstant,
    byDay,
    byMonthDay: numbers(parts.BYMONTHDAY),
    byMonth: numbers(parts.BYMONTH),
    wkst: Math.max(0, WEEKDAY_CODES.indexOf((parts.WKST ?? 'MO').toUpperCase())),
  };
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Início da semana (segundo WKST) que contém a data. */
function weekStart(c: Civil, wkst: number): Civil {
  const diff = (weekday(c) - wkst + 7) % 7;
  return addDays(c, -diff);
}

function matchesByDay(c: Civil, rule: RRule): boolean {
  if (!rule.byDay.length) return true;
  const dow = weekday(c);
  return rule.byDay.some((bd) => {
    if (bd.day !== dow) return false;
    if (bd.ordinal === null) return true;
    if (rule.freq === 'MONTHLY') {
      const nth = Math.floor((c.d - 1) / 7) + 1;
      if (bd.ordinal > 0) return nth === bd.ordinal;
      const fromEnd = Math.floor((daysInMonth(c.y, c.m) - c.d) / 7) + 1;
      return fromEnd === -bd.ordinal;
    }
    // Ordinais anuais (ex.: 3ª segunda do ano) são raros; trata como simples.
    return true;
  });
}

/** A data civil é uma ocorrência válida da regra iniciada em `start`? */
function matchesRule(c: Civil, start: Civil, rule: RRule): boolean {
  if (rule.byMonth.length && !rule.byMonth.includes(c.m)) return false;

  switch (rule.freq) {
    case 'DAILY': {
      if (daysBetween(start, c) % rule.interval !== 0) return false;
      return matchesByDay(c, rule);
    }
    case 'WEEKLY': {
      const weeks = daysBetween(weekStart(start, rule.wkst), weekStart(c, rule.wkst)) / 7;
      if (!Number.isInteger(weeks) || weeks % rule.interval !== 0) return false;
      if (!rule.byDay.length) return weekday(c) === weekday(start);
      return matchesByDay(c, rule);
    }
    case 'MONTHLY': {
      const months = (c.y - start.y) * 12 + (c.m - start.m);
      if (months % rule.interval !== 0) return false;
      if (rule.byDay.length) return matchesByDay(c, rule);
      if (rule.byMonthDay.length) {
        const last = daysInMonth(c.y, c.m);
        return rule.byMonthDay.some((n) => (n > 0 ? n === c.d : last + n + 1 === c.d));
      }
      return c.d === start.d;
    }
    case 'YEARLY': {
      const years = c.y - start.y;
      if (years % rule.interval !== 0) return false;
      if (!rule.byMonth.length && c.m !== start.m) return false;
      if (rule.byDay.length) return matchesByDay(c, rule);
      if (rule.byMonthDay.length) return rule.byMonthDay.includes(c.d);
      return c.d === start.d;
    }
  }
}

// ── Eventos ──────────────────────────────────────────────────────────────────

interface RawEvent {
  uid: string;
  summary: string;
  description: string;
  location: string;
  url: string;
  organizer: string;
  conference: string;
  start: IcsDate | null;
  end: IcsDate | null;
  durationMinutes: number | null;
  rrule: string | null;
  exdates: number[];
  recurrenceId: IcsDate | null;
  cancelled: boolean;
  transparent: boolean;
}

/** Uma ocorrência concreta, pronta para virar tarefa. */
export interface IcsOccurrence {
  /** UID do VEVENT no feed. */
  uid: string;
  /**
   * Chave estável da ocorrência: `uid` para evento simples, `uid#<slot>` para
   * cada ocorrência de uma série (o slot é o horário ORIGINAL, então remarcar
   * uma ocorrência atualiza a tarefa em vez de criar outra).
   */
  key: string;
  summary: string;
  start: Date;
  durationMinutes: number;
  allDay: boolean;
  location: string;
  description: string;
  url: string;
  organizer: string;
  recurring: boolean;
}

export interface ParseOptions {
  /** Fuso usado quando o feed não informa TZID (e para eventos de dia inteiro). */
  defaultTimeZone?: string;
  /** Janela de expansão. */
  windowStart: Date;
  windowEnd: Date;
  /** Teto de ocorrências geradas por evento recorrente. */
  maxPerEvent?: number;
  /** Teto de ocorrências geradas pelo feed inteiro. */
  maxTotal?: number;
}

export interface ParseResult {
  occurrences: IcsOccurrence[];
  /** Nome do calendário anunciado pelo feed (X-WR-CALNAME), se houver. */
  calendarName: string | null;
  /** true quando algum teto foi atingido e o feed foi truncado. */
  truncated: boolean;
}

const DEFAULT_DURATION_MINUTES = 60;

function emptyEvent(): RawEvent {
  return {
    uid: '',
    summary: '',
    description: '',
    location: '',
    url: '',
    organizer: '',
    conference: '',
    start: null,
    end: null,
    durationMinutes: null,
    rrule: null,
    exdates: [],
    recurrenceId: null,
    cancelled: false,
    transparent: false,
  };
}

function collectEvents(raw: string, defaultTz: string): { events: RawEvent[]; calendarName: string | null } {
  const events: RawEvent[] = [];
  let calendarName: string | null = null;
  let current: RawEvent | null = null;
  // VTIMEZONE traz DTSTART/RRULE próprios das regras de horário de verão —
  // usamos o ICU para isso, então o bloco inteiro é ignorado.
  let skipDepth = 0;
  let feedTz = defaultTz;

  for (const line of unfold(raw)) {
    const prop = parseProp(line);
    if (!prop) continue;

    if (prop.name === 'BEGIN') {
      const kind = prop.value.toUpperCase();
      if (kind === 'VEVENT' && !skipDepth) current = emptyEvent();
      else if (kind !== 'VCALENDAR' && !current) skipDepth++;
      else if (current && kind !== 'VEVENT') skipDepth++; // VALARM dentro do evento
      continue;
    }
    if (prop.name === 'END') {
      const kind = prop.value.toUpperCase();
      if (skipDepth) skipDepth--;
      else if (kind === 'VEVENT' && current) {
        if (current.uid && current.start) events.push(current);
        current = null;
      }
      continue;
    }
    if (skipDepth) continue;

    if (!current) {
      if (prop.name === 'X-WR-CALNAME') calendarName = unescapeText(prop.value).trim() || null;
      if (prop.name === 'X-WR-TIMEZONE') feedTz = resolveTimeZone(prop.value, defaultTz);
      continue;
    }

    switch (prop.name) {
      case 'UID':
        current.uid = prop.value.trim();
        break;
      case 'SUMMARY':
        current.summary = unescapeText(prop.value).trim();
        break;
      case 'DESCRIPTION':
        current.description = unescapeText(prop.value).trim();
        break;
      case 'LOCATION':
        current.location = unescapeText(prop.value).trim();
        break;
      case 'URL':
        current.url = prop.value.trim();
        break;
      case 'ORGANIZER':
        current.organizer =
          (prop.params.CN ? unescapeText(prop.params.CN) : '') ||
          prop.value.replace(/^mailto:/i, '').trim();
        break;
      case 'X-GOOGLE-CONFERENCE':
        current.conference = prop.value.trim();
        break;
      case 'DTSTART':
        current.start = parseIcsDate(prop, feedTz);
        break;
      case 'DTEND':
        current.end = parseIcsDate(prop, feedTz);
        break;
      case 'DURATION':
        current.durationMinutes = parseDuration(prop.value);
        break;
      case 'RRULE':
        current.rrule = prop.value.trim();
        break;
      case 'EXDATE': {
        for (const piece of prop.value.split(',')) {
          const d = parseIcsDate({ name: 'EXDATE', params: prop.params, value: piece }, feedTz);
          if (d) current.exdates.push(d.instant);
        }
        break;
      }
      case 'RECURRENCE-ID':
        current.recurrenceId = parseIcsDate(prop, feedTz);
        break;
      case 'STATUS':
        current.cancelled = prop.value.trim().toUpperCase() === 'CANCELLED';
        break;
      case 'TRANSP':
        current.transparent = prop.value.trim().toUpperCase() === 'TRANSPARENT';
        break;
      case 'METHOD':
        break;
      default:
        break;
    }
  }

  return { events, calendarName };
}

function durationOf(ev: RawEvent): number {
  if (ev.durationMinutes && ev.durationMinutes > 0) return ev.durationMinutes;
  if (ev.end && ev.start) {
    const minutes = Math.round((ev.end.instant - ev.start.instant) / 60_000);
    if (minutes > 0) return minutes;
  }
  if (ev.start?.allDay) return 24 * 60;
  return DEFAULT_DURATION_MINUTES;
}

function toOccurrence(ev: RawEvent, key: string, startInstant: number, recurring: boolean): IcsOccurrence {
  return {
    uid: ev.uid,
    key,
    summary: ev.summary || '(sem título)',
    start: new Date(startInstant),
    durationMinutes: durationOf(ev),
    allDay: ev.start?.allDay ?? false,
    location: ev.location,
    description: ev.description,
    url: ev.url || ev.conference,
    organizer: ev.organizer,
    recurring,
  };
}

/**
 * Lê um feed .ics e devolve as ocorrências dentro da janela pedida.
 * Nunca lança por conteúdo malformado: linhas que não fazem sentido são
 * ignoradas — um feed quebrado deve degradar, não derrubar a sync.
 */
export function parseIcs(raw: string, opts: ParseOptions): ParseResult {
  const defaultTz = opts.defaultTimeZone || 'UTC';
  const maxPerEvent = opts.maxPerEvent ?? 400;
  const maxTotal = opts.maxTotal ?? 3000;
  const winStart = opts.windowStart.getTime();
  const winEnd = opts.windowEnd.getTime();

  const { events, calendarName } = collectEvents(raw, defaultTz);

  // Ocorrências remarcadas/canceladas individualmente chegam como VEVENTs
  // separados com o mesmo UID + RECURRENCE-ID apontando para o horário original.
  const overrides = new Map<string, RawEvent>();
  const masters: RawEvent[] = [];
  for (const ev of events) {
    if (ev.recurrenceId) overrides.set(`${ev.uid}#${ev.recurrenceId.instant}`, ev);
    else masters.push(ev);
  }

  const occurrences: IcsOccurrence[] = [];
  const seen = new Set<string>();
  let truncated = false;

  const push = (occ: IcsOccurrence): boolean => {
    if (seen.has(occ.key)) return true;
    if (occurrences.length >= maxTotal) {
      truncated = true;
      return false;
    }
    seen.add(occ.key);
    occurrences.push(occ);
    return true;
  };

  for (const ev of masters) {
    const start = ev.start!;
    const rule = ev.rrule ? parseRRule(ev.rrule, start.tz) : null;

    if (!rule) {
      if (ev.cancelled) continue;
      const end = start.instant + durationOf(ev) * 60_000;
      if (end <= winStart || start.instant >= winEnd) continue;
      if (!push(toOccurrence(ev, ev.uid, start.instant, false))) break;
      continue;
    }

    const exdates = new Set(ev.exdates);
    const duration = durationOf(ev) * 60_000;
    let emitted = 0;
    let matched = 0;
    let cursor: Civil = { ...start.civil };
    // Teto de varredura: ~60 anos de calendário. Séries antigas com COUNT
    // precisam ser contadas desde o início, mas nunca indefinidamente.
    const maxScanDays = 22_000;
    const winEndDay = civilDayNum(civilFromUtc(winEnd + 86_400_000));

    for (let scanned = 0; scanned <= maxScanDays; scanned++, cursor = addDays(cursor, 1)) {
      if (civilDayNum(cursor) > winEndDay) break;
      if (rule.count !== null && matched >= rule.count) break;
      if (!matchesRule(cursor, start.civil, rule)) continue;

      const slot = civilToInstant(cursor, start.tz);
      if (rule.untilInstant !== null && slot > rule.untilInstant) break;
      matched++;

      if (exdates.has(slot)) continue;

      const override = overrides.get(`${ev.uid}#${slot}`);
      const source = override ?? ev;
      if (source.cancelled) continue;

      const actualStart = override?.start ? override.start.instant : slot;
      const actualDuration = override ? durationOf(override) * 60_000 : duration;
      if (actualStart + actualDuration <= winStart || actualStart >= winEnd) continue;

      if (!push(toOccurrence(source, `${ev.uid}#${slot}`, actualStart, true))) break;
      if (++emitted >= maxPerEvent) {
        truncated = true;
        break;
      }
    }
    if (occurrences.length >= maxTotal) break;
  }

  occurrences.sort((a, b) => a.start.getTime() - b.start.getTime());
  return { occurrences, calendarName, truncated };
}

// ── Auxiliares de apresentação ───────────────────────────────────────────────

const MEETING_URL = /https?:\/\/[^\s<>"']*(meet\.google\.com|zoom\.us|teams\.microsoft\.com|teams\.live\.com|whereby\.com|meet\.jit\.si)[^\s<>"']*/i;

/** Primeiro link de videoconferência encontrado no evento. */
export function meetingLink(occ: IcsOccurrence): string | null {
  for (const field of [occ.url, occ.location, occ.description]) {
    const hit = field ? MEETING_URL.exec(field) : null;
    if (hit) return hit[0].replace(/[.,;)]+$/, '');
  }
  return null;
}

/** Monta o corpo de `tasks.details` a partir da ocorrência. */
export function occurrenceDetails(occ: IcsOccurrence, maxChars = 2000): string | null {
  const lines: string[] = [];
  if (occ.location && !MEETING_URL.test(occ.location)) lines.push(`📍 ${occ.location}`);
  const link = meetingLink(occ);
  if (link) lines.push(`🔗 ${link}`);
  if (occ.organizer) lines.push(`👤 ${occ.organizer}`);

  const body = occ.description
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (body) {
    if (lines.length) lines.push('');
    lines.push(body.length > maxChars ? `${body.slice(0, maxChars)}…` : body);
  }

  const out = lines.join('\n').trim();
  return out || null;
}
