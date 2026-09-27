"""Internal platform fragment loaded by the platform source façade."""

# Shared constants, helpers and fixtures are defined by the façade before it
# loads this fragment.  Importing them explicitly keeps dependencies visible
# while avoiding a package-relative import cycle under the generator's
# ``tc_sources_platform`` dynamic module name.
from tc_sources_platform import (
    CONN,
    DB,
    PLAN_API,
    PLAN_DATA,
    SRS,
    SUITE_API,
    SUITE_UNIT,
    T1,
    _case,
    _steps,
)

# (baseline id UNIT-KB-DRAFT) An unpublished draft must never be served as policy.
_kb_draft_case = _case(
    cid="UNIT-KB-DRAFT",
    title="Unpublished draft FAQ chunk is never retrieved, cited or answered as company policy",
    suite=SUITE_UNIT,
    layer="unit",
    environment="offline",
    priority="critical",
    gate="P0",
    basis="baseline",
    requirements=["SRS-10", "NFR-001"],
    facets=["kb:/customer-care/faq.md"],
    references=[SRS, DB, PLAN_DATA],
    risk="An unreviewed draft sentence (same-day free delivery for everyone) reaches a customer as published policy "
    "while the approved FAQ still states the real 3 to 5 business day lead time.",
    fixtures=["fixtures/offline/knowledge.json"],
    preconditions=[
        "Tenant T1 corpus loaded in run-t1-kb-unit-kb-draft with the 21 approved documents plus the draft, review and "
        "superseded entries of fixtures/offline/knowledge.json",
        "The draft chunk /customer-care/faq.md#draft-unpublished at source_version v7.0-draft stays in the same "
        "collection during the query",
    ],
    inputs={
        "tenant_id": T1,
        "query": "How fast is delivery and is same-day shipping free?",
        "draft_candidate": {
            "file_path": "/customer-care/faq.md#draft-unpublished",
            "source_version": "v7.0-draft",
            "document_status": "draft",
            "owner": "ops-support",
        },
        "approved_answer": "3 to 5 business days after payment confirmation",
        "trap_answer_must_not_appear": "same-day free delivery for every customer",
    },
    steps=_steps(
        (
            "Retrieve the delivery-time answer context with the tenant filter fixed to T1",
            "the returned context contains the approved /customer-care/faq.md chunk and never the draft chunk",
        ),
        (
            "Rank retrieval again with the draft chunk boosted to the top of the candidate list",
            "the draft chunk is filtered out by document_status before ranking and cannot enter the context",
        ),
        (
            "Ask the agent the exact question the draft chunk answers",
            "the reply states the approved lead time and never repeats the draft same-day free-delivery claim",
        ),
        (
            "Request a citation for the draft chunk id directly",
            "the request is refused with no citation, because a draft has no published provenance",
        ),
    ),
    assertions=[
        "The retrieval result set contains zero points whose document_status is draft, review or superseded",
        "The draft file_path /customer-care/faq.md#draft-unpublished never appears as a citation or as answer text",
        "The trap answer 'same-day free delivery' never appears while the approved lead time 3 to 5 business days does",
    ],
    forbidden=[
        "Serving, ranking or citing the draft chunk as if it were an approved document",
        "Falling back to model memory when the approved FAQ chunk is outranked by the draft",
    ],
    evidence=[
        "Retrieval log with the status filter applied and the draft chunk scored and then excluded",
        "Answer text plus its citation list showing only the approved faq.md source_version v6.0",
    ],
    cleanup=[
        "Delete the run-scoped query, context and answer rows under run-t1-kb-unit-kb-draft; the draft entry stays in the corpus",
    ],
    automation="Query the retrieval API with the fixed tenant while the draft chunk is present and assert on the "
    "excluded point and the absence of the draft text in the answer; the draft status is a fixture value, so the "
    "result is deterministic.",
)


