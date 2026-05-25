import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { MobileTopBar } from './MobileTopBar';
import { BottomNav } from './BottomNav';
import { useBillingStatus } from '@features/billing/hooks/useBilling';
import { TrialBanner } from '@features/billing/components/TrialBanner';
import { PaywallPage } from '@features/billing/components/PaywallPage';
import { useSession } from '@features/auth/hooks/useSession';
import { useIdleTimeout } from '@hooks/useIdleTimeout';
import { IdleWarningModal } from '@components/IdleWarningModal';
import { settingsApi } from '@features/settings/api/settings.api';

export function AppShell({ children }: { children: ReactNode }) {
  const { data: billing, isSuccess }  = useBillingStatus();
  const { data: session }             = useSession();
  const navigate                      = useNavigate();
  const queryClient                   = useQueryClient();

  const onIdle = useCallback(async () => {
    await settingsApi.logout().catch(() => {});
    queryClient.clear();
    navigate('/entrar?motivo=inatividade', { replace: true });
  }, [navigate, queryClient]);

  const { showWarning, countdown, extendSession } = useIdleTimeout({ onIdle });

  if (isSuccess && billing?.isExpired) {
    return <PaywallPage />;
  }

  return (
    <div className="flex h-screen bg-cream">
      {showWarning && (
        <IdleWarningModal countdown={countdown} onContinue={extendSession} />
      )}

      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileTopBar />
        {isSuccess && billing?.inTrial && (
          <TrialBanner daysLeft={billing.trialDaysLeft} />
        )}
        {session?.mfaEnabled && (
          <div className="flex items-center justify-center gap-1.5 bg-emerald-600 py-1 text-xs font-semibold text-white">
            <ShieldCheck className="h-3.5 w-3.5" />
            Ambiente Protegido
          </div>
        )}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
