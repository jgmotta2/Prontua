import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useSession } from '@features/auth/hooks/useSession';
import { AuthLayout } from '@components/layout/AuthLayout';
import { LayoutLanding } from '@components/layout/LayoutLanding';
import { AppShell } from '@components/layout/AppShell';
import { LoginForm } from '@features/auth/components/LoginForm';
import { RegisterForm } from '@features/auth/components/RegisterForm';
import { VerifyEmail } from '@features/auth/components/VerifyEmail';
import { LandingPage } from '@features/landing/components/LandingPage';
import { Dashboard } from '@features/dashboard/components/Dashboard';
import { PatientList } from '@features/patients/components/PatientList';
import { PatientDetail } from '@features/patients/components/PatientDetail';
import { AgendaPage } from '@features/sessions/components/AgendaPage';
import { FinancePage } from '@features/finance/components/FinancePage';
import { VoicePage } from '@features/voice/components/VoicePage';
import { SettingsPage } from '@features/settings/SettingsPage';
import { ProntuarioPage } from '@features/notes/components/ProntuarioPage';

function FullScreenLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-cream">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage border-t-transparent" />
    </div>
  );
}

/**
 * Guard de rota privada — usa /auth/me. Enquanto resolve, mostra spinner.
 * Em 401 redireciona para /entrar.
 */
function Private({ children }: { children: ReactNode }) {
  const { isLoading, isError } = useSession();
  if (isLoading) return <FullScreenLoader />;
  if (isError) return <Navigate to="/entrar" replace />;
  return <AppShell>{children}</AppShell>;
}

/**
 * Guard inverso — se já autenticado, manda pro dashboard.
 * Evita usuário logado revisitando /entrar e /cadastro.
 */
function PublicOnly({ children }: { children: ReactNode }) {
  const { isLoading, isSuccess } = useSession();
  if (isLoading) return <FullScreenLoader />;
  if (isSuccess) return <Navigate to="/painel" replace />;
  return <AuthLayout>{children}</AuthLayout>;
}

/**
 * Rota da landing page — se já autenticado, manda pro dashboard.
 */
function PublicLandingRoute({ children }: { children: ReactNode }) {
  const { isLoading, isSuccess } = useSession();
  if (isLoading) return <FullScreenLoader />;
  if (isSuccess) return <Navigate to="/painel" replace />;
  return <LayoutLanding>{children}</LayoutLanding>;
}


export function AppRoutes() {
  return (
    <Routes>
      {/* Landing pública */}
      <Route
        path="/"
        element={
          <PublicLandingRoute>
            <LandingPage />
          </PublicLandingRoute>
        }
      />

      {/* Auth públicas */}
      <Route path="/entrar"   element={<PublicOnly><LoginForm /></PublicOnly>} />
      <Route path="/cadastro" element={<PublicOnly><RegisterForm /></PublicOnly>} />
      <Route path="/verificar-email" element={<AuthLayout><VerifyEmail /></AuthLayout>} />

      {/* Privadas */}
      <Route path="/painel"        element={<Private><Dashboard /></Private>} />
      <Route path="/pacientes"     element={<Private><PatientList /></Private>} />
      <Route path="/pacientes/:id" element={<Private><PatientDetail /></Private>} />
      <Route path="/pacientes/:id/prontuario" element={<Private><ProntuarioPage /></Private>} />
      <Route path="/agenda"        element={<Private><AgendaPage /></Private>} />
      <Route path="/agenda/:sessionId/prontuario-voz" element={<Private><VoicePage /></Private>} />
      <Route path="/financeiro"    element={<Private><FinancePage /></Private>} />
      <Route path="/config"        element={<Private><SettingsPage /></Private>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
