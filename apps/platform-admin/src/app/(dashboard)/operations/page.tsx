/**
 * SCR-002: Agent Operations Console route.
 */

import { AgentOperationsConsole } from '../../../components/operations/AgentOperationsConsole';

export const metadata = {
  title: 'Agent Operations | AgentOS Platform Admin',
  description: 'Operational run history, authority inspection, and safe retry controls.',
};

export default function OperationsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <AgentOperationsConsole />
    </main>
  );
}
