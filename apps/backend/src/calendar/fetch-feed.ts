import dns from 'node:dns/promises';
import net from 'node:net';
import { env } from '@todoapp/services';

/**
 * Busca um feed .ics remoto.
 *
 * A URL vem do usuário e o fetch sai de DENTRO da rede Docker — onde moram o
 * LoginHub, o Postgres e os outros apps. Por isso todo host é resolvido antes
 * e recusado se apontar para endereço privado/loopback, e cada redirect é
 * revalidado (senão um 302 para 127.0.0.1 furaria a checagem).
 */

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 25_000;

export class FeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeedError';
  }
}

function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number) as [number, number];
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true; // link-local / metadata de nuvem
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast e reservados
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (v === '::1' || v === '::') return true;
  if (v.startsWith('fe80') || v.startsWith('fc') || v.startsWith('fd')) return true;
  // IPv4 mapeado (::ffff:127.0.0.1)
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
  if (mapped) return isPrivateIPv4(mapped[1]!);
  return false;
}

async function assertPublicHost(hostname: string): Promise<void> {
  if (env.CALENDAR_ALLOW_PRIVATE_HOSTS) return;

  const literal = hostname.replace(/^\[|\]$/g, '');
  const family = net.isIP(literal);
  const addresses: string[] = family
    ? [literal]
    : (await dns.lookup(hostname, { all: true }).catch(() => {
        throw new FeedError(`Não consegui resolver o host "${hostname}".`);
      })).map((a) => a.address);

  if (!addresses.length) throw new FeedError(`Não consegui resolver o host "${hostname}".`);

  for (const address of addresses) {
    const blocked = net.isIP(address) === 6 ? isPrivateIPv6(address) : isPrivateIPv4(address);
    if (blocked) {
      throw new FeedError(
        `O endereço de "${hostname}" é interno (${address}) e foi recusado por segurança.`,
      );
    }
  }
}

function normalizeUrl(raw: string): URL {
  // webcal:// é só http(s) com outro nome — todo mundo serve por https.
  const swapped = raw.replace(/^webcal:\/\//i, 'https://');
  let url: URL;
  try {
    url = new URL(swapped);
  } catch {
    throw new FeedError('URL inválida.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new FeedError('Só aceito URLs http(s) ou webcal.');
  }
  return url;
}

/** Baixa o feed e devolve o texto do .ics (com teto de tamanho). */
export async function fetchIcsFeed(rawUrl: string): Promise<string> {
  let url = normalizeUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url.hostname);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          Accept: 'text/calendar, text/plain;q=0.9, */*;q=0.5',
          'User-Agent': 'TodoAPP-CalendarSync/1.0',
        },
      });
    } catch (err) {
      const reason = err instanceof Error && err.name === 'AbortError' ? 'tempo esgotado' : String(err);
      throw new FeedError(`Falha ao baixar o feed (${reason}).`);
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) throw new FeedError(`Redirect ${res.status} sem destino.`);
      url = new URL(location, url); // revalidado no topo do próximo laço
      continue;
    }

    if (!res.ok) {
      throw new FeedError(`O servidor respondeu ${res.status} ${res.statusText}.`);
    }

    const declared = Number(res.headers.get('content-length') ?? 0);
    if (declared && declared > env.CALENDAR_MAX_BYTES) {
      throw new FeedError(`Feed grande demais (${Math.round(declared / 1024)} KB).`);
    }

    const body = await readCapped(res, env.CALENDAR_MAX_BYTES);
    if (!/BEGIN:VCALENDAR/i.test(body)) {
      throw new FeedError('A resposta não parece um arquivo .ics (não achei BEGIN:VCALENDAR).');
    }
    return body;
  }

  throw new FeedError('Redirects demais.');
}

/** Lê o corpo abortando se passar do teto — não confia no content-length. */
async function readCapped(res: Response, maxBytes: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return res.text();

  const decoder = new TextDecoder('utf-8');
  const chunks: string[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new FeedError(`Feed passou de ${Math.round(maxBytes / 1024 / 1024)} MB.`);
    }
    chunks.push(decoder.decode(value, { stream: true }));
  }
  chunks.push(decoder.decode());
  return chunks.join('');
}
