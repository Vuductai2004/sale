import {
  ProvisioningConflictError,
  type ProvisioningEvidenceEvent,
  type ProvisioningStore,
  type ProvisioningStoreTransaction,
  type ProvisioningTransactionResult,
  type TenantShell,
} from './types.js';

interface IdempotencyRecord {
  readonly fingerprint: string;
  readonly tenant_id: string;
}

interface StoredEvidence extends ProvisioningEvidenceEvent {
  readonly tenant_id: string;
}

function clone<T>(value: T): T {
  if (value === undefined) return value;
  const serialized = JSON.stringify(value);
  return JSON.parse(serialized) as T;
}

/**
 * Transactional in-memory implementation of the provisioning persistence port.
 *
 * Writes are staged in private maps and become visible only after the callback resolves. A thrown
 * callback therefore leaves both tenant and evidence state untouched, which mirrors the atomic
 * boundary expected from the durable adapter without importing a database runtime.
 */
export class MemoryProvisioningStore implements ProvisioningStore {
  private readonly tenants = new Map<string, TenantShell>();
  private readonly idempotency = new Map<string, IdempotencyRecord>();
  private readonly evidence = new Map<string, StoredEvidence>();
  private readonly idempotencyLocks = new Map<string, Promise<void>>();

  async transaction<T>(
    params: { readonly idempotency_key?: string; readonly fingerprint: string },
    work: (transaction: ProvisioningStoreTransaction) => Promise<T> | T,
  ): Promise<ProvisioningTransactionResult<T>> {
    const key = params.idempotency_key;
    if (key === undefined) return this.transactionUnlocked(params, work);

    const previous = this.idempotencyLocks.get(key);
    let release: () => void = () => undefined;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.idempotencyLocks.set(key, current);
    if (previous !== undefined) await previous;
    try {
      return await this.transactionUnlocked(params, work);
    } finally {
      if (this.idempotencyLocks.get(key) === current) this.idempotencyLocks.delete(key);
      release();
    }
  }

  private async transactionUnlocked<T>(
    params: { readonly idempotency_key?: string; readonly fingerprint: string },
    work: (transaction: ProvisioningStoreTransaction) => Promise<T> | T,
  ): Promise<ProvisioningTransactionResult<T>> {
    const key = params.idempotency_key;
    if (key !== undefined) {
      const existing = this.idempotency.get(key);
      if (existing !== undefined) {
        if (existing.fingerprint !== params.fingerprint) {
          throw new ProvisioningConflictError();
        }
        const shell = this.tenants.get(existing.tenant_id);
        // A record without its tenant would be an internal corruption, never a successful replay.
        if (shell === undefined) {
          throw new Error('PROVISIONING_STORE_CORRUPT: idempotency record has no tenant shell');
        }
        return { value: clone(shell) as T, replay: true };
      }
    }

    const stagedTenants = new Map<string, TenantShell>();
    const stagedEvidence = new Map<string, StoredEvidence>();
    const transaction: ProvisioningStoreTransaction = {
      putTenant: (shell) => {
        if (this.tenants.has(shell.tenant_id) || stagedTenants.has(shell.tenant_id)) {
          throw new Error('PROVISIONING_TENANT_CONFLICT: tenant shell already exists');
        }
        stagedTenants.set(shell.tenant_id, clone(shell));
      },
      appendEvidence: (event) => {
        if (this.evidence.has(event.tenant_id) || stagedEvidence.has(event.tenant_id)) {
          throw new Error('PROVISIONING_EVIDENCE_CONFLICT: provisioning evidence already exists');
        }
        stagedEvidence.set(event.tenant_id, clone(event));
      },
    };

    try {
      const result = await work(transaction);
      const shellForKey = key === undefined ? undefined : [...stagedTenants.values()][0];
      if (key !== undefined && shellForKey === undefined) {
        throw new Error('PROVISIONING_STORE_INVALID_TRANSACTION: no tenant shell was staged');
      }
      for (const [tenant_id, shell] of stagedTenants) this.tenants.set(tenant_id, shell);
      for (const [tenant_id, event] of stagedEvidence) this.evidence.set(tenant_id, event);
      if (key !== undefined && shellForKey !== undefined) {
        this.idempotency.set(key, { fingerprint: params.fingerprint, tenant_id: shellForKey.tenant_id });
      }
      return { value: clone(result), replay: false };
    } catch (error) {
      // Staged maps are deliberately discarded. No rollback mutation is needed for committed state.
      throw error;
    }
  }

  /** Alias useful to adapters and tests that call the port using verb-first naming. */
  transact<T>(
    params: { readonly idempotency_key?: string; readonly fingerprint: string },
    work: (transaction: ProvisioningStoreTransaction) => Promise<T> | T,
  ): Promise<ProvisioningTransactionResult<T>> {
    return this.transaction(params, work);
  }

  async getTenant(tenant_id: string): Promise<TenantShell | null> {
    const shell = this.tenants.get(tenant_id);
    return shell === undefined ? null : clone(shell);
  }

  async listTenants(): Promise<readonly TenantShell[]> {
    return [...this.tenants.values()].map((shell) => clone(shell));
  }

  async getEvidence(tenant_id: string): Promise<StoredEvidence | null> {
    const event = this.evidence.get(tenant_id);
    return event === undefined ? null : clone(event);
  }

  /** Useful for scoped verification without exposing mutable internal maps. */
  get size(): number {
    return this.tenants.size;
  }
}