def _api_case(
    cid,
    title,
    requirements,
    facets,
    inputs,
    steps,
    assertions,
    forbidden,
    evidence,
    cleanup,
    automation,
    risk,
    fixtures,
    preconditions,
    priority="high",
    gate="P1",
    basis="baseline",
    references=None,
    prerequisites=(),
):
    """One API/connector integration case carrying the shared connector references."""
    return _case(
        cid=cid,
        title=title,
        suite=SUITE_API,
        layer="integration",
        environment="offline",
        priority=priority,
        gate=gate,
        basis=basis,
        requirements=requirements,
        facets=facets,
        references=references or [SRS, CONN, PLAN_API],
        risk=risk,
        fixtures=fixtures,
        preconditions=preconditions,
        inputs=inputs,
        steps=steps,
        assertions=assertions,
        forbidden=forbidden,
        evidence=evidence,
        cleanup=cleanup,
        automation=automation,
        prerequisites=prerequisites,
    )


# Baseline id INT-API-001: ERP read surface and the unguarded-mutation refusal.
_api_resource_case = _api_case(
    cid="INT-API-001",
    title="ERP reads cover eight resource groups while every unguarded mutation is denied",
    requirements=["API-001", "BR-005", "SRS-23"],
    facets=[
        "entity:Product",
        "entity:Price",
        "entity:Inventory",
        "entity:Order",
        "entity:Invoice",
        "entity:Customer",
        "stage:ACTION",
    ],
    inputs={
        "tenant_id": T1,
        "resource_groups": [
            "products",
            "prices",
            "inventory",
            "orders",
            "invoices",
            "customers",
            "shipments",
            "returns",
        ],
        "expected_reads": {
            "products": {"sku_id": "SKU-OK", "name": "Aurora Everyday Kettle (synthetic)"},
            "prices": {"sku_id": "SKU-OK", "amount": 1000, "currency": "TWD"},
            "inventory": {"sku_id": "SKU-OK", "warehouse_code": "WH-TPE", "available_to_promise": 12},
            "orders": {"order_number": "ORD-A-1", "state": "SHIPPED"},
            "invoices": {"invoice_number": "INV-A-1", "amount": 1000},
            "customers": {"external_crm_id": "CRM-A-1"},
            "shipments": {"shipment_id": "SHP-A-1", "carrier": "sandbox-carrier"},
            "returns": {"return_id": "RET-A-1", "state": "REQUESTED"},
        },
        "unguarded_mutations": [
            {"method": "PATCH", "path": "/erp/prices/SKU-OK", "body": {"amount": 1}},
            {"method": "POST", "path": "/erp/inventory/SKU-OK/adjust", "body": {"delta": 1000}},
            {"method": "POST", "path": "/erp/orders/ORD-A-1/state", "body": {"state": "PAID"}},
        ],
    },
    steps=_steps(
        (
            "Read all eight ERP resource groups through the tenant-scoped connector",
            "each group returns the authoritative ERP value and no read is served from a stale cache entry",
        ),
        (
            "Attempt each direct mutation against the ERP connector without an Action, Approval or Execution record",
            "every mutation is refused at the guard and the ERP test sink receives no write call",
        ),
        (
            "Attempt the same mutations again with a fabricated approval claim embedded in the request body",
            "the fabricated claim is ignored, the mutation is still refused and the sink stays write-free",
        ),
        (
            "Re-read the eight resource groups after the refused mutations",
            "the values are identical to the first read, proving no partial write occurred",
        ),
    ),
    assertions=[
        "All eight resource groups resolve to their fixture values: SKU-OK price 1000 TWD and available_to_promise 12",
        "Zero write calls reach the ERP test sink while only the three unguarded mutations are attempted",
        "Every refusal carries an explicit authorization error code and creates no Execution row",
    ],
    forbidden=[
        "Writing to the ERP outside the prepared-action and approval path",
        "Accepting a client-supplied approval claim as the authority to mutate",
    ],
    evidence=[
        "ERP test-sink call log split into reads and writes with the count of denied mutations",
        "Read output of the eight groups before and after the mutation attempts showing identical values",
    ],
    cleanup=[
        "Delete the run-scoped connector call rows under run-t1-api-erp; the ERP fixture mirror stays unchanged",
    ],
    automation="Point the real connector guard at the ERP test sink and assert the read/write split and the unchanged "
    "values; the guard code is exercised and only the ERP endpoint is substituted.",
    risk="An agent or caller mutates ERP stock, price or order state outside the approval chain, so the system of "
    "record silently diverges from the governed action history.",
    fixtures=["fixtures/offline/orders.json", "fixtures/offline/catalog.json"],
    preconditions=[
        "Tenant T1 ERP connector bound to the test sink in namespace run-t1-api-erp with the catalogue and order fixtures loaded",
        "The connector guard, action and approval stores are the real components; only the ERP endpoint is substituted",
    ],
)


