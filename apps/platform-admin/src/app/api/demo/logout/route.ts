import { logoutDemoPlatformAdmin } from '../../../../lib/demo-bff.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  return logoutDemoPlatformAdmin(request);
}
