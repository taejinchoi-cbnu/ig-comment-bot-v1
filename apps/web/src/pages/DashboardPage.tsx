import styled from '@emotion/styled';
import { Card, Narrow, PrimaryButton, Screen } from '../components/ui';

const Header = styled.header`
  margin: 0 -18px 26px;
  padding: max(28px, calc(16px + env(safe-area-inset-top))) 24px 36px;
  color: white;
  background: linear-gradient(145deg,#2F72F3,#5B91FA);
  h1 { width: min(100%, 980px); margin: 0 auto; font-size: 24px; }
`;
const Empty = styled(Card)`padding: 34px 24px; text-align: center; h2 { margin: 14px 0 8px; } p { margin: 0 0 24px; color: ${({ theme }) => theme.colors.muted}; line-height: 1.6; }`;

export function DashboardPage() {
  return <Screen><Header><h1>댓글 자동 DM</h1></Header><Narrow><Empty><span aria-hidden="true">✦</span><h2>첫 자동 DM을 만들어보세요</h2><p>게시글을 고르고 보낼 메시지만 적으면 준비가 끝나요.</p><PrimaryButton type="button">자동 DM 추가</PrimaryButton></Empty></Narrow></Screen>;
}