# (suffix, event, accepted aliases, distinct browser payload, signal contract, ERP fact that must stay untouched)
_EVENT_ROWS = [
    {
        "suffix": "session",
        "event": "session",
        "aliases": ["session_start", "web.session.started"],
        "payload": {
            "event_id": "evt_sess_1",
            "session_id": "sess-a-1",
            "customer_ref": "anonymous",
            "occurred_at": "2026-01-15T09:59:00Z",
        },
        "signal": "the session stays anonymous and no customer identity is fabricated",
        "erp_fact": None,
    },
    {
        "suffix": "product_view",
        "event": "product_view",
        "aliases": ["view_item", "product.viewed"],
        "payload": {
            "event_id": "evt_view_1",
            "session_id": "sess-a-1",
            "sku_id": "SKU-OK",
            "occurred_at": "2026-01-15T10:00:10Z",
        },
        "signal": "the product view is a behavioural SIGNAL about SKU-OK and creates no ERP catalogue fact",
        "erp_fact": None,
    },
    {
        "suffix": "search",
        "event": "search",
        "aliases": ["search_performed", "search.query"],
        "payload": {
            "event_id": "evt_search_1",
            "session_id": "sess-a-1",
            "query_text": "wireless earbuds",
            "result_count": 0,
            "occurred_at": "2026-01-15T10:00:20Z",
        },
        "signal": "the raw query text as a SIGNAL about behaviour and never an assertion that a product exists",
        "erp_fact": None,
    },
    {
        "suffix": "click",
        "event": "click",
        "aliases": ["product_click", "item.clicked"],
        "payload": {
            "event_id": "evt_click_1",
            "session_id": "sess-a-1",
            "sku_id": "SKU-OK",
            "position": 2,
            "occurred_at": "2026-01-15T10:00:30Z",
        },
        "signal": "the click and its result position as a behavioural SIGNAL only",
        "erp_fact": None,
    },
    {
        "suffix": "add_to_cart",
        "event": "add_to_cart",
        "aliases": ["add_item", "cart.item_added"],
        "payload": {
            "event_id": "evt_cart_1",
            "session_id": "sess-a-1",
            "cart_id": "cart-a-1",
            "sku_id": "SKU-OK",
            "quantity": 1,
            "occurred_at": "2026-01-15T10:01:00Z",
        },
        "signal": "the cart line as a SIGNAL that reserves no ERP stock",
        "erp_fact": None,
    },
    {
        "suffix": "checkout",
        "event": "checkout",
        "aliases": ["begin_checkout", "cart.checkout_started"],
        "payload": {
            "event_id": "evt_checkout_1",
            "session_id": "sess-a-1",
            "cart_id": "cart-a-1",
            "order_number": "ORD-A-1",
            "occurred_at": "2026-01-15T10:02:00Z",
        },
        "signal": "the checkout as a SIGNAL while the order state stays authoritative in the ERP",
        "erp_fact": None,
    },
    {
        "suffix": "purchase",
        "event": "purchase",
        "aliases": ["purchase_completed", "order_completed"],
        "payload": {
            "event_id": "evt_purchase_1",
            "session_id": "sess-a-1",
            "order_number": "ORD-A-1",
            "amount": 1000,
            "currency": "TWD",
            "occurred_at": "2026-01-15T10:03:00Z",
        },
        "signal": "the browser purchase as a behavioural SIGNAL that never overwrites the ERP order or revenue FACT",
        "erp_fact": {"order_number": "ORD-A-1", "state": "SHIPPED", "revenue_total": 1000},
    },
]


