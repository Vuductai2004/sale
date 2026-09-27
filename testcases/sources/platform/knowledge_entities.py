"""Internal platform fragment loaded by the platform source façade."""

# Shared constants, helpers and fixtures are defined by the façade before it
# loads this fragment.  Importing them explicitly keeps dependencies visible
# while avoiding a package-relative import cycle under the generator's
# ``tc_sources_platform`` dynamic module name.
from tc_sources_platform import (
    CLOCK,
    DB,
    FIXTURES,
    ORCH,
    PLAN_DATA,
    SRS,
    SUITE_UNIT,
    T1,
    T2,
    _case,
    _steps,
)

# --------------------------------------------------------------------------------------
# Fragment builders — Second Brain (UNIT-KB), canonical entities (UNIT-ENT) and the five AI
# memory layers (UNIT-MEM-*).
#
# The tables hold the per-item inputs and oracles; the builders share only the assertion
# skeleton, so every generated case keeps its own query, payload, expected answer and
# forbidden outcome. Nothing here was executed while this file was authored.
# --------------------------------------------------------------------------------------

_KNOWLEDGE = FIXTURES["fixtures/offline/knowledge.json"]
_KB_BY_PATH = {doc["file_path"]: doc for doc in _KNOWLEDGE["documents"]}


def _kb_case(cid, path, question, anchor, trap):
    """One approved Second Brain document: retrieval, citation provenance and refusal."""
    doc = _KB_BY_PATH[path]
    run = "run-t1-kb-%s" % cid.lower()
    return _case(
        cid=cid,
        title="Second Brain %s answers only from its approved chunk and cites path, version and owner" % path,
        suite=SUITE_UNIT,
        layer="unit",
        environment="offline",
        priority="critical" if path.startswith(("/policy/", "/product/")) else "high",
        gate="P0",
        basis="baseline",
        requirements=["SRS-10", "NFR-001"],
        facets=["kb:%s" % path],
        references=[SRS, DB, PLAN_DATA],
        risk="The agent answers without a citable approved chunk, or cites one whose text does not support the claim, "
        "and an invented sentence reaches a customer as company policy.",
        fixtures=["fixtures/offline/knowledge.json"],
        preconditions=[
            "Tenant T1 corpus loaded in %s with the 21 approved documents of fixtures/offline/knowledge.json" % run,
            "The draft, review and superseded entries and the T2 price list stay in the same collection during the query",
        ],
        inputs={
            "tenant_id": T1,
            "query": question,
            "expected_citation": {
                "file_path": path,
                "namespace": doc["namespace"],
                "source_version": doc["source_version"],
                "document_status": "approved",
                "owner": doc["owner"],
            },
            "cited_chunk_must_support": anchor,
            "trap_answer_must_not_appear": trap,
        },
        steps=_steps(
            (
                "Retrieve the answer context for the question with the tenant filter fixed to T1",
                "the top citation is %s at document_status approved and the cited chunk text carries the claim" % path,
            ),
            (
                "Repeat the retrieval while the draft, review, superseded and foreign-tenant entries remain in the collection",
                "no non-approved, superseded or foreign-tenant point enters the returned context",
            ),
            (
                "Read every provenance field of the returned chunk",
                "file_path, namespace, source_version, owner, updated_at, heading and chunk_index are present and match the fixture document",
            ),
            (
                "Re-run the query with a neighbouring question this document does not cover",
                "the agent cites another approved document or explicitly refuses; it never answers from model memory",
            ),
        ),
        assertions=[
            "The resolved citation is %s@%s with document_status approved" % (path, doc["source_version"]),
            "The cited chunk text supports the claim: %s" % anchor,
            "The trap answer never appears because no citation backs it: %s" % trap,
            "Every sentence of the reply is backed by at least one approved-corpus citation",
        ],
        forbidden=[
            "Answering from LLM memory with no citation, or attaching a citation whose chunk does not contain the claim",
            "Citing a draft, review, superseded or foreign-tenant chunk in place of %s" % path,
        ],
        evidence=[
            "Retrieval log of the run: tenant filter, returned point ids, scores and full payload of each point",
            "Answer text with its citation list resolved against the corpus (file_path, source_version, owner)",
        ],
        cleanup=["Delete the run-scoped query, context and answer rows under %s; the seeded corpus stays" % run],
        automation="Call the retrieval API with the fixed tenant and query and assert on the returned citation set, the "
        "provenance fields and the absence of non-approved points; the corpus is a fixture, so the expected document is deterministic.",
    )


