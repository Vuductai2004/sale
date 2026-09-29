/**
 * Tenant-console page hosting Approval Center and Customer 360.
 * Customer timelines open only from tenant-scoped records returned by the approval or conversation APIs.
 */
'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ApprovalCenter } from '../../../components/approvals/ApprovalCenter';
import { Customer360Timeline } from '../../../components/customer/Customer360Timeline';

type ActiveTab = 'approvals' | 'customer';

function ApprovalsDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<ActiveTab>(tabParam === 'customer' ? 'customer' : 'approvals');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  const handleTabChange = (newTab: ActiveTab) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    params.delete('customer_id');
    params.delete('customerId');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleSelectCustomer = (newCustomerId: string) => {
    setSelectedCustomerId(newCustomerId);
    setActiveTab('customer');
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'customer');
    params.delete('customer_id');
    params.delete('customerId');
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6" aria-label="Approvals and customer timelines">
      {/* View Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        <button
          type="button"
          onClick={() => handleTabChange('approvals')}
          className={`ui-button ${
            activeTab === 'approvals'
              ? 'bg-brand-soft text-brand-deep'
              : 'border border-line bg-surface text-muted hover:bg-surface-low hover:text-ink'
          }`}
        >
          SCR-003: Approval Center
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('customer')}
          className={`ui-button ${
            activeTab === 'customer'
              ? 'bg-brand-soft text-brand-deep'
              : 'border border-line bg-surface text-muted hover:bg-surface-low hover:text-ink'
          }`}
        >
          <span>SCR-004: Customer 360</span>
          {selectedCustomerId && (
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                activeTab === 'customer' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {selectedCustomerId}
            </span>
          )}
        </button>
      </div>

      {/* Screen Views */}
      {activeTab === 'approvals' ? (
        <ApprovalCenter onSelectCustomer={handleSelectCustomer} />
      ) : (
        <Customer360Timeline initialCustomerId={selectedCustomerId} />
      )}
    </div>
  );
}

export default function ApprovalsPage() {
  return (
    <Suspense
      fallback={
        <div className="state-panel" aria-busy="true" aria-label="Loading approvals and customer timeline">
          loading: Initializing scoped governance and customer views…
        </div>
      }
    >
      <ApprovalsDashboardContent />
    </Suspense>
  );
}