def _event_case(row):
    """One canonical customer event: alias canonicalization, dedupe, ordering and browser-signal staging."""
    suffix = row["suffix"]
    event = row["event"]
    payload = row["payload"]
    aliases = row["aliases"]
    erp = row["erp_fact"]
    cid = "INT-API-002-%s" % suffix
    run = "run-t1-api-evt-%s" % suffix

    steps = [
        (
            "Deliver the canonical %s event %s" % (event, payload["event_id"]),
            "one event row is stored under the canonical name %s with its occurred_at preserved" % event,
        ),
        (
            "Deliver the identical payload under the accepted alias %s" % aliases[0],
            "the alias is canonicalized to %s and no second event row is created" % event,
        ),
        (
            "Redeliver the same event_id as a delivery retry",
            "the retry is deduplicated: still exactly one row and no duplicate derived signal is emitted",
        ),
        (
            "Deliver a late event whose occurred_at precedes events already ingested",
            "the late event is stored with its own occurred_at and the tenant timeline is neither reordered nor rewritten",
        ),
    ]
    assertions = [
        "Exactly one event row exists for %s after the canonical, alias and retry deliveries" % payload["event_id"],
        "The stored canonical name is %s and the raw alias %s never appears as a stored event name" % (event, aliases[0]),
        "The late delivery keeps its own occurred_at and adds only its own single timeline entry",
        "The event stays a %s: %s" % (event, row["signal"]),
    ]
    forbidden = [
        "Persisting a raw alias name as the canonical event or creating a second row for a retried event_id",
        "Reordering the timeline so a late event rewrites an outcome already derived from later data",
        "Allowing a browser-origin event to write an ERP or catalogue fact",
    ]
    facets = ["event:%s" % event, "stage:SIGNAL"]
    requirements = ["API-002", "FR-C360-002"]
    if erp is not None:
        steps.append(
            (
                "Read the ERP order FACT after the browser purchase signal",
                "ORD-A-1 keeps its authoritative state and revenue while the purchase stays a SIGNAL",
            )
        )
        assertions.append(
            "The ERP order ORD-A-1 stays at state %s with revenue_total %s untouched by the browser purchase"
            % (erp["state"], erp["revenue_total"])
        )
        facets.append("entity:Order")
        requirements.append("BR-003")
    return _api_case(
        cid=cid,
        title="Inbound %s events canonicalize aliases, dedupe replays and keep browser origin out of ERP facts" % event,
        requirements=requirements,
        facets=facets,
        inputs={
            "tenant_id": T1,
            "canonical_event": event,
            "accepted_aliases": aliases,
            "origin": "browser",
            "payload": payload,
            "duplicate_delivery": {"event_id": payload["event_id"], "delivery_attempt": 2},
            "late_delivery": {
                "event_id": payload["event_id"] + "_late",
                "occurred_at": "2026-01-15T09:50:00Z",
                "ingested_at": "2026-01-15T10:04:00Z",
            },
            "erp_fact_before": erp,
        },
        steps=_steps(*steps),
        assertions=assertions,
        forbidden=forbidden,
        evidence=[
            "Stored event rows with canonical name, event_id, occurred_at and ingested_at for the canonical, alias, replay and late deliveries",
            "ERP mirror read of ORD-A-1 and the catalogue before and after ingest showing no browser-origin write",
        ],
        cleanup=[
            "Delete the run-scoped event rows and derived signals under %s; keep the audit entries" % run,
        ],
        automation="Post the canonical, alias, replay and late payloads to the real ingest route with only the ERP "
        "adapter stubbed; the oracle couples the stored row count with the unchanged ERP read.",
        risk="An event alias or replay creates a duplicate or a forged behaviour signal, or a browser-origin purchase "
        "is promoted into the ERP system of record that governs revenue.",
        fixtures=["fixtures/offline/events.json", "fixtures/offline/platform.json"],
        preconditions=[
            "Tenant T1 ingest route reachable in namespace %s with the T1 event and ERP fixtures loaded" % run,
            "The canonical event mapping and the ERP adapter are stubbed by fixtures/offline/events.json and fixtures/offline/orders.json",
        ],
    )