# (baseline id, KB path, question, claim the cited chunk must support, trap that must never be answered)
_KB_QUERIES = [
    (
        "UNIT-KB-01",
        "/company/company.md",
        "Who is the legal entity behind the Aurora brand and what are our support hours?",
        "Aurora Commerce Co., Ltd. (synthetic) trading as Aurora, support 09:00-18:00 Asia/Taipei on business days",
        "a legal entity or support window quoted from model memory or from another tenant's handbook",
    ),
    (
        "UNIT-KB-02",
        "/company/positioning.md",
        "How should the Aurora brand be positioned?",
        "an everyday-durable home goods brand for value-conscious urban households",
        "a premium or luxury positioning invented by the model",
    ),
    (
        "UNIT-KB-03",
        "/customer/customer.md",
        "When does a channel handle become a verified customer identity?",
        "a handle is verified only through a gateway-authenticated session or an exact match against an existing verified handle",
        "trusting the client-supplied verification_status or phone number in the request payload",
    ),
    (
        "UNIT-KB-04",
        "/customer/segmentation.md",
        "When is a customer classified dormant?",
        "dormant after 90 consecutive days without a purchase or a meaningful session",
        "the threshold of another segment definition, e.g. 30 or 120 days",
    ),
    (
        "UNIT-KB-05",
        "/product/products.md",
        "What is SKU-OK and may SKU-DEAD be recommended or sold?",
        "SKU-OK is the Aurora Ceramic Mug 350ml and the discontinued SKU-DEAD must not be recommended or sold",
        "recommending or selling the discontinued SKU-DEAD",
    ),
    (
        "UNIT-KB-06",
        "/product/pricing.md",
        "Where does a quotable price come from, and what are the SKU-OK list price and floor?",
        "list price and availability are read live from the ERP and never invented, SKU-OK list price 1000 TWD with an 800 TWD floor",
        "the superseded 950 TWD list price or 500 TWD floor, or a price the model computed itself",
    ),
    (
        "UNIT-KB-07",
        "/product/promotion-policy.md",
        "How deep a discount may an agent draft without human approval?",
        "discounts up to 15 percent may be drafted within bounded authority and anything deeper needs human approval",
        "the review copy's unlimited discounts without approval",
    ),
    (
        "UNIT-KB-08",
        "/brand/voice.md",
        "What tone must outbound copy use?",
        "warm, plain and specific with no superlatives and no pressure tactics",
        "urgency or superlative copy invented by the model",
    ),
    (
        "UNIT-KB-09",
        "/brand/terminology.md",
        "When do we say member and when do we say guest?",
        "member for a registered account, guest for an anonymous visitor, with product names in the official catalogue form",
        "calling an anonymous visitor a member",
    ),
    (
        "UNIT-KB-10",
        "/brand/prohibited-claims.md",
        "Which product claims are prohibited?",
        "never claim medical, curative or safety-guarantee benefits and never claim to be the cheapest",
        "a medical, curative or cheapest-price claim",
    ),
    (
        "UNIT-KB-11",
        "/marketing/playbook.md",
        "What is the campaign workflow order?",
        "Brief, Audience, Content, Review, Approval, Publish, Monitor, Optimize",
        "a workflow that skips Review or Approval",
    ),
    (
        "UNIT-KB-12",
        "/marketing/content-guidelines.md",
        "What are the social copy standards?",
        "social copy stays within 220 characters, states the offer conditions and uses no false scarcity",
        "false scarcity or an unstated offer condition",
    ),
    (
        "UNIT-KB-13",
        "/marketing/campaign-rules.md",
        "When may marketing messages be sent?",
        "only between 09:00 and 21:00 Asia/Taipei and at most two per customer in the window",
        "a send outside the 09:00-21:00 window or beyond the per-customer cap",
    ),
    (
        "UNIT-KB-14",
        "/sales/sales-playbook.md",
        "What must happen before a product is recommended?",
        "ask about the use case first and never quote a price that was not read from the authoritative source",
        "recommending before discovery, or quoting an unread price",
    ),
    (
        "UNIT-KB-15",
        "/sales/qualification.md",
        "What does a lead qualify on, and what must a qualification carry?",
        "qualification on need, timeline, budget and decision authority, with reason and evidence on every result",
        "a qualification verdict with no reason and no evidence",
    ),
    (
        "UNIT-KB-16",
        "/sales/objection-handling.md",
        "How is a competitor objection answered?",
        "acknowledge the concern, restate the verified value and never disparage a competitor brand",
        "disparaging a competitor brand",
    ),
    (
        "UNIT-KB-17",
        "/customer-care/faq.md",
        "What is the standard delivery lead time?",
        "3 to 5 business days after payment confirmation",
        "the draft same-day free-delivery claim",
    ),
    (
        "UNIT-KB-18",
        "/customer-care/support-policy.md",
        "What warranty and refund terms apply?",
        "a 12-month warranty with refunds returned to the original payment method",
        "a lifetime warranty or a store-credit-only refund invented by the model",
    ),
    (
        "UNIT-KB-19",
        "/customer-care/escalation.md",
        "When must a conversation escalate to a human?",
        "escalate on a legal-action threat and on a refund above 2000 TWD",
        "settling a 2500 TWD refund without escalation",
    ),
    (
        "UNIT-KB-20",
        "/policy/authority.md",
        "What are the authority levels and what may run autonomously?",
        "AUTH-0 observe through AUTH-5 prohibited, with autonomous sending limited to FAQ answers, order-status replies and reminders",
        "sending a campaign or granting a discount as an autonomous action",
    ),
    (
        "UNIT-KB-21",
        "/policy/approval.md",
        "What requires mandatory human approval?",
        "campaigns above 500 recipients and discounts deeper than 15 percent",
        "dispatching a 501-recipient campaign without approval",
    ),
]


