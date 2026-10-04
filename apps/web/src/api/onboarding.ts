import type { JoinRequest, OnboardingRequestView } from '@ig/shared';

import { apiFetch } from './client.ts';

export function createOnboardingRequest(input: JoinRequest): Promise<OnboardingRequestView> {
  return apiFetch('/api/onboarding/requests', { method: 'POST', body: JSON.stringify(input) }, false);
}

export function getOnboardingRequest(id: string, signal?: AbortSignal): Promise<OnboardingRequestView> {
  return apiFetch(`/api/onboarding/requests/${encodeURIComponent(id)}`, { signal }, false);
}
