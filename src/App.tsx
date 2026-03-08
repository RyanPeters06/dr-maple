import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { Landing } from './pages/Landing';
import { Call } from './pages/Call';
import { Dashboard } from './pages/Dashboard';
import { Report } from './pages/Report';
import { Profile } from './pages/Profile';
import { AuthGate } from './components/AuthGate';

const BASE_TITLE = 'Dr. Maple';

const routeTitles: Record<string, string> = {
  '/': `${BASE_TITLE} — Home`,
  '/call': `${BASE_TITLE} — Call`,
  '/dashboard': `${BASE_TITLE} — Dashboard`,
  '/profile': `${BASE_TITLE} — Profile`,
};

function DocumentTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const match = pathname.match(/^\/report(\/|$)/);
    const title = match ? `${BASE_TITLE} — Report` : (routeTitles[pathname] ?? `${BASE_TITLE} — Your AI Health Assistant`);
    document.title = title;
  }, [pathname]);
  return null;
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth0();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const HomeRedirect = () => {
  const { isLoading } = useAuth0();
  if (isLoading) return null;
  return <Landing />;
};

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <DocumentTitle />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route
          path="/call"
          element={
            <AuthGate>
              <Call />
            </AuthGate>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/report/:id"
          element={
            <ProtectedRoute>
              <Report />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