def _entity_case(ent):
    """One canonical entity: tenant-scoped write, invariant, refused violation, cross-tenant denial."""
    name, key, invariant, violation, consumer, extra = ent
    cid = "UNIT-ENT-" + name.replace(" ", "-")
    run = "run-t1-%s" % cid.lower()
    return _case(
        cid=cid,
        title="Entity %s enforces its tenant-scoped identity, invariant and lifecycle for consumers" % name,
        suite=SUITE_UNIT,
        layer="unit",
        environment="offline",
        priority="critical" if name in ("Consent", "Price", "Order", "Approval", "Execution", "Agent", "Skill") else "high",
        gate="P0",
        basis="baseline",
        requirements=["SRS-14", "NFR-006"] + list(extra),
        facets=["entity:%s" % name],
        references=[SRS, DB, PLAN_DATA],
        risk="A consumer reads or writes %s through a path that crosses the tenant boundary or ignores the invariant, "
        "so a wrong or foreign record becomes the basis of a customer-facing statement." % name,
        fixtures=["fixtures/offline/platform.json", "fixtures/offline/customers.json"],
        preconditions=[
            "Tenant T1 seeded in %s with the fixture record for %s identified by its business key" % (run, name),
            "A tenant T2 record with an equivalent business key exists so cross-tenant reads can be attempted",
        ],
        inputs={
            "tenant_id": T1,
            "foreign_tenant_id": T2,
            "business_key": key,
            "invariant_under_test": invariant,
            "refused_violation": violation,
            "downstream_consumer_read": consumer,
        },
        steps=_steps(
            (
                "Read and re-write the %s record through the tenant-scoped repository/service using the fixture business key" % name,
                "the record round-trips with tenant_id T1, an immutable id and the business key intact",
            ),
            (
                "Exercise the consumer path named for this entity",
                "the consumer observes the invariant: %s" % invariant,
            ),
            (
                "Attempt the refused operation",
                "the write is rejected with an explicit domain error and leaves no partial row, no orphan child and no side effect (%s)" % violation,
            ),
            (
                "Repeat the read with the T2 tenant scope and with a caller lacking authority for this entity",
                "T1 data is not returned, the T2 copy is unchanged and the denial is recorded rather than silently emptied",
            ),
        ),
        assertions=[
            "The persisted record carries tenant_id T1 and unique identity under %s" % key,
            "The consumer path reflects the invariant: %s" % invariant,
            "The refused operation returns an explicit error naming the rule, and the prior state is byte-identical afterwards: %s" % violation,
            "The T2 read returns no T1 row and the T1 read returns no T2 row",
        ],
        forbidden=[
            "Accepting the refused operation, or applying it partially before the error: %s" % violation,
            "Returning, joining or counting another tenant's row on any consumer path of %s" % name,
        ],
        evidence=[
            "Repository read/write responses for both tenants including the business-key and tenant_id fields",
            "Error code and message of the refused operation plus the unchanged row snapshot taken before and after",
        ],
        cleanup=["Delete the run-scoped %s rows and their child rows under %s; keep the fixture and the denial audit entry" % (name, run)],
        automation="Drive the repository/service API with the fixture payloads and assert on the returned projection, the error "
        "code of the violation and the cross-tenant read; the entity contract is enforced at the service boundary, so no DDL introspection is needed.",
    )


