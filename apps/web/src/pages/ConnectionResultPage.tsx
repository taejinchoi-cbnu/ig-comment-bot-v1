import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { sessionOptions } from '../api/session';
import { SessionStatus } from '../components/SessionGate';
import { PageHeader } from '../components/PageHeader';
import { Card, Narrow, PrimaryButton, Screen } from '../components/ui';

const errors: Record<string, { title: string; action: string }> = {
  invalid_request: { title: '연결 요청을 다시 시작해주세요', action: '가입 요청 화면에서 다시 시도해주세요.' },
  not_invited: { title: '초대가 아직 준비되지 않았어요', action: '운영자의 초대 안내를 기다린 뒤 다시 시도해주세요.' },
  state_invalid: { title: '연결 시간이 지났어요', action: '처음 연결을 시작한 브라우저에서 다시 시도해주세요.' },
  access_denied: { title: 'Instagram 권한이 허용되지 않았어요', action: '연결을 다시 시작하고 필요한 권한을 모두 허용해주세요.' },
  permission_denied: { title: '필요한 권한이 빠졌어요', action: '댓글과 메시지 권한을 모두 허용해 다시 연결해주세요.' },
  account_mismatch: { title: '다른 Instagram 계정이에요', action: '가입 요청에 입력한 계정으로 Instagram에 로그인한 뒤 다시 연결해주세요.' },
  token_exchange_failed: { title: '연결을 완료하지 못했어요', action: 'Instagram 연결을 다시 시작해주세요. 계속되면 운영자에게 알려주세요.' },
  subscription_missing: { title: '앱의 알림 설정이 부족해요', action: '운영자에게 comments와 messages 구독 확인을 요청해주세요. 확인 후 다시 연결할 수 있어요.' },
};

export function ConnectionResultPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const session = useQuery(sessionOptions);
  if (session.isPending || session.isFetching) return <SessionStatus />;
  if (session.isError) return <SessionStatus error={session.error} retry={() => void session.refetch()} />;
  const connected = Boolean(session.data);
  const missingSession = !connected && params.get('status') === 'connected';
  const error = errors[params.get('error') ?? ''] ?? errors.token_exchange_failed!;
  return <Screen>
    <PageHeader title="Instagram 연결 결과" />
    <Narrow>
      <Card style={{ padding: 28, marginTop: 24 }}>
        <h1>{connected ? 'Instagram이 연결됐어요' : missingSession ? '로그인이 필요해요' : error.title}</h1>
        <p>{connected ? '이제 게시글을 골라 첫 자동 DM을 만들 수 있어요.' : missingSession ? '연결된 Instagram 계정으로 다시 로그인해주세요.' : error.action}</p>
        <PrimaryButton type="button" onClick={() => navigate(connected ? '/posts/select' : missingSession ? '/login' : '/onboarding')}>
          {connected ? '첫 자동 DM 만들기' : missingSession ? 'Instagram으로 로그인' : '연결 다시 시도하기'}
        </PrimaryButton>
        {!connected && <p><Link to="/login">로그인 다시 시작하기</Link> · <Link to="/join">가입 요청하기</Link></p>}
      </Card>
    </Narrow>
  </Screen>;
}
