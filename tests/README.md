# Test ownership map

Executable tests remain beside the package or service they test so package scripts, relative imports, and Turbo ownership stay truthful. The categories below are logical ownership labels, not duplicate mirror trees.

## Logical categories

- **Unit:** package `test:unit` configurations and service-owned offline tests.
- **Contract:** `*.contracts.test.ts` and explicit core/skills contract suites.
- **Security:** policy, approval, audit, identity, and fail-closed configurations.
- **Adversarial:** effect reservation, CAS, lease-fencing, and refusal suites.
- **E2E:** worker end-to-end suites and their controlled fixtures.
- **Fixtures:** canonical `testcases/fixtures/` and service-owned fixtures; do not copy them here.

## Central harnesses

- `tests/integration/` is the R4 home for the three database-backed Node smokes.
- `tests/load/` is the R4 home for the P5 load harness.
- `testcases/` remains generated acceptance specification, not an executable-test mirror.
- `services/mock-erp/test/` remains service-owned and outside the workspace.

## Canonical gates

Package Vitest configurations remain the source of truth. Run the root/package scripts documented in the [root README](../README.md) and preserve sequential execution for shared-database rehearsal, RLS, P5, and integration suites.

## Exactly-once execution

Every offline assertion runs in exactly one shard. A file selected by a dedicated gate config is excluded from that package's `test:unit` selector:

| Package | `test:unit` excludes | Dedicated owner |
| --- | --- | --- |
| `packages/core-engine` | `*.contracts.test.ts`, `durability/canonical-json.test.ts`, `authority-rank.test.ts`, `*.adversarial.test.ts`, `durability/effect-guard.test.ts`, `*.security.test.ts`, `policy/policy.test.ts` | `test:contracts`, `test:adversarial`, `test:security` |
| `packages/database` | `*.adversarial.test.ts`, `effect-reservations.test.ts`, `durable-workflows.test.ts`, `*.security.test.ts`, `approvals.test.ts`, `audit-evidence.test.ts`, live `rls`/`rls.rehearsal`/`p5.live` files | `test:adversarial`, `test:security`, `test:rls-rehearsal`, `test:rls-policies`, `test:p5-db` |
| `apps/worker` | `src/e2e/**`, `runtime/care/pilot-04.test.ts`, `runtime/sales/pilot-02.test.ts` | `test:e2e`, `test:pilots` |

Each dedicated configuration keeps a non-empty explicit selector, so losing its files fails that gate instead of reporting a green run.
