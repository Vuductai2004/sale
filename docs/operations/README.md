# Operations documentation

Operational entry points are kept at their canonical repository paths.

- [Root README](../../README.md) — quick navigation and documented commands.
- [Docker Compose](../../docker-compose.yml) and [Docker files](../../docker/) — local service topology and image definitions.
- [CI workflow](../../.github/workflows/production-pipeline.yml) — automated gates and artifacts.
- [Test ownership](../../tests/README.md) — package-owned suites and central integration/load harness boundaries.
- [Migrations](../../packages/database/migrations/) — canonical database migration path.
- [Mock ERP](../../services/mock-erp/) — local/CI-only simulator outside the workspace.

Run commands from the repository root and treat the SRS, implementation blueprints, and generated testcase tree as separate authorities.

## Documented commands

| Command | Scope |
| --- | --- |
| `pnpm dev` | both browser applications in parallel (`tenant-console` on `3000`, `platform-admin` on `3001`) |
| `pnpm --filter @agentos/tenant-console dev` / `pnpm --filter @agentos/platform-admin dev` | one browser application |
| `pnpm lint`, `pnpm typecheck`, `pnpm build` | every workspace package |
| `pnpm test:unit`, `pnpm test:contracts`, `pnpm test:adversarial`, `pnpm test:security` | offline suites, one owner per file (`tests/README.md`) |
| `pnpm test:pilots`, `pnpm test:e2e` | worker offline pilot and end-to-end suites |
| `pnpm db:migrate:rehearse` | raw SQL migrations against `DATABASE_URL` |
| `pnpm test:rls-rehearsal`, `pnpm test:rls-policies`, `pnpm test:p5-db`, `pnpm test:integration` | live PostgreSQL gates, run sequentially against one database |
| `pnpm docker:smoke` | builds the four application images through Compose, boots them, and tears the project down |
| `python testcases/_generate.py --check` | generated acceptance specification versus its sources |
| `python docs/demo/presentation/export_pdf.py` | re-exports the demo PDFs into `docs/demo/exports/` |

Compose forwards `NEXT_PUBLIC_API_URL` from its environment into both browser image builds. For a direct image build, pass `--build-arg NEXT_PUBLIC_API_URL=https://your-public-gateway-origin`; rebuild both images whenever this public origin changes. A container-only environment update cannot change the compiled browser bundle.
