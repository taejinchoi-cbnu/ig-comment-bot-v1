import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card, ErrorText, Narrow, PrimaryButton, Screen } from '../components/ui';

const errors: Record<string, string> = {
  access_denied: 'Instagram 로그인을 취소했어요. 다시 시도해주세요.',
  permission_denied: '댓글과 메시지 권한을 모두 허용해주세요.',
  account_not_connected: '아직 연결되지 않은 계정이에요. 처음이라면 가입 요청을 해주세요.',
  user_inactive: '현재 로그인할 수 없는 계정이에요. 운영자에게 문의해주세요.',
  subscription_missing: '운영자에게 Instagram 앱의 댓글·메시지 알림 설정 확인을 요청해주세요.',
};

export function LoginPage() {
  const [params] = useSearchParams();
  const error = params.get('error');
  return <Screen><PageHeader title="로그인" /><Narrow><Card style={{ padding: 28, marginTop: 24 }}>
    <h1>다시 만나 반가워요</h1><p>연결했던 Instagram 계정으로 로그인해주세요.</p>
    {error && <ErrorText role="alert">{errors[error] ?? '로그인을 완료하지 못했어요. 다시 시도해주세요.'}</ErrorText>}
    <PrimaryButton style={{ marginTop: 20 }} onClick={() => window.location.assign('/oauth/instagram/login')}>Instagram으로 로그인</PrimaryButton>
    <p>처음이신가요? <Link to="/join">가입 요청하기</Link></p>
  </Card></Narrow></Screen>;
}
