import { redirect } from 'next/navigation';

// Resolve the deployment-specific origin at request time, never during image build.
export const dynamic = 'force-dynamic';

function platformAdminUrl(path: string): string | null {
  const origin = process.env.PLATFORM_ADMIN_URL?.trim();
  if (!origin) {
    return null;
  }
  return new URL(path, origin).toString();
}

export default function AnalyticsRedirectPage() {
  const target = platformAdminUrl('/operations');
  redirect(target ?? '/demo/operations');
}

