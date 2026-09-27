import { redirect } from 'next/navigation';

// Resolve the deployment-specific origin at request time, never during image build.
export const dynamic = 'force-dynamic';

function platformAdminUrl(path: string): string {
  const origin = process.env.PLATFORM_ADMIN_URL;
  if (!origin) {
    throw new Error('PLATFORM_ADMIN_URL is required for tenant-console redirects.');
  }
  return new URL(path, origin).toString();
}

export default function SettingsRedirectPage() {
  redirect(platformAdminUrl('/'));
}
