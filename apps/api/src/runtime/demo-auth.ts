import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import type {
  CredentialStore,
  OperatorCredential,
  WidgetCredential,
} from '../gateway/principal.js';
import type { OperatorPermission } from '../gateway/contracts.js';

/** The only tenant admitted by the local/CI demo authentication boundary. */
export const DEMO_TENANT_ID = '99999999-9999-4999-8999-999999999999';

/** Demo sessions are intentionally short-lived and are never persisted. */
export const DEMO_SESSION_TTL_MS = 30 * 60 * 1000;

export const DEMO_ROLES = [
  'tenant_operator',
  'marketing_approver',
  'platform_admin',
] as const;

export type DemoRole = (typeof DEMO_ROLES)[number];

const ROLE_OPERATOR_IDS: Readonly<Record<DemoRole, string>> = Object.freeze({
  tenant_operator: 'demo-tenant-operator',
  marketing_approver: 'demo-marketing-approver',
  platform_admin: 'demo-platform-admin',
});

const ROLE_PERMISSIONS: Readonly<Record<DemoRole, readonly OperatorPermission[]>> = {
  tenant_operator: [
    'campaign:draft',
    'conversation:takeover',
    'customer:read',
    'run:read',
    'telemetry:read',
  ],
  marketing_approver: [
    'approval:read',
    'approval:decide',
    'run:read',
  ],
  platform_admin: [
    'platform:admin',
    'run:read',
    'run:retry',
    'run:reconcile',
    'telemetry:read',
  ],
};

export interface DemoSession {
  readonly access_token: string;
  readonly expires_at: string;
  readonly role: DemoRole;
  readonly tenant_id: typeof DEMO_TENANT_ID;
  readonly operator_id: string;
  readonly permissions: readonly OperatorPermission[];
}

export interface DemoWidgetSession {
  readonly access_token: string;
  readonly expires_at: string;
  readonly session_id: string;
}

export interface DemoCredentialStore extends CredentialStore {
  /** Constant-time password verification and opaque session issuance. */
  login(role: DemoRole, password: string): DemoSession | null;
  /** Resolves only operator sessions issued by this demo store. */
  resolveDemoSession(token: string): DemoSession | null;
  /** Revokes an issued operator session. */
  revoke(token: string): boolean;
  /** Resolves only active, tenant-bound widget credentials. */
  resolveWidgetSession(token: string): WidgetCredential | null;
  /** Issues an opaque tenant-bound widget token for an operator-launched session. */
  issueWidget(session_id: string, origin: string): DemoWidgetSession;
}

interface StoredOperatorSession extends OperatorCredential {
  readonly role: DemoRole;
  readonly expires_at: string;
  readonly expires_at_ms: number;
}

interface StoredWidgetSession extends WidgetCredential {
  readonly expires_at_ms: number;
}

export interface DemoCredentialStoreOptions {
  readonly tenantOperatorPassword: string;
  readonly marketingApproverPassword: string;
  readonly platformAdminPassword: string;
  readonly now?: () => number;
  readonly tokenBytes?: number;
}

interface PasswordVerifier {
  readonly digest: Buffer;
  readonly salt: Buffer;
}

function passwordDigest(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, 32);
}

/** Compares fixed-size KDF output so password length cannot alter comparison timing. */
function digestMatches(password: string, verifier: PasswordVerifier): boolean {
  const suppliedDigest = passwordDigest(password, verifier.salt);
  return timingSafeEqual(suppliedDigest, verifier.digest);
}

function randomToken(tokenBytes: number): string {
  return randomBytes(tokenBytes).toString('base64url');
}

function rolePasswordMap(options: DemoCredentialStoreOptions): Readonly<Record<DemoRole, PasswordVerifier>> {
  const tenantOperatorSalt = randomBytes(16);
  const marketingApproverSalt = randomBytes(16);
  const platformAdminSalt = randomBytes(16);
  return Object.freeze({
    tenant_operator: {
      salt: tenantOperatorSalt,
      digest: passwordDigest(options.tenantOperatorPassword, tenantOperatorSalt),
    },
    marketing_approver: {
      salt: marketingApproverSalt,
      digest: passwordDigest(options.marketingApproverPassword, marketingApproverSalt),
    },
    platform_admin: {
      salt: platformAdminSalt,
      digest: passwordDigest(options.platformAdminPassword, platformAdminSalt),
    },
  });
}

