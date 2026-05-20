import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MobileTopBar } from './MobileTopBar';
import { BottomNav } from './BottomNav';
import { useBillingStatus } from '@features/billing/hooks/useBilling';
import { TrialBanner } from '@features/billing/components/TrialBanner';
import { PaywallPage } from '@features/billing/components/PaywallPage';

export function AppShell({ children }: { children: ReactNode }) {
  const { data: billing, isSuccess } = useBillingStatus();

  // Block access if subscription expired (only after we have a definitive answer)
  if (isSuccess && billing?.isExpired) {
    return <PaywallPage />;
  }

  return (
    <div className="flex h-screen bg-cream">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileTopBar />
        {isSuccess && billing?.inTrial && (
          <TrialBanner daysLeft={billing.trialDaysLeft} />
        )}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
