import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthSession } from '@agentos/ui-foundation/auth';

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('../../lib/tenant-console-client', () => ({
  tenantConsoleClient: { signOut: mocks.signOut },
}));

import { SessionProvider } from '../auth/SessionProvider';
import { CompanyShell } from './CompanyShell';

const companyAdmin: AuthSession = {
  identity: { user_id: 'u-company-admin', email: 'admin@example.test', display_name: 'Company Admin' },
  membership: { tenant_id: 'tenant-1', tenant_name: 'Tenant One', role: 'admin', scope: 'company' },
  permissions: ['approval:read', 'campaign:draft', 'conversation:takeover', 'customer:read', 'telemetry:read'],
  expires_at: '2099-01-01T00:00:00.000Z',
};

describe('CompanyShell navigation', () => {
  beforeEach(() => mocks.signOut.mockReset());
  afterEach(() => cleanup());

  it('gates company navigation by permissions', () => {
    render(
      <SessionProvider session={companyAdmin}>
        <CompanyShell><div>content</div></CompanyShell>
      </SessionProvider>,
    );

    expect(screen.getByText('Phê duyệt')).toBeTruthy();
    expect(screen.getByText('Chiến dịch')).toBeTruthy();
  });

  it('opens the mobile drawer, closes on Escape, and returns focus to the menu button', async () => {
    const user = userEvent.setup();
    render(
      <SessionProvider session={companyAdmin}>
        <CompanyShell><div>content</div></CompanyShell>
      </SessionProvider>,
    );

    const menuButton = screen.getByRole('button', { name: 'Mở menu' });
    await user.click(menuButton);
    expect(screen.getByRole('dialog', { name: 'Company navigation' })).toBeTruthy();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Company navigation' })).toBeNull();
    expect(document.activeElement).toBe(menuButton);
  });
});
