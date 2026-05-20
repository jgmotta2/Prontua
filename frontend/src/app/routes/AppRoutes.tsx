import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useSession } from '@features/auth/hooks/useSession';
import { AuthLayout } from '@components/layout/AuthLayout';
import { AppShell } from '@components/layout/AppShell';
import { LoginForm } from '@features/auth/components/LoginForm';
import { RegisterForm } from '@features/auth/components/RegisterForm';
import { Dashboard } from '@features/dashboard/components/Dashboard';
import { PatientList } from '@features/patients/components/PatientList';
import { PatientDetail } from '@features/patients/components/PatientDetail';
import { ClinicalRecordPage } from '@features/patients/components/ClinicalRecordPage';
import { AgendaPage } from '@features/schedule/components/AgendaPage';
import { FinancePage } from '@features/finance/components/FinancePage';
import { SettingsPage } from '@features/settings/components/SettingsPage';

function Private({ children }: { children: ReactNode }) {
  const { isLoading, isError } = useSession();
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage border-t-transparent" />
      </div>
    );
  }
  if (isError) return <Navigate to="/entrar" replace />;
  return <AppShell>{children}</AppShell>;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { isLoading, isSuccess } = useSession();
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage border-t-transparent" />
      </div>
    );
  }
  if (isSuccess) return <Navigate to="/" replace />;
  return <AuthLayout>{children}</AuthLayout>;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/entrar"   element={<PublicOnly><LoginForm /></PublicOnly>} />
      <Route path="/cadastro" element={<PublicOnly><RegisterForm /></PublicOnly>} />

      {/* Privadas */}
      <Route path="/"              element={<Private><Dashboard /></Private>} />
      <Route path="/pacientes"     element={<Private><PatientList /></Private>} />
      <Route path="/pacientes/:id" element={<Private><PatientDetail /></Private>} />
      <Route path="/pacientes/:id/prontuario" element={<Private><ClinicalRecordPage /></Private>} />
      <Route path="/agenda"        element={<Private><AgendaPage /></Private>} />
      <Route path="/financeiro"    element={<Private><FinancePage /></Private>} />
      <Route path="/config"        element={<Private><SettingsPage /></Private>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
