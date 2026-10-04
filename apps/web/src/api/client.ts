export class ApiError extends Error {
  readonly status: number;
  readonly sessionExpired: boolean;
  constructor(status: number, message: string, protectedRequest: boolean) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.sessionExpired = protectedRequest && status === 401;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, protectedRequest = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const response = await fetch(path, { ...init, credentials: 'include', headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message[0] : body.message;
    throw new ApiError(response.status, message ?? '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.', protectedRequest);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
