import styled from '@emotion/styled';

export const Screen = styled.main`
  min-height: 100vh;
  padding: 0 18px calc(112px + env(safe-area-inset-bottom));
`;

export const Narrow = styled.div`
  width: min(100%, 480px);
  margin: 0 auto;
`;

export const Card = styled.section`
  border: 1px solid rgba(232, 236, 244, 0.8);
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadow.card};
`;

export const PrimaryButton = styled.button`
  min-height: 58px;
  width: 100%;
  border: 0;
  border-radius: 19px;
  color: white;
  background: ${({ theme }) => theme.colors.brand};
  font-weight: 750;
  font-size: 17px;
  transition: transform 150ms ease, background 150ms ease;
  &:hover { background: ${({ theme }) => theme.colors.brandStrong}; }
  &:active { transform: translateY(1px); }
  &:disabled { cursor: not-allowed; background: #C7D4EA; }
`;

export const SecondaryButton = styled(PrimaryButton)`
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.line};
  &:hover { background: #F8FAFD; }
`;

export const BottomBar = styled.div`
  position: fixed;
  z-index: 20;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 12px 18px calc(12px + env(safe-area-inset-bottom));
  background: linear-gradient(to top, rgba(243, 246, 254, 1) 72%, rgba(243, 246, 254, 0));
  & > div {
    width: min(100%, 480px);
    margin: 0 auto;
    padding: 10px;
    border: 1px solid rgba(232, 236, 244, 0.9);
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 14px 40px rgba(35, 55, 90, 0.16);
    backdrop-filter: blur(16px);
  }
`;

export const Field = styled.input`
  width: 100%;
  min-height: 64px;
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radius.field};
  padding: 0 18px;
  color: ${({ theme }) => theme.colors.text};
  background: #FBFCFE;
  font-size: 17px;
  &:focus { border-color: ${({ theme }) => theme.colors.brand}; background: white; outline: none; box-shadow: 0 0 0 4px rgba(52,120,246,.10); }
  &::placeholder { color: ${({ theme }) => theme.colors.subtle}; }
`;

export const Label = styled.label`
  display: block;
  margin-bottom: 10px;
  font-weight: 750;
  font-size: 15px;
`;

export const ErrorText = styled.p`
  margin: 9px 4px 0;
  color: ${({ theme }) => theme.colors.danger};
  font-size: 14px;
`;

export const Eyebrow = styled.p`
  margin: 0 0 10px;
  color: ${({ theme }) => theme.colors.brand};
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.12em;
`;