# (exact SRS display name, business key, invariant a consumer observes, refused violation, consumer, extra requirements)
_ENTITIES = [
    (
        "Customer",
        "(tenant_id, external_crm_id)",
        "a new customer starts unverified and the tenant-scoped unique key admits exactly one row",
        "a second Customer with the same external_crm_id inside the tenant is rejected, never silently upserted",
        "the C360 profile read returns verification_status unverified and ignores the caller's VERIFIED assertion",
        (),
    ),
    (
        "Customer Identity",
        "(tenant_id, channel_type, channel_identifier)",
        "a handle maps to exactly one customer inside a tenant and only after gateway authentication",
        "two customers claiming the same handle raise an identity conflict instead of being merged",
        "conversation resolution binds the session to cust-a through the authenticated handle wa_id_a",
        ("FR-C360-001",),
    ),
    (
        "Consent",
        "(customer_id, channel, consent_type)",
        "consent is checked at send time and a withdrawal takes effect immediately",
        "a wildcard grant or a withdrawn consent can never authorise a send",
        "send_message is refused for cust-b whose marketing consent is opted out",
        ("BR-004",),
    ),
    (
        "Customer Event",
        "(tenant_id, event_id)",
        "event_id is idempotent per tenant and canonical_event is derived from the granular alias",
        "the same event_id with a different payload is rejected with a conflict instead of being appended twice",
        "the C360 timeline shows one entry for evt_a_cart_add_1 at canonical_event add_to_cart",
        ("API-002",),
    ),
    (
        "Product",
        "(tenant_id, external_product_code)",
        "is_active false products stay readable but are excluded from recommendation and sale paths",
        "the discontinued prod-dead is never recommendable or sellable",
        "catalogue search returns prod-mug and never offers prod-dead as a purchasable product",
        ("API-001",),
    ),
    (
        "SKU",
        "(tenant_id, sku_code)",
        "quantity_available equals quantity_on_hand minus quantity_reserved and never goes below zero",
        "SKU-ZERO with zero available cannot be carted or ordered",
        "stock lookup returns quantity_available 0 with in_stock false and refuses the add",
        ("API-001",),
    ),
    (
        "Price",
        "(tenant_id, sku_id, currency, effective_from)",
        "price rows are ERP-mirrored, provenance-tagged and versioned by effective window",
        "a local write to a mirrored price row and a quote below the 800 TWD floor for SKU-OK are both refused",
        "the quote uses the current window and never the superseded 950 TWD or 500 TWD figures",
        ("BR-001", "BR-003"),
    ),
    (
        "Inventory",
        "(tenant_id, sku_id, warehouse_code)",
        "reservations are atomic against available-to-promise and expire with the draft order TTL",
        "reserving more than the available-to-promise quantity fails closed with no negative ATP",
        "checkout for SKU-ZERO on WH-TPE is refused with an explicit availability error",
        ("BR-003",),
    ),
    (
        "Order",
        "(tenant_id, order_number)",
        "draft orders are not confirmed revenue until the state is paid or fulfilled",
        "ORD-DRAFT-1 never contributes to total_spent and never reports itself as placed",
        "the C360 aggregate counts only paid or fulfilled ORD-A-1 and ORD-B-1",
        ("API-001",),
    ),
    (
        "Invoice",
        "(tenant_id, invoice_number)",
        "an invoice mirrors the ERP document with tax and carrier fields and is never re-issued",
        "a duplicate invoice_number inside the tenant is rejected",
        "the order read exposes invoice AB12345678 for ORD-A-1 with its tax total",
        ("API-001",),
    ),
    (
        "Conversation",
        "(tenant_id, channel, external_thread_id)",
        "state is open, paused_takeover or closed, and one thread key admits one active conversation",
        "a second open conversation for the same thread key is rejected and a paused_takeover conversation receives no automated reply",
        "the console lists exactly one conversation per thread with the takeover flag honoured",
        ("FR-CS-002",),
    ),
    (
        "Lead",
        "(tenant_id, lead_id) with a required qualification reason",
        "every qualification result carries a reason and its evidence",
        "storing a qualification verdict without reason and evidence is rejected",
        "the pipeline read returns the verdict together with its evidence link and the signals behind it",
        ("FR-SAL-001",),
    ),
    (
        "Opportunity",
        "(tenant_id, customer_id, pipeline stage)",
        "stages advance only along the defined pipeline and every advance stores reason and evidence",
        "a backwards or skipped stage jump is refused and the persisted stage is unchanged",
        "forecast reads only the persisted stage and its stored reason",
        (),
    ),
    (
        "Segment",
        "(tenant_id, segment_name, membership version)",
        "membership is computed per tenant from the tenant's own customer population",
        "a segment may not enrol another tenant's customer",
        "audience preview returns T1 customers only with a reproducible membership count",
        ("NFR-006",),
    ),
    (
        "Campaign",
        "(tenant_id, campaign_code)",
        "lifecycle runs draft, scheduled, running, completed and dispatch is gated by consent and send-window rules",
        "a dispatch without a consent check or outside the 09:00-21:00 window is blocked",
        "the campaign detail reports state plus the consent-checked recipient count",
        ("BR-004",),
    ),
    (
        "Offer",
        "(tenant_id, offer_code, price floor)",
        "an offer stays inside the price floor and the bounded discount authority",
        "an offer below the 800 TWD floor or deeper than 15 percent without approval is refused",
        "the quote returns the bounded offer with the policy revision that authorised it",
        ("BR-002",),
    ),
    (
        "Recommendation",
        "(tenant_id, customer_id, sku_id, reason)",
        "a recommendation carries the signals and evidence it was derived from",
        "a recommendation grounded on an unverified handle or on an inactive SKU is refused",
        "the widget renders the recommendation together with its reason and source signals",
        ("FR-SAL-003",),
    ),
    (
        "Service Case",
        "(tenant_id, case_number)",
        "the case FSM moves NEW, CLASSIFIED, ASSIGNED, IN_PROGRESS, WAITING_CUSTOMER, RESOLVED, CLOSED and history is append-only",
        "an illegal or skipped transition is refused and the case stays in its previous state",
        "the case console shows the state history with actor, reason and SLA clock",
        ("FR-CS-002",),
    ),
    (
        "Agent",
        "(tenant_id, code)",
        "assigned authority is one of AUTH-0..AUTH-3 while AUTH-4 is an approval queue and AUTH-5 a deny verdict, neither assignable",
        "granting AUTH-4 or AUTH-5 to an agent record is rejected",
        "routing reads the granted authority and never escalates it from run to run",
        ("NFR-001",),
    ),
    (
        "Skill",
        "(tenant_id, name)",
        "registration persists purpose, input/output, allowed agent, required authority, tool, validation, retry policy, timeout, audit and test cases as queryable fields",
        "a skill registered without a structured retry, audit and test contract is rejected",
        "the runtime reads retry_policy, audit_spec and test_cases from the row before executing the skill",
        ("SRS-11",),
    ),
    (
        "Workflow",
        "(tenant_id, workflow_id, step_index)",
        "durable state survives a worker restart through a single lease per step",
        "two workers may not hold the same workflow step and a re-entered step never executes twice",
        "resume continues from the persisted step index and lease owner",
        ("NFR-004",),
    ),
    (
        "Decision",
        "(tenant_id, decision_id)",
        "a decision stores its reason and the evidence it used",
        "recording a decision without reason and evidence is rejected",
        "the audit view returns decision, reason, evidence and the authority that produced it",
        ("NFR-005",),
    ),
    (
        "Action",
        "(tenant_id, action_id, action_revision)",
        "an action is a prepared outgoing command and dispatch requires a matching approval",
        "an unapproved action never reaches an external provider",
        "the command centre lists the action as pending approval and the executor sees the same revision",
        ("BR-005",),
    ),
    (
        "Approval",
        "(tenant_id, action_id) with a single canonical record",
        "exactly one canonical approval record exists per action and the only decision route is the approval decision endpoint",
        "a second approval record for the same action, or any alternative approval route, is refused",
        "the executor checks the canonical approval record and resumes the task from the recorded decision",
        ("BR-007", "AUTH-4"),
    ),
    (
        "Execution",
        "(tenant_id, execution_id, effect_key)",
        "an execution row is permanent audit evidence of one physical external dispatch",
        "deleting or rewriting an execution record is refused",
        "the audit query returns the dispatch with provider reference, status and timestamp",
        ("NFR-002", "BR-005"),
    ),
    (
        "Evidence",
        "(tenant_id, evidence_id, chain position)",
        "evidence links the grounding fact, signal or hypothesis and is append-only inside a hash chain",
        "rewriting a past evidence row breaks the chain and is refused",
        "C360 separates FACT, SIGNAL and HYPOTHESIS evidence when the profile is rendered",
        ("FR-C360-003", "BR-010"),
    ),
    (
        "Outcome",
        "(tenant_id, outcome_id, reconciliation source)",
        "an outcome is reconciled against the system-of-record numbers before it counts",
        "an outcome disagreeing with the ERP mirror is flagged for reconciliation and never silently accepted",
        "the KPI read returns only reconciled revenue and marks the flagged outcome",
        ("BR-003",),
    ),
    (
        "Learning",
        "(tenant_id, learning_id, provenance)",
        "learning entries record reviewed prompt or weight adjustments with provenance",
        "promoting a raw conversation turn into a durable customer fact or an unreviewed learning entry is refused",
        "the agent run reads the active learning entry together with its provenance",
        ("SRS-16",),
    ),
]