function roleOf(value: string): DemoRole | null {
  return (DEMO_ROLES as readonly string[]).includes(value) ? value as DemoRole : null;
}

function expiresAt(now: number): { readonly expires_at: string; readonly expires_at_ms: number } {
  const expires_at_ms = now + DEMO_SESSION_TTL_MS;
  return { expires_at: new Date(expires_at_ms).toISOString(), expires_at_ms };
}

function validAt(now: number, expiry: number): boolean {
  return Number.isFinite(now) && now < expiry;
}

/**
 * Creates the in-process DEMO_MODE credential store.
 *
 * Password values are converted to fixed-size digests once at construction. Neither passwords nor
 * issued bearer tokens are logged or included in thrown errors. Operator and widget rows are kept
 * in separate maps so a widget token can never resolve as an operator session.
 */
export function createDemoCredentialStore(options: DemoCredentialStoreOptions): DemoCredentialStore {
  if (options.tenantOperatorPassword.length === 0
    || options.marketingApproverPassword.length === 0
    || options.platformAdminPassword.length === 0) {
    throw new Error('DEMO_MODE requires all three role password environment values');
  }

  const now = options.now ?? Date.now;
  const tokenBytes = options.tokenBytes ?? 32;
  if (!Number.isInteger(tokenBytes) || tokenBytes < 32) {
    throw new Error('DEMO_MODE session token size must be at least 32 bytes');
  }

  const passwords = rolePasswordMap(options);
  const invalidRoleSalt = randomBytes(16);
  const invalidRoleVerifier: PasswordVerifier = {
    salt: invalidRoleSalt,
    digest: passwordDigest('invalid-demo-role', invalidRoleSalt),
  };
  const operators = new Map<string, StoredOperatorSession>();
  const widgets = new Map<string, StoredWidgetSession>();

  const resolveOperator = (token: string): StoredOperatorSession | null => {
    const session = operators.get(token);
    if (session === undefined) return null;
    if (!validAt(now(), session.expires_at_ms)) {
      operators.delete(token);
      return null;
    }
    return session;
  };

  const resolveWidgetSession = (token: string): WidgetCredential | null => {
    const session = widgets.get(token);
    if (session === undefined) return null;
    if (!validAt(now(), session.expires_at_ms)) {
      widgets.delete(token);
      return null;
    }
    return session;
  };

  return {
    login: (requestedRole, password) => {
      const role = roleOf(requestedRole);
      // Always hash and compare against a configured digest, even for an invalid role, so an
      // invalid role does not become a password oracle. The dummy digest is fixed-size and public.
      const expected = role === null ? invalidRoleVerifier : passwords[role];
      if (!digestMatches(password, expected) || role === null) return null;

      const token = randomToken(tokenBytes);
      const expiry = expiresAt(now());
      const credential: StoredOperatorSession = {
        token,
        tenant_id: DEMO_TENANT_ID,
        operator_id: ROLE_OPERATOR_IDS[role],
        permissions: ROLE_PERMISSIONS[role],
        role,
        expires_at: expiry.expires_at,
        expires_at_ms: expiry.expires_at_ms,
      };
      operators.set(token, credential);
      return {
        access_token: token,
        expires_at: expiry.expires_at,
        role,
        tenant_id: DEMO_TENANT_ID,
        operator_id: credential.operator_id,
        permissions: credential.permissions,
      };
    },

    resolveOperator,
    resolveConversationSession: () => null,
    resolveWidgetSession,

    resolveDemoSession: (token) => {
      const session = resolveOperator(token);
      if (session === null) return null;
      return {
        access_token: session.token,
        expires_at: session.expires_at,
        role: session.role,
        tenant_id: DEMO_TENANT_ID,
        operator_id: session.operator_id,
        permissions: session.permissions,
      };
    },

    revoke: (token) => operators.delete(token),

    issueWidget: (session_id, origin) => {
      if (session_id.trim().length === 0 || origin.trim().length === 0) {
        throw new Error('widget session_id and origin are required');
      }
      const token = randomToken(tokenBytes);
      const expiry = expiresAt(now());
      widgets.set(token, {
        token,
        tenant_id: DEMO_TENANT_ID,
        session_id,
        origin,
        expires_at_ms: expiry.expires_at_ms,
      });
      return {
        access_token: token,
        expires_at: expiry.expires_at,
        session_id,
      };
    },
  };
}