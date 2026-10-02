import type { JoinRequest, OnboardingRequestView } from '@ig/shared';

type ApiErrorBody = { message?: string | string[] };

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ApiErrorBody;
    const message = Array.isArray(body.message) ? body.message[0] : body.message;
    throw new Error(message ?? '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.');
  }
  return response.json() as Promise<T>;
}

export function createOnboardingRequest(input: JoinRequest): Promise<OnboardingRequestView> {
  return apiFetch('/api/onboarding/requests', { method: 'POST', body: JSON.stringify(input) });
}

export function getOnboardingRequest(id: string): Promise<OnboardingRequestView> {
  return apiFetch(`/api/onboarding/requests/${encodeURIComponent(id)}`);
}
