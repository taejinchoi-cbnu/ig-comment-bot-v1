import styled from '@emotion/styled';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { getOnboardingRequest } from '../api/onboarding';
import { BottomBar, Card, ErrorText, Eyebrow, Narrow, PrimaryButton, Screen, SecondaryButton } from '../components/ui';

const Progress = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 24px 18px 28px;
  span { height: 7px; border-radius: 99px; background: ${({ theme }) => theme.colors.line}; }
  span[data-active='true'] { background: ${({ theme }) => theme.colors.brand}; }
`;

const Content = styled(Card)`padding: 30px 24px;`;
const Title = styled.h2`margin: 0; font-size: 28px; letter-spacing: -0.045em;`;
const Description = styled.p`margin: 13px 0 28px; color: ${({ theme }) => theme.colors.muted}; line-height: 1.7;`;

const Account = styled.div`
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: 20px;
  background: #FBFCFE;
  & > span { display: grid; width: 44px; height: 44px; place-items: center; border-radius: 15px; color: white; background: linear-gradient(145deg,#6D58E8,#E04C83,#F5A444); font-weight: 900; }
  strong { display: block; }
  small { display: block; margin-top: 3px; color: ${({ theme }) => theme.colors.muted}; }
`;

const Steps = styled.ol`
  display: grid;
  gap: 18px;
  margin: 28px 0 0;
  padding: 0;
  list-style: none;
  li { display: grid; grid-template-columns: 34px 1fr; gap: 12px; align-items: start; color: ${({ theme }) => theme.colors.muted}; line-height: 1.55; }
  b { display: grid; width: 32px; height: 32px; place-items: center; border-radius: 50%; color: ${({ theme }) => theme.colors.brand}; background: ${({ theme }) => theme.colors.brandSoft}; font-size: 14px; }
  strong { display: block; margin-bottom: 3px; color: ${({ theme }) => theme.colors.text}; }
`;

const Info = styled.div`
  margin-top: 24px;
  padding: 17px;
  border-radius: 19px;
  color: ${({ theme }) => theme.colors.success};
  background: ${({ theme }) => theme.colors.successBg};
  font-size: 14px;
  line-height: 1.6;
`;

const ButtonStack = styled.div`display: grid; gap: 9px;`;

const INVITE_URL = 'https://www.instagram.com/accounts/manage_connections/';

export function OnboardingPage() {
  const navigate = useNavigate();
  const requestId = localStorage.getItem('onboardingRequestId');
  const request = useQuery({
    queryKey: ['onboarding-request', requestId],
    queryFn: ({ signal }) => getOnboardingRequest(requestId!, signal),
    enabled: Boolean(requestId),
    refetchInterval: (query) => ['REQUESTED', 'AUTHORIZING'].includes(query.state.data?.status ?? '') ? 10_000 : false,
  });
  const status = request.data?.status ?? 'REQUESTED';
  const inviteReady = status === 'INVITED';
  const username = request.data?.instagramUsername ?? 'instagram_id';

  if (!requestId) {
    return <Screen><PageHeader title="Instagram 연결" /><Narrow><Content><Title>가입 요청이 없어요</Title><Description>Instagram 아이디를 먼저 알려주세요.</Description><PrimaryButton onClick={() => navigate('/join')}>가입 요청하기</PrimaryButton></Content></Narrow></Screen>;
  }

  return (
    <Screen>
      <PageHeader title="Instagram 연결" />
      <Narrow>
        <Progress aria-label="연결 단계 3단계 중 1단계">
          <span data-active="true" /><span data-active={inviteReady} /><span />
        </Progress>
        <Content>
          <Eyebrow>STEP {inviteReady ? '2' : '1'}</Eyebrow>
          <Title>{status === 'CONNECTED' ? '다시 로그인해주세요' : inviteReady ? '초대를 수락해주세요' : '테스터 초대를 준비할게요'}</Title>
          <Description>{status === 'CONNECTED' ? '연결된 Instagram 계정으로 로그인하면 계속할 수 있어요.' : inviteReady
            ? 'Instagram에서 초대를 한 번 수락하면 공식 연결 화면으로 넘어갈 수 있어요.'
            : '운영자가 Meta 앱에 계정을 초대해야 해요. 초대를 받았다는 안내가 오면 다음 단계로 진행해주세요.'}</Description>
          <Account><span>@</span><div><strong>@{username}</strong><small>연결할 Instagram 계정</small></div></Account>
          {request.error && <ErrorText role="alert">{request.error.message}</ErrorText>}
          {inviteReady ? (
            <>
              <Steps>
                <li><b>1</b><div><strong>Instagram 초대 화면 열기</strong>로그인한 계정이 @{username}인지 확인해주세요.</div></li>
                <li><b>2</b><div><strong>테스터 초대 수락</strong>대기 중인 초대에서 수락을 눌러주세요.</div></li>
                <li><b>3</b><div><strong>서비스로 돌아오기</strong>아래 연결 버튼을 누르면 나머지는 자동으로 처리돼요.</div></li>
              </Steps>
              <Info>Instagram 비밀번호와 액세스 토큰은 이 화면에 입력하지 않습니다.</Info>
            </>
          ) : status === 'CONNECTED'
            ? <Info>계정 연결은 완료됐어요. 로그인 상태를 확인하려면 다시 로그인해주세요.</Info>
            : <Info>초대는 운영자가 확인한 뒤 직접 보내요. 이 화면을 닫아도 요청은 유지되며 자동으로 상태를 확인합니다.</Info>}
        </Content>
      </Narrow>
      <BottomBar><div><ButtonStack>{status === 'CONNECTED'
        ? <PrimaryButton type="button" onClick={() => navigate('/login')}>Instagram으로 로그인</PrimaryButton>
        : inviteReady ? <>
        <SecondaryButton type="button" onClick={() => window.open(INVITE_URL, '_blank', 'noopener,noreferrer')}>초대 수락 화면 열기</SecondaryButton>
        <PrimaryButton type="button" onClick={() => window.location.assign(`/oauth/instagram/start?request=${encodeURIComponent(requestId)}`)}>수락했어요 · 연결하기</PrimaryButton>
      </> : <PrimaryButton type="button" disabled={request.isFetching} onClick={() => void request.refetch()}>{request.isFetching ? '초대 확인 중…' : '초대 상태 다시 확인'}</PrimaryButton>}</ButtonStack></div></BottomBar>
    </Screen>
  );
}
