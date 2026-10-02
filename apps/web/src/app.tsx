import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { JoinPage } from './pages/JoinPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ConnectionResultPage } from './pages/ConnectionResultPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/join" replace />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/connection-result" element={<ConnectionResultPage />} />
      <Route path="/posts/select" element={<DashboardPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
