# Demo and exported artifacts

The presentation source and generated PDFs are grouped here. The PDFs are preserved artifacts; regenerate them only through the checked-in exporter.

- [Executive presentation source](presentation/index.html)
- [Technical specification source](presentation/tech_spec.html)
- [PDF exports](exports/)
- [Export script](presentation/export_pdf.py)
- [Overlap checker](presentation/check_pdf_overlap.py)

The [root README](../../README.md) provides the role-based reading guide. Requirements remain in the [root SRS](../../De_bai_Xay_dung_He_thong_AI_Agent_Marketing_Sales_CSKH_v0.1.md), not in the exported artifacts.

## NovaMart live demo runbook

The demo is local/CI-only. It is intentionally fail-closed: `DEMO_MODE=true` is accepted only with
`APP_ENV=local|ci`, the canonical tenant
`99999999-9999-4999-8999-999999999999`, both account emails and passwords, and dedicated cookie
signing keys.
### Preflight order

```bash
cp .env.example .env
pnpm demo:preflight
pnpm demo:seed
pnpm demo:smoke
```

`demo:preflight` validates the NovaMart pack, tenant, mock ERP boundary, database URL, widget
origins, account credentials, email shape, and cookie-key length without printing secret values.
`demo:seed` is idempotent and requires the isolated demo database to be migrated. `demo:smoke`
requires API/worker/console services already running and exercises company login, widget minting,
catalog reads, storefront receipt streaming, readiness, conversations, approvals, and campaign-draft
admission.

### Compose

Compose reads the repository's `.env` file. Put the demo values there — a second `--env-file`
does not override `.env`, so two files silently disagree:

```bash
cp .env.example .env
# edit .env: DEMO_MODE=true, the two DEMO_* email/password pairs, the two cookie HMAC keys,
# DEMO_WIDGET_ORIGINS, WORKER_TENANT_IDS, KNOWLEDGE_TENANT_IDS, KNOWLEDGE_ROOT (absolute),
# ENABLED_AGENT_MODULES, and the SALES_/MARKETING_ signal vars.
docker compose up -d --build
# Compose creates the extensions and least-privilege roles only; apply the schema before seeding.
# Use the bootstrap (superuser) URL, exactly as the CI database gates do: the first migrations
# create the least-privilege roles, which the application role itself may not do.
DATABASE_URL=postgresql://postgres:<POSTGRES_PASSWORD>@localhost:5432/agentos_dev?schema=agentos pnpm db:migrate:rehearse
pnpm demo:preflight
pnpm demo:seed
pnpm demo:smoke
```

The mock ERP is reachable only in local/CI demo mode. `QUOTE_SIGNING_SECRET` is required for
authoritative Sales quotes; omitting it leaves price quoting explicitly unbound rather than
inventing a quote.

### Provider prerequisites

`DEFAULT_LLM_PROVIDER=openai-compatible` (the `.env.example` value) is required; any other value
fails environment validation at boot.

Sales turns are classified server-side without a provider call, so scenario A runs against the
synthetic commerce pack alone. A Customer Care turn additionally asks the configured
OpenAI-compatible endpoint for its bounded intent proposal: without a live key and reachable
`OPENAI_BASE_URL` the gateway refuses the turn with `PROVIDER_REJECTED`/`PROVIDER_TIMEOUT` instead of
answering from an unvalidated classification, and `demo:smoke` stops at that refusal. Configure a
real key for scenario B.

### Demo wiring

- `ENABLED_AGENT_MODULES=sales,support,marketing` (API and worker) admits the three domains.
- `SALES_SIGNAL_SOURCE_CHANNELS=WEB_CHAT` and `SALES_SIGNAL_EVENT_TYPES=message.received` bind the
  Sales domain contract; `MARKETING_SIGNAL_SOURCE_CHANNELS=MARKETING_CAMPAIGN` with
  `MARKETING_SIGNAL_EVENT_TYPES=campaign.requested` binds the company-account campaign contract.
  `WORKER_TENANT_IDS` scopes the worker schedule and `KNOWLEDGE_ROOT`/`KNOWLEDGE_TENANT_IDS`
  point Care and Marketing at the approved synthetic corpus (tenant-checked at read time).
