import type { FastifyInstance } from 'fastify';

import { authenticate, requireOperator } from '../../gateway/principal.js';
import { fail, replyFailure } from '../../gateway/http.js';
import type { GatewayRuntime } from '../../gateway/ports.js';
import {
  DEMO_ROLES,
  type DemoCredentialStore,
  type DemoRole,
} from '../../runtime/demo-auth.js';

export interface DemoAuthRouteDependencies {
  readonly demoAuth: DemoCredentialStore;
  readonly runtime: GatewayRuntime;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function bearerToken(request: { readonly headers: Record<string, string | string[] | undefined> }): string | null {
  const value = request.headers.authorization;
  const authorization = Array.isArray(value) ? null : value;
  if (authorization === undefined || authorization === null) return null;
  const separator = authorization.indexOf(' ');
  if (separator < 0 || authorization.slice(0, separator).toLowerCase() !== 'bearer') return null;
  const token = authorization.slice(separator + 1).trim();
  return token.length > 0 ? token : null;
}

function requireDemoSession(
  request: { readonly headers: Record<string, string | string[] | undefined> },
  deps: DemoAuthRouteDependencies,
) {
  const token = bearerToken(request);
  const session = token === null ? null : deps.demoAuth.resolveDemoSession(token);
  if (session === null) {
    fail('AUTHENTICATION_FAILED', 'the demo session is missing, expired, revoked, or invalid');
  }
  return { token: token as string, session };
}

function parseLoginBody(body: unknown): { readonly role: DemoRole; readonly password: string } {
  if (!isPlainRecord(body)) {
    fail('VALIDATION_FAILED', 'the request body must contain a role and password');
  }
  const role = body.role;
  const password = body.password;
  if (typeof role !== 'string' || !(DEMO_ROLES as readonly string[]).includes(role)) {
    fail('VALIDATION_FAILED', 'role must be one of the supported demo roles');
  }
  if (typeof password !== 'string' || password.length === 0) {
    fail('VALIDATION_FAILED', 'password is required');
  }
  return { role: role as DemoRole, password };
}

/** Registers local/CI-only operator login, session inspection, and revocation. */
export function registerDemoAuthRoutes(
  app: FastifyInstance,
  deps: DemoAuthRouteDependencies,
): void {
  app.post('/demo/login', async (request, reply) => {
    try {
      const { role, password } = parseLoginBody(request.body);
      const session = deps.demoAuth.login(role, password);
      if (session === null) {
        fail('AUTHENTICATION_FAILED', 'the demo credentials were not accepted');
      }
      return reply.code(200).send({
        access_token: session.access_token,
        expires_at: session.expires_at,
        role: session.role,
        tenant_id: session.tenant_id,
      });
    } catch (error) {
      return replyFailure(reply, error, 'demo-login');
    }
  });

  app.get('/demo/session', { preHandler: authenticate({ credentials: deps.demoAuth, runtime: deps.runtime }) }, async (request, reply) => {
    try {
      const { session } = requireDemoSession(request, deps);
      requireOperator(request);
      return reply.code(200).send({
        role: session.role,
        tenant_id: session.tenant_id,
        operator_id: session.operator_id,
        permissions: session.permissions,
      });
    } catch (error) {
      return replyFailure(reply, error, 'demo-session');
    }
  });

  app.post('/demo/logout', { preHandler: authenticate({ credentials: deps.demoAuth, runtime: deps.runtime }) }, async (request, reply) => {
    try {
      const { token } = requireDemoSession(request, deps);
      requireOperator(request);
      deps.demoAuth.revoke(token);
      return reply.code(200).send({ revoked: true });
    } catch (error) {
      return replyFailure(reply, error, 'demo-logout');
    }
  });
}