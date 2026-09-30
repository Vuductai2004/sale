import { RequirePermission } from '../../../components/auth/RequirePermission';
import { AnalyticsPage } from '../../../components/company/AnalyticsPage';

export const metadata = {
  title: 'Analytics | AgentOS',
  description: 'Tenant-scoped observed metrics.',
};

export default function AnalyticsRoute() {
  return <RequirePermission permission="telemetry:read"><AnalyticsPage /></RequirePermission>;
}