def _memory_case(entry):
    """One AI memory layer: writer, reader, lifetime and the content class it must refuse."""
    cid, name, store, lifetime, allowed, forbidden, extra = entry
    run = "run-t1-%s" % name.lower().replace(" ", "-")
    return _case(
        cid=cid,
        title="Memory layer %s stores only its own content class for its own lifetime and tenant" % name,
        suite=SUITE_UNIT,
        layer="unit",
        environment="offline",
        priority="critical",
        gate="P0",
        basis="baseline",
        requirements=["SRS-16", "NFR-006"] + list(extra),
        facets=["memory:%s" % name],
        references=[SRS, DB, ORCH],
        risk="Layers are conflated, so transient scratchpad or an unreviewed turn survives as organisational knowledge or as a "
        "customer fact, and one customer's data leaks into another's context.",
        fixtures=["fixtures/offline/platform.json", "fixtures/offline/customers.json"],
        preconditions=[
            "Tenant T1 run %s has a live session for cust-a and cust-b with the layer's store reachable" % run,
            "The clock is fixed at %s so lifetimes and expiries are comparable" % CLOCK,
        ],
        inputs={
            "tenant_id": T1,
            "customer_id": "cust-a",
            "store": store,
            "lifetime": lifetime,
            "allowed_content": allowed,
            "refused_content": forbidden,
        },
        steps=_steps(
            (
                "Write the representative content of this layer for cust-a and read it back through the layer's own reader",
                "the reader returns exactly the written content together with the layer's key scope and lifetime",
            ),
            (
                "Read the same key through the reader of each of the other four layers",
                "the other layers return nothing, so a layer is never satisfied from another layer's store",
            ),
            (
                "Attempt to persist the refused content class into this layer",
                "the write is refused and nothing durable is created: %s" % forbidden,
            ),
            (
                "Read the layer content from a second session of another customer and from tenant T2",
                "the content is absent or denied, an empty result never falls back to a shared cache entry",
            ),
        ),
        assertions=[
            "The layer round-trips its allowed content: %s" % allowed,
            "The layer key is tenant- and customer-scoped and its lifetime is %s" % lifetime,
            "The refused content class leaves no durable row, cache entry or fact after the attempt: %s" % forbidden,
            "No other layer and no other tenant or customer observes this layer's content",
        ],
        forbidden=[
            "Promoting this layer's transient content into a durable layer without the review path: %s" % forbidden,
            "Serving another customer's or another tenant's layer entry as a cache hit",
        ],
        evidence=[
            "Reader output per layer for the same key, including the empty results of the other four layers",
            "Attempt log of the refused content class plus a store scan showing nothing durable was written",
        ],
        cleanup=["Delete the run-scoped layer entries under %s while keeping the session audit entries" % run],
        automation="Write and read each layer through its own API with the fixed tenant and clock, then assert on the other layers' "
        "empty reads and on the refused write; no model or provider is contacted.",
    )



