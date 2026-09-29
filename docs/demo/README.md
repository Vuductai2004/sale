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
`99999999-9999-4999-8999-999999999999`, and all three role passwords.

### Preflight order

```bash
cp .env.example .env
pnpm demo:preflight
pnpm demo:seed
pnpm demo:smoke
```

`demo:preflight` validates the NovaMart pack, tenant, mock ERP boundary, database URL, widget
origins, and required demo credentials without printing secret values. `demo:seed` is idempotent and
requires the isolated demo database to be migrated. `demo:smoke` requires API/worker/console services
already running and exercises operator login, widget minting, catalog reads, storefront receipt
streaming, readiness, conversations, approvals, and campaign-draft admission.

### Compose

Compose reads the repository's `.env` file. Put the demo values there — a second `--env-file`
does not override `.env`, so two files silently disagree:

```bash
cp .env.example .env
# edit .env: DEMO_MODE=true, the three DEMO_* passwords, DEMO_WIDGET_ORIGINS, CARE_TENANT_IDS,
# CARE_KNOWLEDGE_ROOT (absolute), ENABLED_AGENT_MODULES, the SALES_/MARKETING_ signal vars.
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
  `MARKETING_SIGNAL_EVENT_TYPES=campaign.requested` binds the operator campaign contract.
- `CARE_TENANT_IDS` scopes the worker schedule and `CARE_KNOWLEDGE_ROOT=packages/second-brain/demo/novamart`
  points Care and Marketing at the approved synthetic corpus (tenant-checked at read time).
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
- An operator campaign draft is admitted under `source_channel=MARKETING_CAMPAIGN` (the Marketing
  domain contract's own channel, never a browser `WEB_CHAT` turn) with
  `event_type=campaign.requested`. The fixed plan is segment → content → brand → **dispatch**, and
  `skill.mkt.dispatch_campaign` (AUTH-4) pauses for an approval: nothing is sent before a decision.
  Consent is re-read per exact recipient by the canonical dispatch tool at dispatch time; there is
  deliberately no pre-approval per-customer consent step, because a segment identifier is not a
  customer identity and the policy engine refuses a payload that asserts one.

### Role flows

- `tenant_operator`: storefront/widget session, conversations, takeover, operator replies, and
  campaign draft admission.
- `marketing_approver`: pending campaign approvals and digest-bound decisions.
- `platform_admin`: redacted readiness and tenant-fenced run traces.

The storefront receives only a scoped widget token. API bearer tokens stay in the server-side BFF
session store for console workflows; no password or provider secret is sent to browser code.

The customer-visible Sales/Care answer is the durable run response written by the response
finalizer from that run's own successful receipts (verified quote, approved FAQ citation, verified
order status), then read back through `GET /api/v1/tasks/:task_id`. Exactly one customer message and
one agent message are recorded per admitted conversational run.

### Verified live (fresh stack, real provider)

| Scenario | Result |
|---|---|
| A — Sales advisor | `completed`; answer `Quote for NM-L01-BLK: VND 18900000 (valid until …)`, 1 citation (`API-001.PricingEngine`) |
| B1 — Care FAQ | `completed`; approved answer citing `customer-care/faq.md` (FAQ-1, SHA-256 source version) |
| B2 — Care order | `completed`; `Order ORD-DEMO-005 status: DELIVERED.` citing `API-001.OrderConnector` |
| B3 — anonymous order | run `failed`; no order reference and no status in any field (fail-closed, no leak) |
| C — Marketing draft | `202`; approval `PENDING`, `authority_required=AUTH-4`; task `awaiting_human`, `paused_for_approval_id` set; no dispatch observed |
| Provider probe | `gpt-6-luna` JSON mode 200 (≈18 s), `gpt-4o-mini` JSON mode 200 (≈1.5 s), text 200; usage returned |

Gateway intent classification uses `FAST_COMPLETION_MODEL` (the plan's classifier model); the reasoning
model is reserved for domain proposals and reply formatting.

### Known gaps (not smoothed over)

- **Escalation parks instead of reaching `awaiting_human` — observed state, cause not yet confirmed.**
  Observed: the run sits `waiting` at step 1 with a `RESERVED` effect and **zero**
  `agentos.care_handoffs` rows; no worker error is logged for that run, and the first attempt's
  failure reason was not captured. Hypothesis (not proven): the skill row's `timeout_ms: 1000`
  (`packages/skills/src/platform/care/escalate-to-human.ts:80`) and the handoff repository's own
  transaction deadline (`packages/database/src/repositories/care-handoffs.ts:196`,
  `HANDOFF_QUEUE_TIMEOUT`) leave no room, and `handleHandoff` deliberately never retries an enqueue, so
  the dispatch aborts, the reservation stays unsettled, and the retry parks the task for operator
  reconciliation. A direct `enqueue` probe from the worker container confirmed the repository's lease
  prerequisite (`HANDOFF_TASK_NOT_ACTIVE` without a live run) but **could not** confirm its latency or
  timeout behaviour inside a run; the real throw was never observed. Operator-reply verification (B5)
  depends on that escalation and therefore did not run live.
- **Cross-customer denial is unverified.** `customer-care/support-policy.md` requires that a second
  verified customer (C06) be denied C05's `ORD-DEMO-005`, and the ownership rule is covered offline by
  the R03 task-ownership and conversation-ownership suites — but the demo widget mints only `C05` and
  `anonymous` (`apps/api/src/routes/v1/demo-widget.ts`), so no authenticated C06 turn can be produced
  live. The anonymous case that did run proves missing identity, not cross-customer isolation; the
  cross-customer acceptance case needs a sanctioned C06 fixture or persona before it can be claimed.
- **Anonymous refusal path raises a registry gap.** The anonymous order run fails closed (no leak), but
  its failure is `UNKNOWN_SKILL: skill 'skill.sales.send_message' is not registered in schema` — the
  Care refusal path reaches for a Sales skill outside the Care registry, so it is a registry error
  rather than a clean typed refusal.
- **Marketing content generation is knowledge-backed, not provider-backed.** Binding the provider
  engine needs the content step's 10 s deadline raised (or the fast model used for content), because
  the configured reasoning model answers in ≈18 s.

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
