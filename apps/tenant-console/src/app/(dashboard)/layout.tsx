/**
 * Layout wrapper for tenant-console dashboard routes.
 * The responsive navigation shell is hoisted to RootLayout (app/layout.tsx).
 */
import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
