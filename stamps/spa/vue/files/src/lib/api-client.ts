/**
 * A small wrapper around fetch for the JSON API of the backend. Every request goes to VITE_API_BASE_URL (default
 * `/api`), so the same build works behind any backend that serves the API on that path.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const method = init.method ?? 'GET';
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch (error) {
    throw new ApiError(`${method} ${path}: the API is not reachable (${(error as Error).message})`, 0);
  }

  const isJson = response.headers.get('Content-Type')?.includes('application/json') ?? false;
  const body: unknown = isJson ? await response.json() : await response.text();
  if (!response.ok) {
    throw new ApiError(`${method} ${path} failed with status ${response.status}`, response.status, body);
  }
  if (!isJson) {
    // E.g. the SPA fallback answered with index.html because no backend serves the path
    throw new ApiError(`${method} ${path} did not return JSON`, response.status, body);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string, init?: RequestInit) => request<T>(path, init),
  post: <T>(path: string, data: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: 'POST', body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: 'DELETE' }),
};
