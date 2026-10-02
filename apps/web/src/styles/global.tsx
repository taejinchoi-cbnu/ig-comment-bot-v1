import { Global, css, useTheme } from '@emotion/react';

export function GlobalStyles() {
  const theme = useTheme();
  return (
    <Global
      styles={css`
        *, *::before, *::after { box-sizing: border-box; }
        html { min-width: 320px; background: ${theme.colors.canvas}; }
        body {
          margin: 0;
          min-width: 320px;
          min-height: 100vh;
          color: ${theme.colors.text};
          background: ${theme.colors.canvas};
          font-family: Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo",
            "Noto Sans KR", "Segoe UI", sans-serif;
          -webkit-font-smoothing: antialiased;
          word-break: keep-all;
        }
        button, input, textarea { font: inherit; }
        button, a { -webkit-tap-highlight-color: transparent; }
        button { cursor: pointer; }
        a { color: inherit; }
        :focus-visible { outline: 3px solid rgba(52, 120, 246, .35); outline-offset: 3px; }
        #root { min-height: 100vh; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; }
        }
      `}
    />
  );
}
