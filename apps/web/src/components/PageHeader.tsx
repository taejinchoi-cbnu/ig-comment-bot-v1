import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';

const Wrap = styled.header`
  position: relative;
  width: min(100%, 520px);
  margin: 0 auto;
  padding-top: max(20px, env(safe-area-inset-top));
`;

const Bar = styled.div`
  display: grid;
  grid-template-columns: 48px 1fr 48px;
  align-items: center;
  min-height: 72px;
  padding: 0 10px;
  border: 1px solid rgba(232, 236, 244, 0.86);
  border-radius: 0 0 30px 30px;
  background: rgba(255,255,255,.94);
  box-shadow: ${({ theme }) => theme.shadow.card};
  backdrop-filter: blur(16px);
`;

const Back = styled.button`
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  font-size: 31px;
  line-height: 1;
`;

const Title = styled.h1`
  margin: 0;
  text-align: center;
  font-size: 20px;
  letter-spacing: -0.03em;
`;

export function PageHeader({ title, back = true }: { title: string; back?: boolean }) {
  const navigate = useNavigate();
  return (
    <Wrap>
      <Bar>
        {back ? <Back type="button" onClick={() => navigate(-1)} aria-label="뒤로 가기">‹</Back> : <span />}
        <Title>{title}</Title>
        <span />
      </Bar>
    </Wrap>
  );
}
