import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { JoinPage } from './pages/JoinPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ConnectionResultPage } from './pages/ConnectionResultPage';
import { LoginPage } from './pages/LoginPage';
import { SessionGate } from './components/SessionGate';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<SessionGate access="root" />} />
      <Route path="/login" element={<SessionGate access="guest"><LoginPage /></SessionGate>} />
      <Route path="/join" element={<SessionGate access="guest"><JoinPage /></SessionGate>} />
      <Route path="/onboarding" element={<SessionGate access="guest"><OnboardingPage /></SessionGate>} />
      <Route path="/connection-result" element={<ConnectionResultPage />} />
      <Route path="/posts/select" element={<SessionGate access="protected"><DashboardPage /></SessionGate>} />
      <Route path="/dashboard" element={<SessionGate access="protected"><DashboardPage /></SessionGate>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
