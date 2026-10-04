import styled from '@emotion/styled';
import { zodResolver } from '@hookform/resolvers/zod';
import { joinRequestSchema, type JoinRequest } from '@ig/shared';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { createOnboardingRequest } from '../api/onboarding';
import { BottomBar, Card, ErrorText, Field, Label, Narrow, PrimaryButton, Screen } from '../components/ui';

const Hero = styled.div`
  margin: 0 -18px;
  padding: max(44px, calc(22px + env(safe-area-inset-top))) 28px 92px;
  color: white;
  background:
    radial-gradient(circle at 82% 14%, rgba(255,255,255,.24), transparent 26%),
    linear-gradient(145deg, #2F72F3 0%, #4C86F8 58%, #77A4FF 100%);
`;

const HeroInner = styled.div`
  width: min(100%, 480px);
  margin: 0 auto;
`;

const Brand = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 38px;
  font-weight: 800;
  &::before { content: '↗'; display: grid; width: 30px; height: 30px; place-items: center; border-radius: 10px; background: rgba(255,255,255,.18); }
`;

const Heading = styled.h1`
  margin: 0;
  font-size: clamp(31px, 8vw, 42px);
  line-height: 1.18;
  letter-spacing: -0.055em;
`;

const Lead = styled.p`
  margin: 16px 0 0;
  color: rgba(255,255,255,.86);
  line-height: 1.65;
  font-size: 16px;
`;

const FormCard = styled(Card)`
  position: relative;
  margin-top: -54px;
  padding: 28px 24px;
`;

const CardTitle = styled.h2`
  margin: 0 0 8px;
  font-size: 24px;
  letter-spacing: -0.04em;
`;

const Copy = styled.p`
  margin: 0 0 28px;
  color: ${({ theme }) => theme.colors.muted};
  line-height: 1.65;
`;

const Prefix = styled.div`
  position: relative;
  &::before { content: '@'; position: absolute; z-index: 1; top: 20px; left: 18px; color: ${({ theme }) => theme.colors.brand}; font-weight: 800; }
  input { padding-left: 39px; }
`;

const Note = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 22px;
  padding: 16px;
  border-radius: 18px;
  color: ${({ theme }) => theme.colors.muted};
  background: ${({ theme }) => theme.colors.brandSoft};
  font-size: 14px;
  line-height: 1.55;
  & strong { display: block; margin-bottom: 2px; color: ${({ theme }) => theme.colors.text}; }
`;

export function JoinPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<JoinRequest>({
    resolver: zodResolver(joinRequestSchema),
  });
  const createRequest = useMutation({ mutationFn: createOnboardingRequest });

  const submit = (data: JoinRequest) => {
    createRequest.mutate(data, {
      onSuccess: (request) => {
        localStorage.setItem('onboardingRequestId', request.id);
        navigate('/onboarding');
      },
    });
  };

  return (
    <Screen>
      <Hero>
        <HeroInner>
          <Brand>댓글 자동 DM</Brand>
          <Heading>게시글을 고르면<br />DM은 알아서 갈게요.</Heading>
          <Lead>복잡한 설정 없이 게시글 하나에 자동 DM 하나.<br />보낸 뒤의 결과도 한눈에 확인하세요.</Lead>
        </HeroInner>
      </Hero>
      <Narrow>
        <FormCard>
          <CardTitle>Instagram으로 시작하기</CardTitle>
          <Copy>테스터 초대를 보내드릴 Instagram 아이디를 알려주세요.</Copy>
          <form id="join-form" onSubmit={handleSubmit(submit)}>
            <Label htmlFor="instagramUsername">Instagram 아이디</Label>
            <Prefix>
              <Field
                id="instagramUsername"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="my_account"
                aria-invalid={Boolean(errors.instagramUsername)}
                {...register('instagramUsername')}
              />
            </Prefix>
            {errors.instagramUsername && <ErrorText role="alert">{errors.instagramUsername.message}</ErrorText>}
            {createRequest.error && <ErrorText role="alert">{createRequest.error.message}</ErrorText>}
          </form>
          <Note><span aria-hidden="true">✓</span><div><strong>토큰이나 비밀번호는 받지 않아요</strong>초대를 수락한 뒤 Instagram 공식 화면에서 직접 연결합니다.</div></Note>
          <p>이미 연결하셨나요? <Link to="/login">Instagram으로 로그인</Link></p>
        </FormCard>
      </Narrow>
      <BottomBar><div><PrimaryButton type="submit" form="join-form" disabled={createRequest.isPending}>{createRequest.isPending ? '요청 보내는 중…' : '가입 요청하기'}</PrimaryButton></div></BottomBar>
    </Screen>
  );
}
