import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { PlatformShell } from '../components/shell/PlatformShell';

export const metadata: Metadata = {
  title: 'AgentOS Platform Operations',
  description: 'Current-tenant operations, readiness, and bounded autonomy controls.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-app="platform">
      <body className="min-h-screen bg-canvas font-sans antialiased text-ink selection:bg-brand selection:text-white">
        <PlatformShell>{children}</PlatformShell>
      </body>
    </html>
  );
}
