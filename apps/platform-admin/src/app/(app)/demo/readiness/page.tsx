import type { Metadata } from 'next';
import { ReadinessConsole } from './ReadinessConsole';

export const metadata: Metadata = {
  title: 'Demo Readiness | AgentOS Platform Admin',
  description: 'Redacted provider, connector, ledger, and run trace readiness for the local demo.',
};

export default function DemoReadinessPage() {
  return <ReadinessConsole />;
}
