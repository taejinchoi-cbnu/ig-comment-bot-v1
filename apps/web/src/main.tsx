import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@emotion/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app';
import { GlobalStyles } from './styles/global';
import { theme } from './styles/theme';
import { createSessionClient } from './api/session';

const queryClient = createSessionClient(localStorage, () => window.location.replace('/login'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter><App /></BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