# (suffix, channel facet, provider, signature scheme, inbound payload, tampered variant, outbound message)
_CHANNEL_ROWS = [
    {
        "suffix": "EMAIL",
        "facet": "EMAIL",
        "provider": "mail-sandbox",
        "signature": "HMAC-SHA256 over raw body plus timestamp header",
        "inbound": {
            "event_id": "ch_email_in_1",
            "provider_message_id": "pg_email_1",
            "from": "cust-a@example.invalid",
            "subject": "Where is my order ORD-A-1?",
            "received_at": "2026-01-15T10:00:00Z",
        },
        "outbound": {
            "idempotency_key": "ch_email_out_key_1",
            "to": "cust-a@example.invalid",
            "body": "Your order ORD-A-1 shipped and arrives in 3 to 5 business days.",
        },
    },
    {
        "suffix": "MESSENGER",
        "facet": "FACEBOOK",
        "provider": "meta-messenger",
        "signature": "X-Hub-Signature-256 HMAC-SHA256 over the raw body",
        "inbound": {
            "event_id": "ch_messenger_in_1",
            "provider_message_id": "pg_messenger_1",
            "sender_handle": "psid-a-1",
            "text": "Is SKU-OK in stock?",
            "received_at": "2026-01-15T10:00:05Z",
        },
        "outbound": {
            "idempotency_key": "ch_messenger_out_key_1",
            "to": "psid-a-1",
            "body": "SKU-OK is available; shall I reserve one for you?",
        },
    },
    {
        "suffix": "SMS",
        "facet": "SMS",
        "provider": "sms-gateway",
        "signature": "HMAC-SHA256 over body plus url and timestamp",
        "inbound": {
            "event_id": "ch_sms_in_1",
            "provider_message_id": "pg_sms_1",
            "sender_handle": "sms_handle_a",
            "text": "STOP reminders and tell me the return window",
            "received_at": "2026-01-15T10:00:10Z",
        },
        "outbound": {
            "idempotency_key": "ch_sms_out_key_1",
            "to": "sms_handle_a",
            "body": "Returns are accepted within 7 days of delivery; reminders are cancelled.",
        },
    },
    {
        "suffix": "TIKTOK",
        "facet": "TIKTOK",
        "provider": "tiktok-business",
        "signature": "HMAC-SHA256 over body plus X-Tt-Timestamp",
        "inbound": {
            "event_id": "ch_tiktok_in_1",
            "provider_message_id": "pg_tiktok_1",
            "sender_handle": "open_id_a",
            "text": "how much is the kettle?",
            "received_at": "2026-01-15T10:00:15Z",
        },
        "outbound": {
            "idempotency_key": "ch_tiktok_out_key_1",
            "to": "open_id_a",
            "body": "The kettle is 1000 TWD today.",
        },
    },
    {
        "suffix": "WEB_CHAT",
        "facet": "WEB_APP_CHAT",
        "provider": "webchat-widget",
        "signature": "HMAC-SHA256 over body plus widget session token",
        "inbound": {
            "event_id": "ch_webchat_in_1",
            "provider_message_id": "pg_webchat_1",
            "session_id": "sess-a-1",
            "text": "do you deliver on weekends?",
            "received_at": "2026-01-15T10:00:20Z",
        },
        "outbound": {
            "idempotency_key": "ch_webchat_out_key_1",
            "to": "sess-a-1",
            "body": "Deliveries run on business days within the 3 to 5 business day window.",
        },
    },
    {
        "suffix": "ZALO",
        "facet": "ZALO",
        "provider": "zalo-oa",
        "signature": "HMAC-SHA256 over body plus X-ZEvent-Timestamp",
        "inbound": {
            "event_id": "ch_zalo_in_1",
            "provider_message_id": "pg_zalo_1",
            "sender_handle": "zalo_user_a",
            "text": "can I change the delivery address?",
            "received_at": "2026-01-15T10:00:25Z",
        },
        "outbound": {
            "idempotency_key": "ch_zalo_out_key_1",
            "to": "zalo_user_a",
            "body": "Yes, the address can change until the order leaves the warehouse.",
        },
    },
]


