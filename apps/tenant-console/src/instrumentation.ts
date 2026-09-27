// Tenant Console boot gate for the Next.js standalone server.
//
// The container entrypoint is Next's standalone `server.js`, not `node src/server.mjs`, so the
// fail-closed configuration check runs from inside the Next process. `register()` is that seam:
// Next calls it once while bootstrapping the server and before it serves a request.
//
// `parseCommandCenterEnv` is shared with the platform-admin browser application. This process
// reads no DATABASE_URL, Redis, Qdrant, ERP, or signing secret.
export async function register(): Promise<void> {
  // Instrumentation also runs on the edge runtime, where the Node HTTP stub cannot load.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // A static import cannot be used: this module is also compiled for the edge runtime.
  // Load the browser-safe shared validator only after the runtime check.
  const { parseCommandCenterEnv } = await import('@agentos/ui-foundation/env');
  // Next.js standalone forces NODE_ENV=production before register(). APP_ENV remains the
  // profile selector (01 §3.1); the forced runtime mode is not a second profile.
  const env = { ...process.env };
  if (env.APP_ENV === 'local' && env.NODE_ENV === 'production') env.NODE_ENV = 'development';
  if (env.APP_ENV === 'ci' && env.NODE_ENV === 'production') env.NODE_ENV = 'test';

  const parsed = parseCommandCenterEnv(env, { requirePlatformAdminUrl: true });
  if (parsed.ok) return;
  // Same value-free report as `printFatal` in `src/server.mjs`, so every image fails alike.
  const lines = ['FATAL: Environment validation failed'];
  for (const issue of parsed.issues ?? []) lines.push(`[${issue.path}] ${issue.message}`);
  process.stderr.write(`${lines.join('\n')}\n`);
  process.exit(1);
}
