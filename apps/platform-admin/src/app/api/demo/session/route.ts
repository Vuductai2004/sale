import {
  loginDemoPlatformAdmin,
  readDemoPlatformSession,
} from '../../../../lib/demo-bff.server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  return readDemoPlatformSession(request);
}

export async function POST(request: Request): Promise<Response> {
  return loginDemoPlatformAdmin(request);
}