def _channel_case(row):
    """One messaging channel: signed ingress, one receipt, replay refusal and idempotent egress."""
    suffix = row["suffix"]
    cid = "INT-API-003-%s" % suffix
    run = "run-t1-api-ch-%s" % suffix.lower()
    inbound = row["inbound"]
    outbound = row["outbound"]
    return _api_case(
        cid=cid,
        title="%s channel webhook verifies the signature, records one receipt and rejects replays" % suffix,
        requirements=["API-003", "NFR-002"],
        facets=["channel:%s" % row["facet"], "stage:EVIDENCE"],
        inputs={
            "tenant_id": T1,
            "channel": row["facet"],
            "provider": row["provider"],
            "signature_scheme": row["signature"],
            "signing_secret_ref": "sandbox/%s/webhook-secret" % row["provider"],
            "inbound_payload": inbound,
            "tampered_signature": "computed over a different secret with the same body",
            "outbound_message": outbound,
        },
        steps=_steps(
            (
                "Deliver one correctly signed inbound webhook for %s" % suffix,
                "the delivery is accepted and exactly one receipt is persisted keyed by the provider message id",
            ),
            (
                "Redeliver the byte-identical webhook with the same provider message id",
                "the replay is deduplicated: still exactly one receipt and no second message, case or customer signal",
            ),
            (
                "Deliver the same body with a signature computed over a different secret",
                "the webhook is rejected with an authentication error and no receipt, message or side effect is created",
            ),
            (
                "Send one outbound reply and then retry it with the same idempotency key",
                "the provider test sink observes exactly one outbound send and the receipt references that key",
            ),
        ),
        assertions=[
            "Exactly one receipt row exists per provider message id after the replay: %s" % inbound["provider_message_id"],
            "The tampered delivery creates zero receipts, zero messages and zero outbound calls",
            "The outbound send count in the provider test sink is exactly one for key %s" % outbound["idempotency_key"],
            "The receipt belongs to channel %s and no other channel or tenant observes it" % row["facet"],
        ],
        forbidden=[
            "Processing a webhook whose signature does not verify against the channel secret",
            "Sending the outbound reply a second time when the first provider call already succeeded",
        ],
        evidence=[
            "Webhook receipt rows with signature verification result, provider message id and idempotency key",
            "Provider test-sink call log showing one accept, one replay dedupe and zero send for the tampered delivery",
        ],
        cleanup=[
            "Delete the run-scoped webhook receipts and message rows under %s; keep the immutable audit entries" % run,
        ],
        automation="Post each webhook variant to the real signature-verifying route with the provider adapter replaced by "
        "a test sink; the oracle couples the receipt count with the sink call count.",
        risk="A forged or replayed webhook injects messages or sends duplicate outbound replies, and the customer "
        "receives the same answer twice or an attacker acts as the customer.",
        fixtures=["fixtures/offline/platform.json", "fixtures/offline/events.json"],
        preconditions=[
            "Tenant T1 %s webhook route reachable in namespace %s with the channel secret loaded outside the repo" % (suffix, run),
            "The provider adapter for %s is a test sink recording every call and its idempotency key" % row["provider"],
        ],
    )


# Baseline id INT-API-IDEMP: identical replay versus conflicting replay.
_api_idemp_case = _api_case(
    cid="INT-API-IDEMP",
    title="An identical replay returns the stored response while a changed payload on the same key returns 409 with one effect",
    requirements=["API-003", "BR-005"],
    facets=["stage:ACTION", "entity:Execution"],
    inputs={
        "tenant_id": T1,
        "idempotency_key": "idem-a-1",
        "first_request": {
            "action": "create_order",
            "payload": {"order_number": "ORD-A-1", "sku_id": "SKU-OK", "quantity": 1},
        },
        "identical_replay": {
            "action": "create_order",
            "payload": {"order_number": "ORD-A-1", "sku_id": "SKU-OK", "quantity": 1},
        },
        "conflicting_replay": {
            "action": "create_order",
            "payload": {"order_number": "ORD-A-1", "sku_id": "SKU-OK", "quantity": 2},
        },
        "fresh_key": "idem-a-2",
    },
    steps=_steps(
        (
            "Submit the first request with idempotency key idem-a-1",
            "one effect is applied and the response carries the created resource reference and the key",
        ),
        (
            "Replay the byte-identical request with the same key",
            "the stored response is returned unchanged and the effect count stays one",
        ),
        (
            "Replay with the same key but a payload that differs in quantity",
            "the request is rejected with HTTP 409 and the payload hash mismatch, and the effect count stays one",
        ),
        (
            "Submit the same payload under the fresh key idem-a-2",
            "a second effect is applied and both effects are independently attributable to their keys",
        ),
    ),
    assertions=[
        "The provider test-sink effect count for idem-a-1 is exactly one after the identical replay",
        "The identical replay response body equals the first response including the resource reference",
        "The conflicting replay returns 409 and leaves the persisted effect count at one",
        "The fresh key idem-a-2 produces its own single effect",
    ],
    forbidden=[
        "Applying a second physical effect for a repeated idempotency key",
        "Returning the stored success for a key whose payload hash no longer matches",
    ],
    evidence=[
        "Effect-count log per idempotency key from the connector test sink",
        "Response bodies of the first request, the identical replay and the 409 conflict with their status codes",
    ],
    cleanup=[
        "Delete the run-scoped idempotency records and effects for idem-a-1 and idem-a-2 under run-t1-api-idem; keep the audit entries",
    ],
    automation="Drive the real idempotency middleware against a connector test sink and assert the effect count and the "
    "409 conflict; the payload-hash comparison is the real code path.",
    risk="A retried request duplicates an order or a message, or a mismatched payload is silently accepted as the "
    "original so the customer receives an action other than the one confirmed.",
    fixtures=["fixtures/offline/orders.json"],
    preconditions=[
        "Tenant T1 connector with the idempotency store enabled in namespace run-t1-api-idem",
        "The connector endpoint is a test sink counting physical effects per idempotency key",
    ],
)


