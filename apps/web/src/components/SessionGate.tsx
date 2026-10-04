import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { sessionOptions } from '../api/session';
import { Card, Narrow, PrimaryButton, Screen } from './ui';

export function SessionStatus({ error, retry }: { error?: Error | null; retry?: () => void }) {
  return <Screen><Narrow><Card style={{ padding: 28, marginTop: 40 }}>
    <h1>{error ? '로그인 상태를 확인하지 못했어요' : '로그인 상태 확인 중…'}</h1>
    {error && <><p role="alert">잠시 후 다시 시도해주세요.</p><PrimaryButton onClick={retry}>다시 확인하기</PrimaryButton></>}
  </Card></Narrow></Screen>;
}

export function SessionGate({ access, children }: { access: 'root' | 'guest' | 'protected'; children?: ReactNode }) {
  const session = useQuery(sessionOptions);
  if (session.isPending || session.isFetching) return <SessionStatus />;
  if (session.isError) return <SessionStatus error={session.error} retry={() => void session.refetch()} />;
  if (access === 'root') return <Navigate to={session.data ? '/dashboard' : '/join'} replace />;
  if (access === 'guest' && session.data) return <Navigate to="/dashboard" replace />;
  if (access === 'protected' && !session.data) return <Navigate to="/login" replace />;
  return children;
}
