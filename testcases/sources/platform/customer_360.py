"""Internal platform fragment loaded by the platform source façade."""

# Shared constants, helpers and fixtures are defined by the façade before it
# loads this fragment.  Importing them explicitly keeps dependencies visible
# while avoiding a package-relative import cycle under the generator's
# ``tc_sources_platform`` dynamic module name.
from tc_sources_platform import (
    CONN,
    DB,
    ORCH,
    PLAN_API,
    PLAN_DATA,
    PLAN_FLOW,
    SRS,
    SUITE_C360,
    T1,
    _case,
    _steps,
)

CASES = [
    # --------------------------------------------------------------------------------------
    # Customer 360 (integration/customer-360.md)
    # --------------------------------------------------------------------------------------

    _case(
        "INT-FR-C360-001",
        "Customer 360 profile projection exposes every required field group with verified handles only",
        SUITE_C360,
        "integration",
        "offline",
        "critical",
        "P0",
        "baseline",
        ["FR-C360-001", "BR-003", "NFR-006"],
        ["entity:Customer", "memory:Customer Context", "stage:CONTEXT"],
        [SRS, DB, PLAN_DATA],
        "An agent answers from an incomplete or unverified profile, so a statement about the customer is wrong "
        "and a handle the customer never proved is treated as identity.",
        ["fixtures/offline/customers.json", "fixtures/offline/consents.json", "fixtures/offline/orders.json"],
        [
            "Tenant T1 seeded with cust-a, cust-b, cust-guest, cust-dormant and orders ORD-A-1/ORD-B-1 in run namespace run-t1-c360-001-*",
            "Projection read through the tenant-scoped repository wrapper at frozen clock 2026-01-15T10:00:00Z; no live connector is called",
        ],
        {
            "tenant_id": T1,
            "customer_id": "cust-a",
            "required_field_groups": [
                "identity",
                "purchase_history",
                "products_purchased",
                "web_app_behavior",
                "marketing_interactions",
                "conversations",
                "support_cases",
                "feedback",
                "cart",
                "vouchers_offers",
                "last_purchase_at",
                "purchase_frequency",
                "total_spent",
                "consent_state",
                "lifecycle_state",
            ],
            "expected": {
                "verified_handles": ["wa_id_a", "cust-a@example.invalid"],
                "order_ids": ["ORD-A-1"],
                "total_spent_twd": 1000,
                "consent_marketing_email": True,
            },
        },
        _steps(
            (
                "Read the Customer 360 projection for (T1, cust-a) and enumerate the returned field groups",
                "all 15 required field groups are present with a value or an explicit null; none is silently omitted",
            ),
            (
                "Compare the aggregate fields against the ERP order mirror (ORD-A-1, SKU-OK, 1000 TWD)",
                "products_purchased contains SKU-OK, last_purchase_at matches ORD-A-1 and total_spent is 1000 TWD from the mirror, not from a model",
            ),
            (
                "Read the projection for cust-guest and for cust-dormant",
                "cust-guest yields no FACT profile and zero verified handles; cust-dormant exposes inactive_days 120 and lifecycle dormant",
            ),
            (
                "Retry the same read under tenant T2 and separately send a client payload asserting verification_status VERIFIED for cust-b",
                "the T2 read returns 0 rows for cust-a and the client assertion changes neither verification nor released handles",
            ),
        ),
        [
            "The projection returns all 15 required field groups for cust-a and the values match the ERP mirror (ORD-A-1, SKU-OK, 1000 TWD)",
            "Only handles backed by a server-verified identity row are released; cust-guest returns zero verified handles and no FACT profile",
            "Derived attributes appear with the _hypothesis suffix and are absent from the customers System-of-Record mirror",
            "A cross-tenant read of cust-a under T2 returns 0 rows instead of any customer data",
        ],
        [
            "Release a handle that has no verified identity row, for example an address echoed back from the request payload",
            "Return cust-b profile content inside a cust-a projection read",
        ],
        [
            "Redacted projection result for cust-a and cust-guest with the 15-field presence check",
            "ERP mirror comparison for ORD-A-1 showing the projected aggregates",
        ],
        [
            "Delete the run-scoped projection rows for run-t1-c360-001-*; keep the immutable audit record",
        ],
        "Seed fixture rows in a run namespace and read through the real tenant-scoped repository wrapper with only the "
        "ERP adapter stubbed by fixtures/offline/orders.json; assert on returned values, never on schema shape.",
    ),
    _case(
        "INT-FR-C360-002",
        "Unified timeline orders View, Search, Click, Chat, Cart, Purchase, Delivery, Support, Review, Repurchase",
        SUITE_C360,
        "integration",
        "offline",
        "critical",
        "P0",
        "baseline",
        ["FR-C360-002", "NFR-002", "NFR-005"],
        ["entity:Customer Event", "event:product_view", "stage:EVIDENCE"],
        [SRS, PLAN_DATA, CONN],
        "The timeline merges or drops events, so a support agent sees the wrong history and treats a returning "
        "customer as new or attributes another customer's order to them.",
        ["fixtures/offline/events.json", "fixtures/offline/orders.json", "fixtures/offline/platform.json"],
        [
            "Tenant T1 seeded with the canonical events of session sess-a-1 plus ORD-A-1 (SHIPPED) in namespace run-t1-c360-002-*",
            "Timeline queried for cust-a over 2026-01-01..2026-01-15 after replaying one duplicate delivery and one late delivery",
        ],
        {
            "tenant_id": T1,
            "customer_id": "cust-a",
            "window": {"from": "2026-01-01T00:00:00Z", "to": "2026-01-15T10:00:00Z"},
            "seeded_events": [
                "evt_a_session_1",
                "evt_late_view_1",
                "evt_a_cart_add_1",
                "evt_a_purchase_1",
            ],
            "expected_order": [
                "session",
                "product_view",
                "add_to_cart",
                "purchase",
                "delivery",
            ],
        },
        _steps(
            (
                "Ingest the seeded events and query the unified timeline for cust-a",
                "each entry carries canonical event name, occurred_at, source channel, session_id and a source_record_id that resolves to the originating record",
            ),
            (
                "Replay evt_a_cart_add_1 byte-identically, then deliver the late evt_late_view_1 with occurred_at 2026-01-15T09:58:30Z",
                "the replay adds no entry and the late view is inserted at its occurred_at position without reordering or deleting existing entries",
            ),
            (
                "Join the timeline with ORD-A-1 (SHIPPED) and with a support case for the same customer",
                "purchase, delivery, support and review entries are traceable to the order, shipment and case records",
            ),
            (
                "Query the timeline for cust-b and for the anonymous session sess-guest-1",
                "cust-b shows only cust-b entries (ORD-B-1, 800 TWD) and the anonymous session shows no customer-attributed entry",
            ),
        ),
        [
            "The timeline contains exactly one entry per distinct (canonical event, occurred_at, source_record_id) and exactly one purchase entry",
            "Every entry exposes traceability fields (source_record_id, source_version, occurred_at) that resolve to a real record",
            "The late event appears exactly once and no entry is reordered relative to its occurred_at",
            "The cust-b and anonymous timelines contain zero cust-a identifiers or amounts",
        ],
        [
            "Collapse two distinct events into a single timeline entry or discard a late-arriving event",
            "Attribute an anonymous-session entry to cust-a",
        ],
        [
            "Redacted timeline result for cust-a with per-entry traceability fields",
            "Entry count before and after the duplicate replay (must be unchanged)",
        ],
        [
            "Delete the run-scoped timeline rows for run-t1-c360-002-*; append-only customer_events rows and audit entries remain",
        ],
        "Run the real ingestion normalizer over fixture envelopes, freeze the clock for the window filter, and stub only "
        "the ERP boundary; assertions read returned ordering and counts, not storage layout.",
    ),
    _case(
        "INT-FR-C360-003",
        "Evidence separation keeps FACT, SIGNAL, HYPOTHESIS, DECISION and ACTION distinct",
        SUITE_C360,
        "integration",
        "offline",
        "critical",
        "P0",
        "baseline",
        ["FR-C360-003", "BR-010", "NFR-005"],
        ["entity:Evidence", "entity:Customer", "stage:HYPOTHESIS"],
        [SRS, ORCH, DB],
        "An AI inference is stored or displayed as a verified customer fact, so a human acts on a guess the ERP "
        "never confirmed.",
        ["fixtures/offline/customers.json", "fixtures/offline/platform.json"],
        [
            "Tenant T1 in run namespace run-t1-c360-003-* with cust-a and a churn hypothesis from a HYPOTHESIS-class skill",
            "Hypothesis record and evidence rows inspected at 2026-01-15T10:00:00Z",
        ],
        {
            "tenant_id": T1,
            "customer_id": "cust-a",
            "hypothesis": {"intent": "return_refund", "confidence": 0.71, "churn_risk_score": 0.34},
            "attempted_promotion": {"field": "is_fraud", "value": True, "target": "customers"},
        },
        _steps(
            (
                "Emit one hypothesis from the HYPOTHESIS stage and read the produced record",
                "the record is stamped classification HYPOTHESIS and exposes intent, confidence, churn_risk_score and derived_from_signals",
            ),
            (
                "Attempt to write the hypothesis into the customers row and into the ERP mirror",
                "the write is refused with SECURITY_VIOLATION and the mirror row digest is unchanged afterwards",
            ),
            (
                "Persist the derived value through the sanctioned path and read it back",
                "the durable derived value exists only as an evidences row with taxonomy_type HYPOTHESIS and a _hypothesis-suffixed projection name",
            ),
            (
                "Read a FACT (ORD-A-1 SHIPPED), a SIGNAL (evt_a_cart_add_1) and a DECISION/ACTION pair for cust-a",
                "each record keeps its own taxonomy label, and the FACT content is not overwritten by the hypothesis or the signal",
            ),
        ),
        [
            "The customers row digest for cust-a is unchanged by the hypothesis path (zero FACT writes)",
            "The persisted derived row carries taxonomy_type HYPOTHESIS and a name ending in _hypothesis",
            "FACT, SIGNAL, DECISION and ACTION records keep distinct labels and the DECISION exposes reason plus evidence",
        ],
        [
            "Write any hypothesis value into a System-of-Record mirror table",
            "Present a hypothesis to the customer as a confirmed fact",
        ],
        [
            "Before/after digest of the cust-a mirror row plus the created evidences row (redacted)",
            "SECURITY_VIOLATION audit entry from the refused promotion attempt",
        ],
        [
            "Delete the run-scoped hypothesis and evidence rows for run-t1-c360-003-*; the attempt audit entry stays immutable",
        ],
        "Exercise the real epistemic guard and repository wrapper against fixtures with the ERP adapter stubbed; the oracle "
        "is the before/after row digest, not a schema or field-presence check.",
    ),
    _case(
        "INT-NFR-006",
        "Customer A context never appears in customer B or in an anonymous context",
        SUITE_C360,
        "integration",
        "offline",
        "critical",
        "P0",
        "baseline",
        ["NFR-006", "FR-C360-001", "OBJ-006"],
        ["entity:Customer", "memory:Working Memory", "stage:CONTEXT"],
        [SRS, ORCH, DB],
        "Cross-customer data bleeding exposes one customer's orders, addresses or conversations to another customer "
        "or to an unrelated visitor.",
        ["fixtures/offline/customers.json", "fixtures/offline/orders.json", "fixtures/offline/platform.json"],
        [
            "Two concurrent sessions sess-a-1 (cust-a) and sess-b-1 (cust-b) in tenant T1 plus one anonymous session sess-guest-1",
            "Working-memory keys tenant:{tid}:wm:{sid} seeded for both sessions with distinct synthetic content",
        ],
        {
            "tenant_id": T1,
            "sessions": ["sess-a-1", "sess-b-1", "sess-guest-1"],
            "probe_terms": ["ORD-A-1", "SKU-OK", "1000", "cust-a@example.invalid"],
        },
        _steps(
            (
                "Hydrate context for sess-b-1 and scan the hydrated context, citations and working-memory payload for cust-a identifiers",
                "zero occurrences of ORD-A-1, cust-a handles or cust-a amounts in the sess-b-1 context",
            ),
            (
                "Hydrate context for the anonymous sess-guest-1",
                "customer is null, no Customer 360 FACT is attached and the working-memory bucket is its own session-scoped key",
            ),
            (
                "Issue the same knowledge query for tenant T1 and inspect the returned chunks",
                "only T1-approved chunks are returned; the T2 pricing variant and any cust-a-derived chunk are absent",
            ),
            (
                "Open a transaction that omits the tenant context setting",
                "the wrapper raises TENANT_CONTEXT_REQUIRED and returns no rows",
            ),
        ),
        [
            "Occurrence count of cust-a identifiers inside the cust-b hydrated context is exactly 0",
            "The anonymous context has customer = null with a session-isolated working-memory key and zero shared buckets",
            "The unscoped transaction is refused with TENANT_CONTEXT_REQUIRED rather than returning cross-tenant rows",
        ],
        [
            "Reuse one working-memory bucket for two anonymous sessions",
            "Serve cust-a order data from the sess-b-1 prompt or from its citation set",
        ],
        [
            "Redacted hydrated context dumps for sess-b-1 and sess-guest-1 with probe-term counts",
            "Audit entry for the refused unscoped transaction carrying TENANT_CONTEXT_REQUIRED",
        ],
        [
            "Delete the run-scoped working-memory keys and context snapshots for run-t1-nfr006-*; keep audit records",
        ],
        "Two parallel real hydration calls with per-key prefixing and a stubbed ERP/vector boundary; the oracle is a "
        "probe-term scan over returned context, not a configuration inspection.",
    ),
    _case(
        "INT-FR-C360-IDENTITY-VERIFY",
        "Identity resolves only from a gateway-bound session or an exact channel identifier",
        SUITE_C360,
        "integration",
        "offline",
        "critical",
        "P1",
        "blueprint",
        ["FR-C360-001", "NFR-008", "BR-009", "TC-E2E-004"],
        ["entity:Customer Identity", "intent:order_status", "stage:CONTEXT"],
        [DB, ORCH, PLAN_DATA],
        "A caller claims another person's order by sending a phone number or a verification flag, and service data is "
        "disclosed to the wrong person.",
        ["fixtures/offline/customers.json", "fixtures/offline/orders.json"],
        [
            "Tenant T1 with cust-a verified through SESSION_BOUND and an unverified guest session sess-guest-1",
            "Order lookup skill invoked with each candidate subject at 2026-01-15T10:00:00Z",
        ],
        {
            "tenant_id": T1,
            "cases": [
                {"subject": {"session_id": "sess-a-1", "verified_customer_id": "cust-a"}, "expect": "RESOLVED"},
                {"subject": {"session_id": "sess-b-1", "channel_identifier": "wa_id_a"}, "expect": "CHANNEL_IDENTIFIER_EXACT"},
                {"subject": {"session_id": "sess-guest-1", "claimed_phone": "handle-guest-unverified"}, "expect": "UNRESOLVED"},
            ],
            "order_probe": "ORD-A-1",
        },
        _steps(
            (
                "Resolve the subject for sess-a-1 and for a channel payload carrying wa_id_a",
                "the first resolves SESSION_BOUND to cust-a and the second resolves CHANNEL_IDENTIFIER_EXACT to cust-a via the identity registry",
            ),
            (
                "Resolve a subject that only supplies a claimed phone number and a verification_status flag",
                "resolution is UNRESOLVED, customer is null and the flag is ignored",
            ),
            (
                "Ask the order-status skill for ORD-A-1 under the unresolved subject",
                "the skill refuses with CUSTOMER_UNVERIFIED and returns no order, address or payment data",
            ),
            (
                "Ask the same skill for ORD-A-1 under the resolved sess-a-1 subject",
                "the lookup returns ORD-A-1 with SHIPPED and PAID, proving the refusal is identity-scoped and not a blanket failure",
            ),
        ),
        [
            "Only SESSION_BOUND and CHANNEL_IDENTIFIER_EXACT produce a customer id; the claimed-phone subject resolves to null",
            "The unresolved subject receives CUSTOMER_UNVERIFIED and zero order fields",
            "The verified subject receives exactly ORD-A-1 (SHIPPED, PAID) and not ORD-B-1",
        ],
        [
            "Trust a client-supplied phone number or verification flag as identity proof",
            "Return any order field for an unresolved subject",
        ],
        [
            "Identity resolution result per subject with the resolution mode",
            "Skill refusal payload with code CUSTOMER_UNVERIFIED plus the successful ORD-A-1 response",
        ],
        [
            "Delete the run-scoped resolution and lookup rows for run-t1-c360-ident-*; keep the refusal audit entry",
        ],
        "Call the real identity resolver and order-status skill with fixture subjects; only the ERP read is stubbed. "
        "Fail the case if the oracle is limited to the resolution enum rather than the returned order fields.",
    ),
    _case(
        "INT-FR-C360-IDENTITY-MERGE",
        "Identity handles merge into one customer and an ambiguous merge fails closed",
        SUITE_C360,
        "integration",
        "offline",
        "high",
        "P1",
        "extension",
        ["FR-C360-001", "NFR-006", "NFR-008"],
        ["entity:Customer Identity", "entity:Customer", "stage:CONTEXT"],
        [PLAN_DATA, DB, PLAN_API],
        "Two handles belonging to one person stay split, or two different people are merged, so orders, consent and "
        "conversations attach to the wrong human. Blueprint is silent on merge-conflict arbitration, so this is an "
        "extension probe with a proposed configuration, not an SRS requirement.",
        ["fixtures/offline/customers.json", "fixtures/offline/consents.json"],
        [
            "Tenant T1 with cust-a owning handles wa_id_a and cust-a@example.invalid in run namespace run-t1-merge-*",
            "A second unlinked handle cust-a2@example.invalid observed in the same session history",
        ],
        {
            "tenant_id": T1,
            "merge_request": {"primary_customer_id": "cust-a", "incoming_handle": "cust-a2@example.invalid", "evidence": "exact email confirmation in verified session"},
            "conflicting_request": {"primary_customer_id": "cust-a", "incoming_handle": "cust-b@example.invalid", "evidence": "same device fingerprint only"},
        },
        _steps(
            (
                "Merge the incoming handle that carries exact-verification evidence into cust-a",
                "the handle joins cust-a, one customer identity row exists, and prior orders/timeline/consent of cust-a stay intact",
            ),
            (
                "Attempt the conflicting merge that is supported only by a device fingerprint",
                "the merge is refused as unverified, no identity row moves and the attempt is recorded",
            ),
            (
                "Re-run the accepted merge with the identical request identity",
                "the operation is idempotent: still exactly one identity row and one merge audit entry",
            ),
            (
                "Read the customer projection for cust-a and for cust-b after both attempts",
                "cust-a shows the merged handle, cust-b keeps exactly its own handle, and no conversation or order moved between them",
            ),
        ),
        [
            "After the accepted merge the identity table holds exactly one row per (tenant, channel_type, identifier) and cust-a owns 3 handles",
            "The fingerprint-only merge is refused and cust-b retains exactly 1 handle with its own orders",
            "No order, conversation or consent record changed owner during either attempt",
        ],
        [
            "Silently union two independently verified accounts into one customer",
            "Move a consent record between customers during a merge",
        ],
        [
            "Identity rows for cust-a and cust-b after each attempt with their channel identifiers",
            "Merge audit entries for the accepted and the refused attempt",
        ],
        [
            "Unlink and delete the run-scoped merged handle row for run-t1-merge-*; retain both audit entries",
        ],
        "Drive the real identity service with fixture handles; device-fingerprint evidence is intentionally insufficient. "
        "Blueprint-silent arbitration rules are declared here as proposed configuration and must not be reported as SRS behavior.",
    ),
    _case(
        "INT-FR-C360-CONFLICT",
        "Conflicting sources resolve in favour of the System of Record and the conflict is surfaced",
        SUITE_C360,
        "integration",
        "offline",
        "high",
        "P1",
        "blueprint",
        ["FR-C360-001", "FR-C360-003", "BR-003", "NFR-005"],
        ["entity:Customer", "entity:Price", "stage:CONTEXT"],
        [DB, PLAN_DATA, SRS],
        "A customer is quoted an amount that contradicts the authoritative source, or a stale cached value silently "
        "overwrites the ERP value.",
        ["fixtures/offline/catalog.json", "fixtures/offline/customers.json"],
        [
            "Tenant T1 where the cached profile holds SKU-OK list price 950 TWD while the live ERP read returns 1000 TWD",
            "Profile and price read executed at 2026-01-15T10:00:00Z in namespace run-t1-conflict-*",
        ],
        {
            "tenant_id": T1,
            "sku_id": "SKU-OK",
            "cached_value": {"list_price": 950, "source": "profile_cache", "cached_at": "2026-01-14T08:00:00Z"},
            "erp_value": {"list_price": 1000, "currency": "TWD", "snapshot_at": "2026-01-15T09:59:58Z"},
        },
        _steps(
            (
                "Read the price through the customer-facing skill while the cache and the ERP disagree",
                "the response uses the ERP value 1000 TWD and records the ERP snapshot as provenance",
            ),
            (
                "Inspect the resolution record for the conflicting pair",
                "the conflict is recorded with both values, the winning source and the reason, and the cached value is not promoted to FACT",
            ),
            (
                "Simulate the ERP snapshot being older than the allowed freshness window",
                "the value is not used at all; the skill refuses and escalates instead of answering with a stale price",
            ),
            (
                "Attempt to write the cached 950 TWD back into the ERP mirror",
                "the write is refused and the mirror still reports 1000 TWD",
            ),
        ),
        [
            "The returned price is 1000 TWD with ERP provenance; 950 TWD never reaches the customer",
            "The conflict record lists both candidate values, the winning source and a reason",
            "A stale ERP snapshot produces a refusal/escalation instead of a price answer",
        ],
        [
            "Answer with the cached value when the authoritative read is unavailable",
            "Write a cached or derived value back into the System-of-Record mirror",
        ],
        [
            "Skill response with the winning value and its provenance",
            "Conflict resolution record comparing cached and ERP values",
        ],
        [
            "Delete the run-scoped cache entries and conflict records for run-t1-conflict-*; keep the refusal audit row",
        ],
        "Stub only the ERP adapter, keep the real cache and conflict-resolution code in the path, and freeze the clock so "
        "freshness is deterministic; the oracle is the returned amount and provenance.",
    ),
    _case(
        "INT-FR-C360-STALE-SNAPSHOT",
        "A stale context snapshot never overrides fresh policy or a fresh consent record",
        SUITE_C360,
        "integration",
        "offline",
        "high",
        "P1",
        "blueprint",
        ["NFR-008", "BR-004", "FR-C360-001"],
        ["memory:Customer Context", "entity:Consent", "stage:ACTION"],
        [PLAN_FLOW, ORCH, SRS],
        "A run started before a consent withdrawal or a policy change keeps acting on the old snapshot and sends a "
        "message that should have been suppressed.",
        ["fixtures/offline/consents.json", "fixtures/offline/platform.json"],
        [
            "Run run-t1-stale-* hydrates context for cust-a at 10:00:00Z while cust-a EMAIL marketing consent is granted",
            "At 10:02:00Z the consent is withdrawn before the send step executes",
        ],
        {
            "tenant_id": T1,
            "customer_id": "cust-a",
            "hydrated_at": "2026-01-15T10:00:00Z",
            "withdrawal_at": "2026-01-15T10:02:00Z",
            "step": {"skill_id": "skill.sales.send_message", "channel": "EMAIL", "mutating": True},
        },
        _steps(
            (
                "Hydrate the context, then withdraw the EMAIL marketing consent before the send step",
                "the run's stored snapshot still shows consent granted, while the consent store shows the withdrawal with its timestamp",
            ),
            (
                "Execute the send step",
                "the pre-step safety re-verification reads the fresh consent state and blocks the send instead of trusting the snapshot",
            ),
            (
                "Query the queued marketing messages for cust-a and the audit trail",
                "zero messages were dispatched and a suppression event referencing the withdrawal is recorded",
            ),
            (
                "Grant the consent again and re-run the same step with the same request identity",
                "the step now proceeds, proving the block was caused by the fresh consent read and not by a broken pipeline",
            ),
        ),
        [
            "Zero outbound marketing messages exist for cust-a after the withdrawal",
            "The decision used the consent read at execution time (timestamp later than the snapshot) and recorded a suppression reason",
            "After re-granting, exactly one message is produced with the original effect_key",
        ],
        [
            "Dispatch a marketing message from a snapshot whose consent was already withdrawn",
            "Overwrite the fresh consent record with the older snapshot value",
        ],
        [
            "Consent-store read used at execution time with its timestamp",
            "Suppression audit event plus the outbound message count for cust-a (must be 0)",
        ],
        [
            "Delete the run-scoped messages and restore the fixture consent to its original state for run-t1-stale-*",
        ],
        "Use a deterministic clock to separate hydration and execution, keep the real consent check in the path, and "
        "stub only the channel adapter so the assertion is on the dispatched-message count.",
    ),
    _case(
        "INT-FR-C360-LATE-DATA",
        "Late arriving data backfills the timeline without rewriting settled state",
        SUITE_C360,
        "integration",
        "offline",
        "medium",
        "P1",
        "extension",
        ["FR-C360-002", "NFR-005", "NFR-006"],
        ["entity:Customer Event", "event:product_view", "stage:OUTCOME"],
        [DB, CONN, PLAN_DATA],
        "Late telemetry rewrites a settled funnel state, so reporting and attribution change retroactively after a "
        "decision was already taken. Blueprint is silent on the resequencing window; the window used here is proposed configuration.",
        ["fixtures/offline/events.json", "fixtures/offline/platform.json"],
        [
            "Tenant T1 where checkout and purchase for cust-a were processed before the product_view arrived",
            "Late evt_late_view_1 (occurred_at 09:58:30Z, ingested_at 10:04:00Z) delivered in namespace run-t1-late-*",
        ],
        {
            "tenant_id": T1,
            "late_event": "evt_late_view_1",
            "settled_state": {"funnel_stage": "purchase", "decided_at": "2026-01-15T09:59:40Z"},
            "proposed_resequencing_window_seconds": 900,
        },
        _steps(
            (
                "Ingest the late product_view and query the timeline and funnel projection",
                "the timeline gains the view at its occurred_at position while the funnel stage stays purchase",
            ),
            (
                "Re-run the decision stage for the same correlation id",
                "no new decision is produced for the already-decided step, and the late signal does not re-open the run",
            ),
            (
                "Deliver the same late event twice and once with a mutated occurred_at",
                "the duplicate adds no entry and the mutated payload is rejected as a conflict instead of silently replacing history",
            ),
            (
                "Read the attribution record for the purchase",
                "attribution still points at the original decision and cites the settled evidence record",
            ),
        ),
        [
            "The settled funnel stage is still purchase and the decision timestamp is unchanged",
            "Exactly one timeline entry exists for evt_late_view_1 at 09:58:30Z",
            "The attribution record still references the original decision and evidence chain hash",
        ],
        [
            "Re-open or re-decide a settled run because of late telemetry",
            "Rewrite an existing timeline entry in place with a late payload",
        ],
        [
            "Timeline entries and funnel projection before/after the late delivery",
            "Attribution record linkage (decision id, evidence chain hash) after the late delivery",
        ],
        [
            "Delete the run-scoped late-event rows for run-t1-late-*; the append-only event log entry stays",
        ],
        "Inject the late event through the real normalizer with a frozen clock gap; the resequencing window is declared as "
        "proposed configuration because the blueprint does not fix it.",
    ),
    _case(
        "INT-FR-C360-CONSENT-WITHDRAWAL",
        "Consent withdrawal immediately stops queued marketing and cancels schedules",
        SUITE_C360,
        "integration",
        "offline",
        "critical",
        "P1",
        "baseline",
        ["BR-004", "FR-C360-001", "NFR-008"],
        ["entity:Consent", "memory:Customer Context", "stage:EXECUTION"],
        [SRS, PLAN_DATA, DB],
        "Marketing continues after a customer opts out, which is a legal and brand-damaging violation.",
        ["fixtures/offline/consents.json", "fixtures/offline/platform.json"],
        [
            "Tenant T1 with a queued reminder sequence for cust-a (EMAIL marketing granted, 2 messages per week cap)",
            "Consent withdrawal event injected at 2026-01-15T10:05:00Z in namespace run-t1-consent-*",
        ],
        {
            "tenant_id": T1,
            "customer_id": "cust-a",
            "queued_messages": ["msg_reminder_1", "msg_reminder_2"],
            "withdrawal": {"channel": "email", "consent_type": "marketing_messaging", "at": "2026-01-15T10:05:00Z"},
        },
        _steps(
            (
                "Register the withdrawal and read the consent record and the consent_marketing projection",
                "the record moves to not granted with an opt-out timestamp and the projection reports consent_marketing false with an active suppression",
            ),
            (
                "Attempt to dispatch both queued reminder messages",
                "zero messages are dispatched and each attempt is refused before the channel adapter is reached",
            ),
            (
                "Inspect the schedule and queue state",
                "the reminder schedule is cancelled and the queued items are marked suppressed rather than silently dropped",
            ),
            (
                "Attempt to weaken the consent record by replaying an older granted payload",
                "the replay is rejected and the newer withdrawal remains the effective state",
            ),
        ),
        [
            "Dispatched marketing messages for cust-a after the withdrawal: exactly 0",
            "The queue holds 2 suppressed items with a reason referencing the withdrawal event",
            "The consent record keeps the later opt-out timestamp and no older granted payload overwrites it",
        ],
        [
            "Send any marketing message after the withdrawal",
            "Delete the withdrawal record to make a send possible",
        ],
        [
            "Consent record and projection values with timestamps",
            "Queue state showing 2 suppressed items and the zero-dispatch evidence",
        ],
        [
            "Clear the run-scoped queue and schedule items for run-t1-consent-*; retain the consent audit history",
        ],
        "Replay the withdrawal through the real consent service and observe the queue; the channel adapter is a test sink "
        "that records zero calls, which is the oracle for suppression.",
    ),
    _case(
        "INT-FR-C360-DERIVED-ATTR-EXPIRY",
        "Derived segment attributes expire and are recomputed without touching the System of Record",
        SUITE_C360,
        "integration",
        "offline",
        "medium",
        "P1",
        "blueprint",
        ["FR-C360-003", "FR-C360-001", "BR-003"],
        ["entity:Segment", "entity:Customer", "stage:LEARNING"],
        [DB, ORCH, PLAN_DATA],
        "A months-old churn or segment guess is reused as if it were current, and outreach is aimed at a state the "
        "customer is no longer in.",
        ["fixtures/offline/customers.json", "fixtures/offline/platform.json"],
        [
            "Tenant T1 with a dormant-derived segment hypothesis computed at 2025-09-01T00:00:00Z for cust-dormant",
            "New purchase signal recorded for the same customer at 2026-01-10T00:00:00Z in namespace run-t1-derived-*",
        ],
        {
            "tenant_id": T1,
            "customer_id": "cust-dormant",
            "computed_at": "2025-09-01T00:00:00Z",
            "new_signal_at": "2026-01-10T00:00:00Z",
            "max_age_days": 30,
        },
        _steps(
            (
                "Read the derived segment attribute after the freshness window has passed",
                "the attribute is reported as expired/unusable and no downstream skill treats it as current",
            ),
            (
                "Recompute the derived attribute after the new purchase signal",
                "a new value is produced with a new computed_at and the name still carries the _hypothesis suffix",
            ),
            (
                "Compare the customers row before and after the recompute",
                "the System-of-Record mirror is byte-identical; only a hypothesis-class projection/evidence record changed",
            ),
            (
                "Attempt to persist the recomputed value into the customers row",
                "the write is refused and the mirror remains unchanged",
            ),
        ),
        [
            "The stale derived attribute is rejected once older than 30 days rather than reused silently",
            "The recomputed attribute is exposed with _hypothesis in its name and a computed_at within the run window",
            "The customers mirror digest is identical before and after both operations",
        ],
        [
            "Serve an expired derived attribute as a current customer fact",
            "Persist a derived segment value into the System-of-Record mirror",
        ],
        [
            "Derived attribute records with computed_at, name and expiry assessment",
            "Before/after digest of the cust-dormant mirror row",
        ],
        [
            "Delete the run-scoped recomputed hypothesis rows for run-t1-derived-*; keep the audit entries",
        ],
        "Freeze the clock to make expiry deterministic, keep the real projection and guard code in the path, and stub only "
        "the ERP aggregate read; assert on computed_at and mirror digests.",
    ),
    _case(
        "INT-FR-C360-ANON-BOUNDARY",
        "Anonymous sessions stay anonymous until a verified link exists",
        SUITE_C360,
        "integration",
        "offline",
        "high",
        "P1",
        "blueprint",
        ["NFR-006", "FR-C360-001", "BR-009", "TC-E2E-004"],
        ["entity:Customer Identity", "memory:Working Memory", "stage:CONTEXT"],
        [DB, ORCH, PLAN_DATA],
        "Anonymous browsing history is attached to a customer who merely shares a device or a cookie, leaking one "
        "person's behaviour into another's profile.",
        ["fixtures/offline/customers.json", "fixtures/offline/events.json"],
        [
            "Tenant T1 with anonymous session sess-guest-1 and an unrelated verified customer cust-a in namespace run-t1-anon-*",
            "Link attempt raised while the session is still unauthenticated",
        ],
        {
            "tenant_id": T1,
            "anonymous_session": "sess-guest-1",
            "events": ["evt_anon_1"],
            "link_attempt": {"claimed_customer_id": "cust-a", "evidence": "cookie only"},
        },
        _steps(
            (
                "Ingest the anonymous events and read the anonymous working memory",
                "events are stored against anonymous_id/session_id with customer_id null and no Customer 360 FACT is attached",
            ),
            (
                "Attempt to link the anonymous session to cust-a using a cookie alone",
                "the link is refused as unverified and the timeline written under the anonymous session is not re-attributed",
            ),
            (
                "Link through a gateway-authenticated session for cust-a and then read the merged view",
                "the previously anonymous events stay attributed to the anonymous session while new events attach to cust-a, and the link event is recorded",
            ),
            (
                "Scan cust-b context for any trace of the anonymous session",
                "zero occurrences, and no shared working-memory bucket exists between the sessions",
            ),
        ),
        [
            "Anonymous events remain customer_id null until a server-verified link exists",
            "Cookie-only linking is refused and produces no retroactive attribution",
            "A verified link records a link event and does not move data into any other customer's context",
        ],
        [
            "Attach anonymous browsing history to a customer without server-side verification",
            "Share one working-memory bucket across anonymous sessions",
        ],
        [
            "Anonymous session rows with customer_id and the refused link audit entry",
            "Link event record from the verified path with the session identifiers it joined",
        ],
        [
            "Delete the run-scoped anonymous and link rows for run-t1-anon-*; keep audit records",
        ],
        "Drive the real identity-link path with fixture events; only the ERP/vector reads are stubbed. The oracle is the "
        "attribution of the stored event rows, not an enum value.",
    ),
]