- `MOCK_ERP_DEMO_PACK=novamart` makes the mock system of record serve only the NovaMart tenant.
- `demo:seed` promotes the six canonical low-risk skills (`skill.sales.check_stock`,
  `skill.sales.search_product`, `skill.sales.retrieve_customer`, `skill.care.search_faq`,
  `skill.mkt.segment_audience`, `skill.mkt.generate_content`) for the demo tenant and activates the
  demo agents at their demo authority (Sales/Sales-advisory `AUTH-3`, `MKT-05` `AUTH-3` so AUTH-4
  still pauses). Without that promotion, controlled autonomy parks every step as a draft and the demo
  never dispatches; never-promotable actions (cart, order, message, campaign dispatch) keep their
  MINIMUM gate and still require their own approval.
- `CORS_ALLOWED_ORIGINS` must list the console origins that embed the widget (for the default
  local stack: `http://localhost:3000`, `http://localhost:3001`). The gateway answers only an exact
  listed origin — never a wildcard — and only those origins may present a widget credential.
- Marketing audience membership is computed by the worker from the tenant's own Customer360 rows
  (last paid purchase older than the inactivity window, opt-outs for the demo email channel removed),
  capped at 100 customers by the campaign plan.
- A company-account campaign draft is admitted under `source_channel=MARKETING_CAMPAIGN` (the Marketing
  domain contract's own channel, never a browser `WEB_CHAT` turn) with
  `event_type=campaign.requested`. The fixed plan is segment → content → brand → **dispatch**, and
  `skill.mkt.dispatch_campaign` (AUTH-4) pauses for an approval: nothing is sent before a decision.
  Consent is re-read per exact recipient by the canonical dispatch tool at dispatch time; there is
  deliberately no pre-approval per-customer consent step, because a segment identifier is not a
  customer identity and the policy engine refuses a payload that asserts one.

### Demo login

The demo has two account-based sign-ins; there is no role selector. The API login body is
`{email, password, audience}`, while each console supplies its fixed audience:

- **Company account** (`DEMO_COMPANY_ADMIN_EMAIL` / `DEMO_COMPANY_ADMIN_PASSWORD`, audience
  `company`) has the seven company permissions: campaign drafting, conversation takeover, customer
  reads, run reads, telemetry reads, approval reads, and approval decisions. It can create campaign
  drafts and decide their digest-bound approvals.
- **Platform account** (`DEMO_PLATFORM_ADMIN_EMAIL` / `DEMO_PLATFORM_ADMIN_PASSWORD`, audience
  `platform`) has platform scope for redacted readiness and tenant-fenced run operations. It cannot
  draft campaigns or decide company approvals.

Passwords are used only by the server-side BFF/API flow. The storefront receives only a scoped
widget token; API bearer tokens stay in the server-side BFF session store, and no password or
provider secret is sent to browser code.

The customer-visible Sales/Care answer is the durable run response written by the response
finalizer from that run's own successful receipts (verified quote, approved FAQ citation, verified
order status), then read back through `GET /api/v1/tasks/:task_id`. Exactly one customer message and
one agent message are recorded per admitted conversational run.

### Verification status for this branch

No three-agent live-provider acceptance run was executed in this checkout. Docker health smoke,
offline demo smoke, and the database rehearsal were executed; none claims live Sales, Care, or
Marketing provider success.

#### Verified locally

- `pnpm check:demo-boundary`: 162 files scanned, 0 platform/demo violations.
- Demo helper tests: 12 passed, including pack counts, C05/C06 identity facts, seed transaction
  fencing, offline/live profile gates, and the boundary checker.
- `pnpm typecheck`, `pnpm lint`, and production-mode `pnpm build` passed. A build with the shell's
  `NODE_ENV=development` failed Next.js prerendering; production builds require
  `NODE_ENV=production`.
