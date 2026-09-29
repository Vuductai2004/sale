/**
 * Tenant-scoped conversation care route.
 *
 * The list and takeover actions read identity from the HttpOnly demo session through the BFF.
 * Query-string tenant/operator overrides are intentionally not accepted.
 */
import OperationsPage from '../../demo/operations/page';

export const metadata = {
  title: 'Customer Care | AgentOS',
  description: 'Tenant-scoped conversation history and human takeover.',
};

export default function TakeoverPage() {
  return <OperationsPage />;
}
