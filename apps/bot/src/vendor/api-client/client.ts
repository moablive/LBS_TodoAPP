export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`HTTP ${status}`);
  }
}

export interface ApiOptions {
  baseUrl: string;
  apiKey: string;
}

export const apiOptions: ApiOptions = {
  baseUrl: '/api',
  apiKey: '',
};

export function setupApi(options: Partial<ApiOptions>) {
  Object.assign(apiOptions, options);
}

export function serviceHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {};
  if (apiOptions.apiKey) headers['x-api-key'] = apiOptions.apiKey;
  return { ...headers, ...(extra ?? {}) };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = serviceHeaders();
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${apiOptions.baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) throw new ApiError(res.status, await safeJson(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export const api = {
  get:    <T>(p: string)                  => request<T>('GET',    p),
  post:   <T>(p: string, body?: unknown)  => request<T>('POST',   p, body),
  put:    <T>(p: string, body?: unknown)  => request<T>('PUT',    p, body),
  patch:  <T>(p: string, body?: unknown)  => request<T>('PATCH',  p, body),
  delete: <T>(p: string)                  => request<T>('DELETE', p),
};