- Unit matrix passed: API 136, Worker 650, Database 120, Skills 70, Core Engine 185, Adapters 41,
  Tenant Console 45, and Platform Admin 31 tests.
- Contract (29), adversarial (106), security (117), pilot (27), and Worker E2E (9) tests passed.
  The offline composition does not create a PostgreSQL recorder.
- Provider adapter tests passed (7), including 401/429/5xx classification, timeout, cancellation,
  malformed JSON, invalid structured output, missing usage, bounded response, and secret redaction.
  Mock ERP boundary tests passed (16).
- `pnpm test:integration` passed 24 tests against an isolated PostgreSQL application role:
  Care 7, cross-domain handoff 12, and Sales 5. The same run verified idempotency conflicts,
  retry recovery, tenant/customer ownership, durable evidence, and the three-leg handoff journey.
- On a disposable PostgreSQL container, all 13 migrations applied from empty state, replayed
  idempotently, both RLS suites passed (6 policy and 17 rehearsal tests), and `pnpm demo:seed`
  passed twice with 24 products, 28 SKUs, 12 customers, 20 orders, 53 events, 2 segments, 1
  campaign, 8 engagement events, 4 cases, and 13 agents.
- Changing the seeded tenant display name caused the second seed to fail and preserved the
  mismatched value; it did not silently overwrite tenant identity.
- `pnpm docker:smoke --env-file .env.example --project agentos-ci-smoke-20260929` built, inspected,
  started, health-checked, and tore down API, Worker, Tenant Console, and Platform Admin images.
- `demo:smoke:offline` passed against a fresh API/mock-ERP stack with 28 catalog items. It accepted
  the Sales turn and explicitly reported the provider as `not_exercised`; Care and Marketing were
  `not_exercised_offline`. `demo:smoke:live` refused before requests when provider/database
  prerequisites were absent.
- Customer-facing responses remain receipt-grounded: missing successful receipts, source versions,
  or tenant-bound evidence refuse finalization rather than rendering fallback text. The C06 route
  and storefront persona control are demo-only and support the cross-customer denial scenario.

#### Not verified

- Sales, Care, and Marketing live-provider acceptance against a real OpenAI-compatible endpoint.
- Live operator reply after escalation, and live campaign-content generation.

#### Blocked prerequisites

- `demo:smoke:live` requires `DEMO_PROVIDER_MODE=live`, `DATABASE_URL`, the two account
  email/password pairs, the two cookie HMAC keys, and `OPENAI_API_KEY`/`OPENAI_BASE_URL`/
  `PRIMARY_REASONING_MODEL`.
- Live acceptance is fail-closed without those prerequisites; offline smoke never claims provider
  success and reports Care/Marketing as `not_exercised_offline`.

The boundary checker intentionally allows demo fixtures, demo auth, demo UI routes, and demo
documentation while rejecting the canonical NovaMart tenant/brand in generic migrations and
platform runtime code.

### Limitations

- The demo pack is synthetic and date-frozen at `2026-09-28T00:00:00Z`; it is not production data.
- `DEMO_MOCK` and `UNBOUND` readiness states are truthful capability states, not successful provider
  observations.
- Campaign dispatch remains approval-gated (`AUTH-4`); draft admission never sends a campaign. The
  external `API-003.CommunicationConnector` and `API-002.EventIngestion`/analytics ports are **not**
  bound in this build, so an approved dispatch refuses and attribution reports `UNAVAILABLE`
  instead of inventing a delivery or a conversion.
- Sales `skill.sales.send_message` likewise has no outbound channel connector bound: the guarded
  reasoning chain is search → stock → owner-approved quote → grounded recommendation, and delivery
  to the customer happens through the run response above, never through a fabricated send.
- Provider/API keys are server-only. A missing LLM, ERP, event, consent, communication, or quote
  binding produces a typed refusal or an explicit readiness state.
