import { MutationCache, QueryCache, QueryClient, queryOptions } from '@tanstack/react-query';
import type { SessionResponse } from '@ig/shared';
import { ApiError, apiFetch } from './client.ts';

export const ME_KEY = ['me'] as const;

export async function getSession(signal?: AbortSignal): Promise<SessionResponse | null> {
  try {
    return await apiFetch<SessionResponse>('/api/auth/me', { signal, cache: 'no-store' }, false);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export const sessionOptions = queryOptions({
  queryKey: ME_KEY,
  queryFn: ({ signal }) => getSession(signal),
  staleTime: 0,
  retry: false,
  refetchOnWindowFocus: true,
  refetchOnMount: 'always',
});

export async function clearSession(client: QueryClient, storage: Pick<Storage, 'removeItem'>) {
  await client.cancelQueries();
  client.removeQueries({ predicate: query => query.queryKey[0] !== 'me' });
  client.getMutationCache().clear();
  storage.removeItem('onboardingRequestId');
  client.setQueryData(ME_KEY, null);
}

export async function logout(client: QueryClient, storage: Pick<Storage, 'removeItem'>) {
  await apiFetch<void>('/api/auth/logout', { method: 'POST' }, false);
  await clearSession(client, storage);
}

export function createSessionClient(storage: Pick<Storage, 'removeItem'>, onExpired: () => void) {
  let clearing: Promise<void> | undefined;
  const expired = () => {
    if (!clearing) {
      clearing = clearSession(client, storage).then(onExpired).finally(() => { clearing = undefined; });
    }
  };
  const onError = (error: Error) => {
    if (error instanceof ApiError && error.sessionExpired) expired();
  };
  const client = new QueryClient({
    queryCache: new QueryCache({
      onError,
      onSuccess: (data, query) => {
        // A focus refresh can discover expiration even with cached user data.
        if (query.queryKey[0] === 'me' && data === null) {
          void client.cancelQueries({ predicate: cached => cached.queryKey[0] !== 'me' && cached.queryKey[0] !== 'onboarding-request' });
          client.removeQueries({ predicate: cached => cached.queryKey[0] !== 'me' && cached.queryKey[0] !== 'onboarding-request' });
        }
      },
    }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: { staleTime: 30_000, retry: (count, error) => !(error instanceof ApiError && error.status === 401) && count < 1, refetchOnWindowFocus: false },
      mutations: { retry: 0 },
    },
  });
  return client;
}