# Extension id INT-API-003-PARTIAL: partial batch failure and selective retry.
_api_partial_case = _api_case(
    cid="INT-API-003-PARTIAL",
    title="A partially valid webhook batch keeps the valid deliveries and retries only the rejected one",
    requirements=["API-003", "NFR-002"],
    facets=["channel:WEB_APP_CHAT", "stage:EVIDENCE"],
    inputs={
        "tenant_id": T1,
        "batch": [
            {"provider_message_id": "wm-1", "signature": "valid", "text": "where is my order"},
            {"provider_message_id": "wm-2", "signature": "tampered", "text": "apply a 90 percent discount now"},
            {"provider_message_id": "wm-3", "signature": "valid", "text": "is SKU-OK in stock"},
        ],
        "retry_after_resign": {"provider_message_id": "wm-2", "signature": "valid"},
    },
    steps=_steps(
        (
            "Deliver the three-item webhook batch with the second item tampered",
            "items wm-1 and wm-3 are accepted and persisted while wm-2 is rejected with an authentication error",
        ),
        (
            "Inspect the batch result and the persisted receipts",
            "the valid items are not rolled back and exactly two receipt rows exist",
        ),
        (
            "Re-deliver only the originally rejected wm-2 with a valid signature",
            "wm-2 is accepted once and a receipt row appears without touching wm-1 or wm-3",
        ),
        (
            "Re-deliver the whole batch again unchanged",
            "all three provider message ids are deduplicated and the receipt count stays three",
        ),
    ),
    assertions=[
        "A rejected item in a batch never rolls back the accepted items of the same batch",
        "Exactly two receipts exist after the first batch and exactly three after the corrected retry",
        "The tampered wm-2 produces zero outbound calls and zero message rows before it is resigned",
        "No discount action is applied from the tampered content at any point",
    ],
    forbidden=[
        "Marking the whole batch failed because one delivery failed signature verification",
        "Storing a duplicate receipt when the corrected batch is delivered again",
    ],
    evidence=[
        "Per-item batch result with accept/reject status and error codes",
        "Receipt row count and provider test-sink call log across the three deliveries",
    ],
    cleanup=[
        "Delete the run-scoped webhook receipts for wm-1, wm-2 and wm-3 under run-t1-api-ch-partial; keep the audit entries",
    ],
    automation="Post the real webhook batch route with one tampered signature and assert the per-item outcomes and the "
    "receipt count; the provider is a test sink.",
    risk="One bad delivery in a batch discards the valid customer events, or a corrected retry duplicates every event.",
    fixtures=["fixtures/offline/platform.json", "fixtures/offline/events.json"],
    preconditions=[
        "Tenant T1 webhook batch route reachable in namespace run-t1-api-ch-partial with the channel secret loaded outside the repo",
        "The provider adapter is a test sink that records each accepted delivery exactly once",
    ],
)


API_CASES = [
    _api_resource_case,
    *(_event_case(row) for row in _EVENT_ROWS),
    *(_channel_case(row) for row in _CHANNEL_ROWS),
    _api_idemp_case,
    _api_partial_case,
]


KB_DRAFT_CASE = _kb_draft_case
