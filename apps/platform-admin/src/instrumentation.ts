import { parseCommandCenterEnv } from '@agentos/ui-foundation/env';

// Platform-admin boot gate for the Next.js standalone server.
// The browser app has no data-store credentials; only shared application configuration is read.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const env = { ...process.env };
  if (env.APP_ENV === 'local' && env.NODE_ENV === 'production') env.NODE_ENV = 'development';
  if (env.APP_ENV === 'ci' && env.NODE_ENV === 'production') env.NODE_ENV = 'test';

  const parsed = parseCommandCenterEnv(env, { defaultPort: 3001 });
  if (parsed.ok) return;

  const lines = ['FATAL: Environment validation failed'];
  for (const issue of parsed.issues ?? []) lines.push(`[${issue.path}] ${issue.message}`);
  process.stderr.write(`${lines.join('\n')}\n`);
  process.exit(1);
}
