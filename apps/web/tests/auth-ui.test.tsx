// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, test, vi, type MockInstance } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@emotion/react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import type { SessionResponse } from '@ig/shared';
import { App } from '../src/app';
import { theme } from '../src/styles/theme';
import { createSessionClient, ME_KEY, sessionOptions } from '../src/api/session';
import { apiFetch } from '../src/api/client';

const user: SessionResponse = { user: { id: 'user-1', email: null, status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z' } };
const refreshed: SessionResponse = { user: { ...user.user, email: 'updated@example.test' } };
let client: QueryClient;
let expire: () => void;
let fetchMock: MockInstance<typeof fetch>;
function Location() {
  const location = useLocation();
  const navigate = useNavigate();
  expire = () => navigate('/login', { replace: true });
  return <output data-testid="location">{location.pathname}</output>;
}
function mount(path: string) {
  render(<QueryClientProvider client={client}><ThemeProvider theme={theme}><MemoryRouter initialEntries={[path]}>
    <App /><Location />
  </MemoryRouter></ThemeProvider></QueryClientProvider>);
}
beforeEach(() => {
  localStorage.clear();
  client = createSessionClient(localStorage, () => expire());
  fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json(user));
});
afterEach(async () => {
  cleanup();
  await client.cancelQueries();
  client.clear();
  localStorage.clear();
  vi.restoreAllMocks();
});

async function dashboard(path = '/dashboard') {
  mount(path);
  await screen.findByRole('heading', { name: '첫 자동 DM을 만들어보세요' });
}

describe('session routes', () => {
  test('shows loading while me is pending, then renders the protected page', async () => {
    let resolve!: (value: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>(done => { resolve = done; }));
    mount('/dashboard');
    expect(screen.getByRole('heading', { name: '로그인 상태 확인 중…' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '자동 DM 추가' })).not.toBeInTheDocument();
    await act(async () => resolve(Response.json(user)));
    await screen.findByRole('button', { name: '자동 DM 추가' });
  });
  test.each(['/dashboard', '/posts/select'])('anonymous users cannot enter %s', async path => {
    fetchMock.mockImplementation(async () => Response.json({}, { status: 401 }));
    mount(path);
    await screen.findByRole('heading', { name: '다시 만나 반가워요' });
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
    expect(screen.queryByRole('button', { name: '자동 DM 추가' })).not.toBeInTheDocument();
  });
  test.each(['/', '/login', '/join', '/onboarding'])('authenticated users visiting %s reach dashboard', async path => {
    await dashboard(path);
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard');
  });
  test.each(['server', 'network'])('session %s failure stays on the route and offers an explicit retry', async failure => {
    fetchMock.mockImplementationOnce(async () => {
      if (failure === 'network') throw new TypeError('offline');
      return Response.json({}, { status: 503 });
    });
    mount('/dashboard');
    await screen.findByRole('alert');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard');
    await userEvent.setup().click(screen.getByRole('button', { name: '다시 확인하기' }));
    await screen.findByRole('button', { name: '자동 DM 추가' });
  });
  test('successful refresh replaces session data and preserves private cache', async () => {
    await dashboard();
    client.setQueryData(['posts'], ['private']);
    let resolve!: (value: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>(done => { resolve = done; }));
    let pending!: Promise<unknown>;
    act(() => { pending = client.fetchQuery(sessionOptions); });
    await screen.findByRole('heading', { name: '로그인 상태 확인 중…' });
    await act(async () => { resolve(Response.json(refreshed)); await pending; });
    await screen.findByRole('button', { name: '자동 DM 추가' });
    expect(client.getQueryData(ME_KEY)).toEqual(refreshed);
    expect(client.getQueryData(['posts'])).toEqual(['private']);
  });
  test('me refresh discovering 401 removes private data and moves to login', async () => {
    await dashboard();
    client.setQueryData(['posts'], ['private']);
    client.setQueryData(['onboarding-request', 'pending'], { status: 'INVITED' });
    fetchMock.mockImplementation(async () => Response.json({}, { status: 401 }));
    await act(async () => { await client.fetchQuery(sessionOptions); });
    await screen.findByRole('heading', { name: '다시 만나 반가워요' });
    expect(client.getQueryData(ME_KEY)).toBeNull();
    expect(client.getQueryData(['posts'])).toBeUndefined();
    expect(client.getQueryData(['onboarding-request', 'pending'])).toEqual({ status: 'INVITED' });
  });
  test('a protected API 401 expires the session and clears cached data', async () => {
    await dashboard();
    client.setQueryData(['posts'], ['private']);
    localStorage.setItem('onboardingRequestId', 'old-request');
    fetchMock.mockImplementation(async () => Response.json({}, { status: 401 }));
    await act(async () => {
      await expect(client.fetchQuery({ queryKey: ['private'], queryFn: () => apiFetch('/api/private') })).rejects.toMatchObject({ status: 401 });
    });
    await screen.findByRole('heading', { name: '다시 만나 반가워요' });
    await waitFor(() => expect(client.getQueryData(ME_KEY)).toBeNull());
    expect(client.getQueryData(['posts'])).toBeUndefined();
    expect(localStorage.getItem('onboardingRequestId')).toBeNull();
  });
});

describe('logout', () => {
  test('successful logout clears session and cached data and shows login', async () => {
    await dashboard();
    client.setQueryData(['posts'], ['private']);
    localStorage.setItem('onboardingRequestId', 'old-request');
    fetchMock.mockImplementation(async path => path === '/api/auth/logout' ? new Response(null, { status: 204 }) : Response.json({}, { status: 401 }));
    await userEvent.setup().click(screen.getByRole('button', { name: '로그아웃' }));
    await screen.findByRole('heading', { name: '다시 만나 반가워요' });
    expect(client.getQueryData(ME_KEY)).toBeNull();
    expect(client.getQueryData(['posts'])).toBeUndefined();
    expect(localStorage.getItem('onboardingRequestId')).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST', credentials: 'include' }));
  });
  test('failed logout preserves the dashboard and private cache, then retry succeeds', async () => {
    await dashboard();
    client.setQueryData(['posts'], ['private']);
    localStorage.setItem('onboardingRequestId', 'old-request');
    fetchMock.mockImplementationOnce(async () => Response.json({}, { status: 403 }));
    const actor = userEvent.setup();
    await actor.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('로그아웃하지 못했어요');
    expect(client.getQueryData(ME_KEY)).toEqual(user);
    expect(client.getQueryData(['posts'])).toEqual(['private']);
    expect(localStorage.getItem('onboardingRequestId')).toBe('old-request');
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard');
    fetchMock.mockImplementation(async path => path === '/api/auth/logout' ? new Response(null, { status: 204 }) : Response.json({}, { status: 401 }));
    await actor.click(screen.getByRole('button', { name: '로그아웃' }));
    await screen.findByRole('heading', { name: '다시 만나 반가워요' });
    expect(client.getQueryData(['posts'])).toBeUndefined();
  });
});

test('a forged connected result URL cannot grant a session', async () => {
  fetchMock.mockImplementation(async () => Response.json({}, { status: 401 }));
  mount('/connection-result?status=connected');
  await screen.findByRole('heading', { name: '로그인이 필요해요' });
  expect(screen.queryByRole('heading', { name: 'Instagram이 연결됐어요' })).not.toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Instagram으로 로그인' }));
  await screen.findByRole('heading', { name: '다시 만나 반가워요' });
});