# (case id, layer name, store, lifetime, allowed content, refused content, extra requirements)
_MEMORIES = [
    (
        "UNIT-MEM-WORKING",
        "Working Memory",
        "Redis tenant:{tid}:wm:{cid} scratchpad",
        "7200 seconds",
        "the transient task scratchpad of the current conversation turn",
        "a durable customer fact or an approved policy sentence persisted from the scratchpad",
        (),
    ),
    (
        "UNIT-MEM-CUSTOMER",
        "Customer Context",
        "Postgres tenant:{tid}:customer_context:{cid} resolved from the gateway session",
        "the lifetime of the authenticated session that produced it",
        "profile attributes read from the verified identity of the current customer",
        "client-supplied PII accepted as a verified FACT before identity is proven",
        ("FR-C360-001",),
    ),
    (
        "UNIT-MEM-ORG",
        "Organizational Knowledge",
        "Vector second_brain_knowledge approved chunks only",
        "until an approved revision supersedes the chunk",
        "approved Second Brain documents together with their path, version and owner",
        "a draft, review or superseded knowledge entry surfaced as company policy",
        ("BR-010",),
    ),
    (
        "UNIT-MEM-OPS",
        "Agent Operational Memory",
        "Postgres tenant:{tid}:workflow_checkpoint:{workflow_id}:{step_index}",
        "until the workflow run completes or is cancelled",
        "the workflow step checkpoint and the in-flight task state of the run",
        "a customer FACT or a durable knowledge sentence written from operational state",
        ("NFR-004",),
    ),
    (
        "UNIT-MEM-LEARNING",
        "Learning Memory",
        "Postgres tenant:{tid}:learning:{learning_id} with its provenance row",
        "until a review retires the entry",
        "reviewed outcome learning entries carrying their provenance record",
        "a raw conversation transcript promoted to a long-term customer fact without review",
        ("SRS-16",),
    ),
]




KB_CASES = [*(_kb_case(*row) for row in _KB_QUERIES)]
ENTITY_CASES = [*(_entity_case(e) for e in _ENTITIES)]
MEMORY_CASES = [*(_memory_case(m) for m in _MEMORIES)]
