"""Internal platform fragment loaded by the platform source façade."""

# Shared constants, helpers and fixtures are defined by the façade before it
# loads this fragment.  Importing them explicitly keeps dependencies visible
# while avoiding a package-relative import cycle under the generator's
# ``tc_sources_platform`` dynamic module name.
from tc_sources_platform import (
    CMD,
    CONN,
    DB,
    ORCH,
    PLAN_API,
    PLAN_ARCH,
    PLAN_FLOW,
    SEC,
    SRS,
    SUITE_ORC,
    T1,
    _case,
    _steps,
)

CASES = [
    # ----------------------------------------------------------------------------------
    # Revenue Orchestrator (integration/sales-care-orchestrator.md)
    # ----------------------------------------------------------------------------------
    _case(
        "INT-FR-ORC-001",
        "Central routing picks the agent, skill, data and approval need for one signal",
        SUITE_ORC,
        "integration",
        "offline",
        "critical",
        "P1",
        "baseline",
        ["FR-ORC-001", "NFR-008", "OBJ-005"],
        ["stage:DECISION", "entity:Decision", "intent:stock"],
        [SRS, ORCH, PLAN_ARCH],
        "A signal reaches the wrong agent or a skill the agent may not use, so work is done without the right "
        "authority, data or approval check.",
        ["fixtures/offline/events.json", "fixtures/offline/platform.json"],
        [
            "Tenant T1 with a stock question for cust-a in namespace orc-route-* at 2026-01-15T10:00:00Z",
            "Routing table and allowed agent set loaded from the platform fixture",
        ],
        {
            "tenant_id": T1,
            "signal": {"signal_id": "evt_a_cart_add_1", "event_type": "cart.add", "source_channel": "web"},
            "utterance": "is the ceramic mug in stock for pickup today?",
            "expected": {"domains": ["sales", "support"], "allowed_agents": "SAL-01|SAL-02|SAL-03|CS-01"},
        },
        _steps(
            (
                "Submit the signal and read the routing decision",
                "the decision names one target agent from the allowed set, the chosen skill, the data sources and whether approval is needed",
            ),
            (
                "Inspect the decision's reason and the data access list",
                "the reason references the observed signal, and the data list contains only tenant-scoped sources the target skill may read",
            ),
            (
                "Force a routing decision that names an agent id outside the allowed set",
                "routing fails closed instead of dispatching to the unknown agent",
            ),
            (
                "Force the routing binding to be absent",
                "the run fails closed with an explicit error and no canned routing decision is produced",
            ),
        ),
        [
            "The routing decision selects exactly one agent from the allowed set and exposes skill, data and approval need",
            "An agent id outside the allowed set is rejected rather than dispatched",
            "A missing routing binding produces a hard failure with no fabricated decision",
        ],
        [
            "Route a signal to an agent that does not exist in the tenant registry",
            "Return a hard-coded routing decision when the model binding is absent",
        ],
        [
            "Routing decision record with target agent, skill, data list and approval flag",
            "Fatal error record for the missing-binding and illegal-agent attempts",
        ],
        [
            "Delete the run-scoped decision and task rows for orc-route-*; keep audit entries",
        ],
        "Drive the real orchestrator with fixture signals and a stubbed cognitive binding; the oracle is the routing "
        "record's contents plus the fail-closed behavior, not the presence of fields.",
    ),
    _case(
        "INT-FR-ORC-002",
        "Abandoned-cart recovery crosses agents under one orchestrator run",
        SUITE_ORC,
        "integration",
        "offline",
        "critical",
        "P2",
        "baseline",
        ["FR-ORC-002", "SAL-04", "BR-004", "TC-E2E-001"],
        ["stage:PLAN", "entity:Workflow", "event:add_to_cart"],
        [SRS, PLAN_FLOW, ORCH],
        "The recovery workflow bypasses policy or consent when several agents collaborate, and a customer who opted "
        "out receives a cart reminder.",
        ["fixtures/offline/events.json", "fixtures/offline/consents.json", "fixtures/offline/catalog.json"],
        [
            "Abandoned cart for cust-a (SKU-OK, cart-a-1) with EMAIL marketing consent granted and no quiet-hours conflict",
            "Orchestrator run orc-cart-* started at 2026-01-15T10:00:00Z with the channel adapter replaced by a test sink",
        ],
        {
            "tenant_id": T1,
            "signal": {"signal_id": "evt_a_cart_add_1", "event_type": "cart.add"},
            "cart": {"cart_id": "cart-a-1", "sku_id": "SKU-OK", "unit_price": 1000},
            "expected_chain": ["CONTEXT", "HYPOTHESIS", "DECISION", "PLAN", "ACTION", "EXECUTION", "EVIDENCE"],
        },
        _steps(
            (
                "Run the abandoned-cart workflow across its agents",
                "the run records the documented stage sequence with one plan containing at least one sales step and one messaging step",
            ),
            (
                "Inspect the recommendation chosen for the cart",
                "the recommendation names SKU-OK with a reason, evidence, eligibility and expected outcome, and never a discontinued SKU",
            ),
            (
                "Inspect the consent and floor-price checks before dispatch",
                "the EMAIL marketing consent for cust-a is verified and the offered price is not below 800 TWD",
            ),
            (
                "Repeat the run for cust-b who opted out of marketing",
                "no message is dispatched for cust-b, the run stops with a suppression outcome and no channel call is made",
            ),
        ),
        [
            "The run executes every stage in order and produces one plan with the sales and messaging steps",
            "Exactly one message is dispatched for cust-a, referencing SKU-OK and a price at or above 800 TWD",
            "For cust-b zero messages are dispatched and a suppression outcome is recorded",
        ],
        [
            "Send any cart-recovery message to a customer without marketing consent",
            "Recommend a discontinued SKU or a price below the authoritative floor",
        ],
        [
            "Run record with per-stage artifacts and the chosen plan",
            "Channel test-sink call log showing one dispatch for cust-a and zero for cust-b",
        ],
        [
            "Delete the run-scoped task, plan and message rows for orc-cart-*; retain the consent and audit records",
        ],
        "Run the real orchestrator over fixture events with the messaging adapter replaced by a recording test sink; the "
        "oracle combines the run artifacts with the sink call log so a silent dispatch cannot pass.",
    ),
    _case(
        "INT-FR-ORC-STAGES",
        "All eleven stages produce their documented artifact in one run",
        SUITE_ORC,
        "integration",
        "offline",
        "critical",
        "P1",
        "baseline",
        ["FR-ORC-001", "FR-ORC-002", "TC-E2E-001", "NFR-002"],
        ["stage:SIGNAL", "stage:LEARNING", "entity:Workflow"],
        [ORCH, PLAN_ARCH, PLAN_FLOW],
        "Stages are skipped or collapsed, so a decision is taken without context or an action is executed without "
        "evidence, and the customer-visible outcome cannot be traced.",
        ["fixtures/offline/events.json", "fixtures/offline/platform.json"],
        [
            "Tenant T1 run orc-stages-* processing one product-inquiry signal for cust-a",
            "All non-cognitive adapters (ERP, vector, messaging) replaced by fixtures; cognitive bindings stubbed deterministically",
        ],
        {
            "tenant_id": T1,
            "signal_id": "evt_a_session_1",
            "utterance": "what is the list price of the ceramic mug?",
            "required_stages": [
                "SIGNAL",
                "CONTEXT",
                "HYPOTHESIS",
                "DECISION",
                "PLAN",
                "ACTION",
                "APPROVAL",
                "EXECUTION",
                "EVIDENCE",
                "OUTCOME",
                "LEARNING",
            ],
        },
        _steps(
            (
                "Run the pipeline once and list the recorded stage transitions",
                "all eleven stage names appear exactly once in the documented order for the single run id",
            ),
            (
                "Inspect the artifact of the CONTEXT, ACTION and EVIDENCE stages",
                "CONTEXT carries the hydrated customer and citations, ACTION carries the deterministic effect key, EVIDENCE carries a chained record",
            ),
            (
                "Inspect the agent run log rows for the run",
                "each executed step has one terminal row carrying the 18 audit fields including authority, approval and execution status",
            ),
            (
                "Attempt to append a second terminal row for the same (skill, step_index)",
                "the write is refused, proving the run log is keyed and append-only",
            ),
        ),
        [
            "The run records the eleven stages in order with one artifact per stage",
            "The ACTION artifact carries a 64 hex character effect key and the EVIDENCE artifact carries previous/chain hashes",
            "Agent run log rows are unique per (tenant, run, skill, step index) and immutable",
        ],
        [
            "Report a stage as completed with no artifact for it",
            "Write a success execution status without a verified receipt",
        ],
        [
            "Stage-by-stage artifact list for the run id",
            "Agent run log rows with the 18 audit fields and the refused duplicate-write error",
        ],
        [
            "Delete the run-scoped task, plan and artifact rows for orc-stages-*; keep the immutable evidence chain",
        ],
        "Execute the real pipeline with deterministic stubs at the cognitive and vendor boundaries; the oracle is the "
        "artifact per stage plus the run-log keying, not a stage-name enumeration.",
    ),
    _case(
        "INT-FR-ORC-NO-A2A",
        "Agents cannot call each other directly; all handoffs go through the orchestrator",
        SUITE_ORC,
        "integration",
        "offline",
        "critical",
        "P1",
        "blueprint",
        ["FR-ORC-001", "FR-ORC-002", "NFR-001", "OBJ-005"],
        ["stage:PLAN", "entity:Agent", "entity:Workflow"],
        [ORCH, PLAN_ARCH, SRS],
        "Two agents call each other directly, so policy, authority and audit checks are bypassed and the run becomes "
        "untraceable.",
        ["fixtures/offline/platform.json", "fixtures/offline/events.json"],
        [
            "Tenant T1 run orc-noa2a-* with a sales need that would benefit from a care follow-up",
            "An instrumented agent runtime that records every outbound call attempt from an agent",
        ],
        {
            "tenant_id": T1,
            "source_agent": "SAL-02",
            "attempted_direct_targets": ["CS-01", "SAL-04"],
            "expected_route": "orchestrator",
        },
        _steps(
            (
                "Run the cross-domain scenario through the orchestrator",
                "every agent invocation is recorded as a planned step issued by the orchestrator, with one run id for the chain",
            ),
            (
                "Attempt a direct agent-to-agent invocation from SAL-02 to CS-01",
                "the attempt is refused as a topology violation, is recorded, and no CS-01 run is created by it",
            ),
            (
                "Attempt a direct invocation to a non-agent endpoint (a raw skill id)",
                "the attempt is refused and no skill execution record is produced outside an orchestrator run",
            ),
            (
                "Read the audit trail for the refused attempts",
                "each refusal is attributable to the calling agent, target and timestamp",
            ),
        ),
        [
            "Zero agent-initiated invocations exist outside orchestrator-issued planned steps",
            "Both direct-call attempts are refused and produce no downstream run or skill execution",
            "Each refusal appears in the audit trail with caller, target and timestamp",
        ],
        [
            "Let an agent message another agent without an orchestrator plan step",
            "Let an agent invoke a skill directly outside a run",
        ],
        [
            "Runtime call log showing orchestrator-only invocation paths",
            "Audit entries for both refused direct-call attempts",
        ],
        [
            "Delete the run-scoped records for orc-noa2a-*; keep the topology-violation audit entries",
        ],
        "Instrument the real agent runtime with a recording channel so a direct call is observable; the oracle is the "
        "invocation log, not a configuration flag.",
    ),
    _case(
        "INT-FR-ORC-ROUTING-CLARIFY",
        "An ambiguous request produces at most one clarifying question before routing",
        SUITE_ORC,
        "integration",
        "offline",
        "high",
        "P2",
        "blueprint",
        ["FR-ORC-001", "FR-CS-002", "NFR-009"],
        ["stage:DECISION", "intent:product_info", "entity:Decision"],
        [ORCH, PLAN_ARCH, SRS],
        "The system keeps asking questions or bounces the customer between agents, so the customer abandons the "
        "conversation.",
        ["fixtures/offline/platform.json", "fixtures/offline/knowledge.json"],
        [
            "Tenant T1 session sess-a-1 with the ambiguous utterance 'how much is the thing I saw?' in namespace orc-clarify-*",
            "Clarification rule configured as at most one question before routing or human handoff",
        ],
        {
            "tenant_id": T1,
            "utterance": "how much is the thing I saw?",
            "allowed_outcomes": ["single_clarifying_question", "human_handoff", "routed_with_reason"],
        },
        _steps(
            (
                "Submit the ambiguous utterance and read the decision",
                "the decision is flagged requires_clarification and the plan contains exactly one send_message step",
            ),
            (
                "Replay ambiguous utterances for three turns without any disambiguating information",
                "the run escalates to human handoff instead of emitting a second or third clarifying question",
            ),
            (
                "Submit a request that becomes unambiguous after one clarification",
                "routing happens with a named agent and a reason, and no further question is asked",
            ),
            (
                "Read the decision audit for the session",
                "the questions asked per run are counted and never exceed one",
            ),
        ),
        [
            "The clarification plan contains exactly one one-step question with the send_message skill",
            "Three consecutive ambiguous turns produce a human handoff rather than a second question",
            "The audited question count per run never exceeds 1",
        ],
        [
            "Ask a second clarifying question in the same run",
            "Route an unresolved ambiguity to a random agent to keep the conversation moving",
        ],
        [
            "Decision records per turn with the clarification flag",
            "Audit count of clarifying questions and the human-handoff record",
        ],
        [
            "Delete the run-scoped decision and message rows for orc-clarify-*; keep audit entries",
        ],
        "Drive the real orchestrator with ambiguous fixture utterances and a counting test sink for outbound questions; "
        "the oracle is the audited question count plus the handoff record.",
    ),
    _case(
        "INT-FR-ORC-APPROVAL-WAIT",
        "An AUTH-4 action pauses the run, creates one pending approval and resumes under the same effect key",
        SUITE_ORC,
        "integration",
        "offline",
        "critical",
        "P1",
        "baseline",
        ["BR-007", "AUTH-4", "FR-ORC-001", "TC-E2E-002"],
        ["stage:APPROVAL", "entity:Approval", "entity:Action"],
        [SRS, ORCH, DB],
        "A high-risk action executes without human sign-off, or the approval is reused for a different action later.",
        ["fixtures/offline/platform.json", "fixtures/offline/consents.json"],
        [
            "Tenant T1 broadcast-campaign skill with required authority AUTH-4 for a campaign of 800 recipients in namespace orc-approval-*",
            "Approval decision submitted by operator op-7 through the approval endpoint",
        ],
        {
            "tenant_id": T1,
            "run_id": "run-orc-approval-1",
            "skill": "skill.mkt.dispatch_campaign",
            "action": {"campaign_id": "cmp_1001", "recipients": 800},
            "effect_key": "eff_8c1d0f6a4b2e73915c0d8a6f4b1e2d3c5a7b9e0f1a2b3c4d5e6f70819a2b3c4d",
        },
        _steps(
            (
                "Draft the campaign action and evaluate the authority verdict",
                "the verdict is AWAITING_HUMAN_APPROVAL, the action row is pending and the task moves to awaiting_human",
            ),
            (
                "List the pending approvals through the approval queue view",
                "exactly one PENDING approval exists for the run, bound to the run id and the effect key; zero campaign messages were dispatched",
            ),
            (
                "Approve through the decision endpoint and observe the resume",
                "the task returns to running, exactly one dispatch happens under the same effect key, and the approval row is APPROVED with operator and timestamp",
            ),
            (
                "Replay the same approval decision (double click or stale console tab)",
                "the replay is refused as not claimable and the dispatch count stays 1",
            ),
        ),
        [
            "Before approval the pending-approval count is exactly 1 and the outbound dispatch count is 0",
            "After approval exactly one dispatch occurs with the original effect key, and the task leaves awaiting_human",
            "The replayed decision is refused and the total dispatch count remains 1",
        ],
        [
            "Execute the AUTH-4 action while the approval is still PENDING",
            "Reuse the approval to authorize a second execution or a different effect key",
        ],
        [
            "Approval queue row (decision, operator, decided_at, bound effect key)",
            "Channel/provider test-sink dispatch count and the refusal entry for the replayed decision",
        ],
        [
            "Retire the run-scoped campaign draft and approval row for orc-approval-*; keep the decision and audit records",
        ],
        "Use the real authority gate, approval claim transaction and durable task store; only the campaign adapter is a "
        "test sink. The oracle is the dispatch count plus the approval row state.",
    ),
    _case(
        "INT-FR-ORC-APPROVAL-EXPIRE",
        "An unanswered approval expires at 72 hours and parks the run for a human",
        SUITE_ORC,
        "integration",
        "offline",
        "high",
        "P1",
        "blueprint",
        ["BR-007", "AUTH-4", "NFR-004"],
        ["stage:APPROVAL", "entity:Approval", "entity:Action"],
        [ORCH, DB, CMD],
        "A forgotten approval leaves a task parked forever, and the risky action fires later with nobody accountable.",
        ["fixtures/offline/platform.json"],
        [
            "Tenant T1 run orc-approval-exp-* paused on an AUTH-4 refund action created at 2026-01-15T10:00:00Z",
            "Sweep executed at 2026-01-18T11:00:00Z, beyond the 72 hour approval TTL",
        ],
        {
            "tenant_id": T1,
            "approval_created_at": "2026-01-15T10:00:00Z",
            "sweep_at": "2026-01-18T11:00:00Z",
            "approval_ttl_hours": 72,
        },
        _steps(
            (
                "Run the expiry sweep for the tenant",
                "the approval row moves from PENDING to EXPIRED with a decided_at timestamp and the pending queue for the run becomes empty",
            ),
            (
                "Read the task state after the sweep",
                "the task remains outside running and is either awaiting_human or stopped, never executed",
            ),
            (
                "Attempt to approve the expired approval",
                "the decision is refused and no dispatch occurs",
            ),
            (
                "Read the exception list raised for the run",
                "one exception item references the expired approval and the run, so a human can resolve it",
            ),
        ),
        [
            "The approval row is EXPIRED with decided_at after the 72 hour TTL, and PENDING count for the run is 0",
            "No dispatch is recorded for the expired action and the task never reports success",
            "Exactly one exception item exists for the expired approval",
        ],
        [
            "Execute an action whose approval expired unanswered",
            "Silently drop the expired approval without an exception item",
        ],
        [
            "Approval row state transition with timestamps",
            "Exception item for the run plus the zero-dispatch evidence",
        ],
        [
            "Delete the run-scoped approval and exception rows for orc-approval-exp-*; keep audit entries",
        ],
        "Freeze the clock past the TTL and run the real sweep job; the oracle is the approval state plus the exception "
        "item and the dispatch count.",
    ),
    _case(
        "INT-FR-ORC-CANCEL",
        "Cancellation and rejection stop the run without dispatching the pending action",
        SUITE_ORC,
        "integration",
        "offline",
        "critical",
        "P1",
        "baseline",
        ["BR-007", "NFR-007", "AUTH-4"],
        ["stage:APPROVAL", "entity:Approval", "kpi:Failed Execution"],
        [ORCH, DB, CMD],
        "An operator cancels a risky action but it is dispatched anyway, so the customer receives an unauthorized "
        "refund or message.",
        ["fixtures/offline/platform.json"],
        [
            "Tenant T1 with two paused AUTH-4 runs (refund and compensation) in namespace orc-cancel-*",
            "Operator op-7 cancels the first run and rejects the second at 2026-01-15T10:20:00Z",
        ],
        {
            "tenant_id": T1,
            "runs": [
                {"run_id": "run-orc-cancel-1", "skill": "skill.care.initiate_return", "decision": "CANCEL"},
                {"run_id": "run-orc-cancel-2", "skill": "skill.care.issue_retention_offer", "decision": "REJECT"},
            ],
        },
        _steps(
            (
                "Cancel the first run and reject the second through the decision endpoint",
                "the first run reaches the stopped state with CANCELLED and the second with REJECTED, both recorded on the approval row",
            ),
            (
                "Observe the pending action and the durable task for both runs",
                "no dispatch occurs for either run and both tasks stay out of running",
            ),
            (
                "Attempt to resume a cancelled run by replaying an approve decision",
                "the replay is refused as not claimable and still no dispatch occurs",
            ),
            (
                "Read the audit trail for both runs",
                "each run records the operator decision, the reason and the terminal state",
            ),
        ),
        [
            "Both runs are terminal (stopped) with decisions CANCELLED and REJECTED respectively and zero dispatches",
            "The replay of an approve decision on a cancelled run is refused",
            "Each terminal decision appears once in the audit trail with operator identity",
        ],
        [
            "Dispatch a cancelled or rejected action",
            "Reopen a terminal run without a new inbound signal",
        ],
        [
            "Approval rows and task states for both runs",
            "Dispatch-count evidence for both runs plus the audit entries of the terminal decisions",
        ],
        [
            "Delete the run-scoped task and approval rows for orc-cancel-*; keep audit entries",
        ],
        "Drive the real approval claim path and durable task store with a recording adapter; the oracle is the dispatch "
        "count and the terminal state pair.",
    ),
    _case(
        "INT-FR-ORC-CONTEXT-STABILITY",
        "A paused run resumes on its checkpointed context and re-verifies safety inputs",
        SUITE_ORC,
        "integration",
        "offline",
        "high",
        "P1",
        "blueprint",
        ["FR-ORC-001", "NFR-004", "NFR-008"],
        ["stage:CONTEXT", "memory:Agent Operational Memory", "entity:Workflow"],
        [ORCH, PLAN_FLOW, DB],
        "A resumed run re-hydrates a different context, so the action approved by a human no longer matches what is "
        "executed.",
        ["fixtures/offline/platform.json", "fixtures/offline/customers.json"],
        [
            "Run orc-resume-* paused at step 2 of 3 with a checkpointed context and an approved action in namespace orc-resume-*",
            "ERP data changed after the pause while consent and authority inputs stayed valid",
        ],
        {
            "tenant_id": T1,
            "run_id": "run-orc-resume-1",
            "checkpointed_context_ref": "ctx_orc_resume_1",
            "resume_from_step": 2,
        },
        _steps(
            (
                "Resume the paused run from its checkpoint",
                "execution continues at step 2 with the checkpointed context identity, and step 1 is not re-executed",
            ),
            (
                "Compare the context used at resume with the checkpoint snapshot",
                "customer identity, session and consent inputs are identical; only refreshed operational reads differ and they are re-verified before use",
            ),
            (
                "Change a safety input (consent withdrawn) between pause and resume, then resume again",
                "the step is blocked at the pre-step re-verification and the run does not dispatch",
            ),
            (
                "Read the audit trail for the run",
                "the pause, the resume and the block each appear with their timestamps and the context reference used",
            ),
        ),
        [
            "Resume continues from step 2 without repeating step 1 or re-deciding the routing",
            "The resumed context references the checkpointed context identity and re-verifies safety inputs before dispatch",
            "Withdrawn consent blocks the resumed dispatch and records the reason",
        ],
        [
            "Re-hydrate a fresh context and silently substitute it for the approved one",
            "Re-execute an already completed step after resume",
        ],
        [
            "Checkpoint context reference and the context hash at pause and at resume",
            "Audit entries for pause, resume and the blocked dispatch",
        ],
        [
            "Delete the run-scoped checkpoint and task rows for orc-resume-*; keep audit entries",
        ],
        "Pause and resume the real durable task with a deterministic clock; safety inputs are mutated through the real "
        "consent service so the block is observable.",
    ),
    _case(
        "INT-FR-ORC-TAKEOVER",
        "Human takeover stops the run immediately and no late dispatch escapes",
        SUITE_ORC,
        "integration",
        "offline",
        "critical",
        "P1",
        "baseline",
        ["NFR-007", "SCR-005", "TC-E2E-001"],
        ["stage:ACTION", "entity:Conversation", "kpi:Human Override Rate"],
        [SRS, ORCH, CMD],
        "An agent keeps messaging a customer after a human operator takes over, so the customer receives conflicting "
        "answers from a bot and a person.",
        ["fixtures/offline/platform.json", "fixtures/offline/events.json"],
        [
            "Three-step plan for sess-a-1 in run orc-takeover-* where step 1 already completed",
            "Operator takeover event delivered between step 1 and step 2 at 2026-01-15T10:05:00Z",
        ],
        {
            "tenant_id": T1,
            "run_id": "run-orc-takeover-1",
            "session_id": "sess-a-1",
            "plan_steps": 3,
            "takeover_at": "2026-01-15T10:05:00Z",
        },
        _steps(
            (
                "Deliver the takeover event and then let the worker attempt step 2",
                "step 2 is never dispatched, the task reaches the stopped state and the takeover lock is present for the session",
            ),
            (
                "Attempt a third dispatch through the messaging adapter with the same run",
                "the dispatch is refused because the takeover check is re-evaluated before every step and retry",
            ),
            (
                "Return the conversation to the agent with a resume event",
                "the takeover lock is released, the conversation returns to auto routing and the stopped run stays terminal",
            ),
            (
                "Send a new inbound signal for the session",
                "a fresh run starts with its own run id and does not resume the stopped run",
            ),
        ),
        [
            "Exactly one step (step 1) was dispatched before the takeover; steps 2 and 3 produced zero dispatches",
            "The takeover lock exists while the operator holds the session and is gone after the resume event",
            "The post-takeover signal produces a new run id distinct from the stopped one",
        ],
        [
            "Dispatch any message while the takeover lock is held",
            "Resurrect the stopped run after the operator returns the conversation to the agent",
        ],
        [
            "Per-step dispatch log for the run with the takeover timestamp marked",
            "Takeover lock presence before and after resume plus the new run id record",
        ],
        [
            "Release the takeover lock and delete the run-scoped rows for orc-takeover-*; keep audit entries",
        ],
        "Drive the real session-control and step engine with a recording messaging adapter; the oracle is the per-step "
        "dispatch log around the takeover timestamp, not a lock-configuration read.",
    ),
    _case(
        "INT-FR-ORC-WORKER-RESTART",
        "A worker crash and restart resumes the run without duplicating the external effect",
        SUITE_ORC,
        "integration",
        "offline",
        "critical",
        "P1",
        "blueprint",
        ["NFR-004", "NFR-003", "BR-005", "BR-006", "TC-E2E-005"],
        ["stage:EXECUTION", "memory:Agent Operational Memory", "kpi:Duplicate Execution"],
        [ORCH, DB, PLAN_API],
        "A restarted worker re-sends a message or re-creates an order, so the customer is charged or contacted twice.",
        ["fixtures/offline/platform.json", "fixtures/offline/events.json"],
        [
            "Run orc-restart-* mid-execution with a reserved effect key when the worker process is killed",
            "Worker restarted at 2026-01-15T10:10:00Z with the same durable task row and a redelivered inbound signal",
        ],
        {
            "tenant_id": T1,
            "run_id": "run-orc-restart-1",
            "request_id": "evt_a_cart_add_1",
            "skill_id": "skill.sales.send_message",
            "step_index": 2,
            "action_revision": 1,
        },
        _steps(
            (
                "Kill the worker after the effect key was reserved but before the receipt was settled, then restart",
                "the durable task row survives with state waiting or running, lease_owner cleared by the stale-lease requeue and the reservation still RESERVED",
            ),
            (
                "Redeliver the identical inbound signal to the restarted worker",
                "the recomputed effect key is byte-identical to the pre-crash key because run_id, retries and timestamps are not inputs",
            ),
            (
                "Let the worker reconcile the reservation with the provider",
                "the reconciliation settles the effect (present or absent) and only an absent effect is re-dispatched, under the same effect key",
            ),
            (
                "Count the external effects recorded by the provider test sink",
                "exactly one external effect exists for the effect key across the crash, the restart and the reconciliation",
            ),
        ),
        [
            "The effect key recomputed after the restart equals the pre-crash key byte for byte",
            "The total external effect count for that key is exactly 1",
            "The task resumes from its checkpoint step without repeating completed steps or incrementing retry_count for a settled effect",
        ],
        [
            "Re-dispatch blindly after the crash instead of reconciling by effect key",
            "Increment retry_count or fabricate a success receipt when the outcome is unproven",
        ],
        [
            "Durable task row before and after the restart (state, current_step, retry_count)",
            "Effect key before/after restart plus the provider test-sink effect count",
        ],
        [
            "Delete the run-scoped task and reservation rows for orc-restart-*; keep the immutable evidence chain",
        ],
        "Kill and restart the real worker process with a persistent local durable store; the oracle is the byte-equal "
        "effect key plus the single external effect in the sink.",
    ),
    _case(
        "INT-FR-ORC-LEASE",
        "A 30 second lease admits one worker and a stale lease is reclaimed",
        SUITE_ORC,
        "integration",
        "offline",
        "critical",
        "P1",
        "blueprint",
        ["NFR-004", "NFR-006", "BR-006"],
        ["stage:EXECUTION", "memory:Agent Operational Memory", "entity:Workflow"],
        [ORCH, DB, PLAN_ARCH],
        "Two workers run the same step concurrently, so the customer receives duplicate messages or two draft orders "
        "reserve the same stock.",
        ["fixtures/offline/platform.json"],
        [
            "Task run-orc-lease-1 in queued state with two workers w-1 and w-2 in namespace orc-lease-*",
            "Worker w-1 acquires the lease and then stops heart-beating for longer than the 30 second TTL",
        ],
        {
            "tenant_id": T1,
            "run_id": "run-orc-lease-1",
            "lease_key": "tenant:11111111-1111-1111-1111-111111111111:task:run-orc-lease-1:lease",
            "lease_ttl_seconds": 30,
            "workers": ["w-1", "w-2"],
        },
        _steps(
            (
                "Let w-1 claim the task while it is queued",
                "w-1 holds the lease, the Redis key exists with a 30 second TTL and the task version increases by 1",
            ),
            (
                "Have w-2 attempt to claim the same task while the lease is alive",
                "the claim returns 0 rows / lock rejection classified as a retryable CONCURRENT_TASK_LOCK and no second step executes",
            ),
            (
                "Stop w-1 heartbeats beyond the TTL and let the sweeper run",
                "the stale task is requeued with lease_owner cleared, and w-2 can then claim it",
            ),
            (
                "Have w-1 try to release the lease after losing it",
                "the release is a no-op because the token no longer matches, and the lease owned by w-2 stays intact",
            ),
        ),
        [
            "During the live lease exactly one worker owns the task and the second claim is refused as CONCURRENT_TASK_LOCK",
            "After TTL expiry the task is requeued with lease_owner NULL and a single new owner emerges",
            "The stale owner's release attempt does not delete the new owner's lease",
        ],
        [
            "Let two workers execute the same step concurrently",
            "Let a stale owner delete another worker's lease",
        ],
        [
            "Lease key value and TTL alongside the task row (lease_owner, lease_expires_at, task_version)",
            "Claim attempt results for w-1 and w-2 with their classifications",
        ],
        [
            "Release the lease and delete the run-scoped task row for orc-lease-*; keep the claim audit entries",
        ],
        "Use a real Redis-compatible store with a shortened synthetic TTL and frozen clock; the oracle is the lease "
        "ownership pair plus the refused claim, not the lease key string alone.",
    ),
    _case(
        "INT-FR-ORC-OPTIMISTIC-CAS",
        "Optimistic task-version checks reject a stale writer instead of overwriting progress",
        SUITE_ORC,
        "integration",
        "offline",
        "high",
        "P1",
        "blueprint",
        ["NFR-004", "NFR-002", "BR-010"],
        ["stage:EXECUTION", "entity:Workflow", "memory:Agent Operational Memory"],
        [ORCH, DB],
        "A slow worker overwrites a newer checkpoint, so completed work is redone or a step disappears from the run.",
        ["fixtures/offline/platform.json"],
        [
            "Task run-orc-cas-1 at task_version 4 with a checkpoint at step 3 in namespace orc-cas-*",
            "Two writers: w-1 holding version 4 and w-2 having already advanced the task to version 5",
        ],
        {
            "tenant_id": T1,
            "run_id": "run-orc-cas-1",
            "stale_writer_version": 4,
            "current_task_version": 5,
            "checkpoint_step": 3,
        },
        _steps(
            (
                "Let w-1 attempt a checkpoint write using its stale version 4",
                "the update matches 0 rows, the write is refused and the stored checkpoint stays at step 3 of version 5",
            ),
            (
                "Let w-1 re-read the task and retry with the current version",
                "the retry succeeds, the version advances to 6 and the checkpoint content reflects the new step",
            ),
            (
                "Attempt a tag-to-state transition (queued to running) with a stale version",
                "the guarded update matches 0 rows and the writer aborts and re-reads instead of forcing the state",
            ),
            (
                "Read the task history for the run",
                "the version sequence is monotonic with no repeated version and no lost checkpoint",
            ),
        ),
        [
            "The stale checkpoint write is refused (0 rows) and the stored checkpoint is unchanged",
            "The retried write advances the version by exactly 1 and stores the new step",
            "The version history is monotonic with no duplicate version values",
        ],
        [
            "Force a stale write to succeed and overwrite a newer checkpoint",
            "Allow a state transition without matching the expected task version",
        ],
        [
            "Task row before/after each write with task_version, current_step and state",
            "Refusal record for the stale write (0 rows matched)",
        ],
        [
            "Delete the run-scoped task and checkpoint rows for orc-cas-*; keep audit entries",
        ],
        "Hit the real durable-task repository concurrently from two writers with a frozen clock; the oracle is the "
        "version sequence and the stored checkpoint, so last-writer-wins implementations fail.",
    ),
    _case(
        "INT-FR-ORC-EVIDENCE-CHAIN",
        "Evidence records chain from genesis and reject modification",
        SUITE_ORC,
        "integration",
        "offline",
        "critical",
        "P1",
        "blueprint",
        ["BR-010", "NFR-002", "NFR-003"],
        ["stage:EVIDENCE", "entity:Evidence", "entity:Execution"],
        [ORCH, DB, SEC],
        "Evidence can be edited or reordered after the fact, so the company cannot prove what was executed or "
        "reconstruct a dispute.",
        ["fixtures/offline/platform.json", "fixtures/offline/orders.json"],
        [
            "Tenant T1 run orc-chain-* with three mutating steps producing three evidence records",
            "HMAC audit secret supplied through the runtime environment outside the repository",
        ],
        {
            "tenant_id": T1,
            "run_id": "run-orc-chain-1",
            "genesis_hash": "0" * 64,
            "steps": [1, 2, 3],
            "tamper_target": "raw_payload",
        },
        _steps(
            (
                "Run the three mutating steps and read the evidence records",
                "record 1 links to the genesis hash, and each later record's previous hash equals the earlier record's chain hash",
            ),
            (
                "Recompute the chain hashes from stored fields",
                "each recomputed hash matches the stored value, and the payload digest matches the canonical payload",
            ),
            (
                "Attempt an UPDATE and a DELETE on an evidence record",
                "both are refused by the append-only guard and the record content and chain stay unchanged",
            ),
            (
                "Attempt to insert a duplicate chain hash for the same tenant",
                "the insert is refused by the uniqueness constraint and the existing chain is untouched",
            ),
        ),
        [
            "The chain links record to record from the genesis value with no gap",
            "Recomputed SHA-256 hashes match the stored chain_hash values for all three records",
            "UPDATE, DELETE and duplicate-hash inserts are all refused with the chain state unchanged",
        ],
        [
            "Write an evidence record with no signature or with a broken chain link",
            "Modify an evidence record to match a later narrative",
        ],
        [
            "Three evidence records with previous hash, chain hash and payload digest",
            "Refusal output for the UPDATE, DELETE and duplicate-hash attempts",
        ],
        [
            "Delete the run-scoped evidence rows for orc-chain-* only if retention policy permits; otherwise report them as non-deletable",
        ],
        "Run the real evidence logger with a test HMAC secret provided by the harness environment; assertions recompute "
        "the hashes rather than trusting stored values.",
    ),
    _case(
        "INT-FR-ORC-UNKNOWN-RECONCILE",
        "A dispatch timeout is recorded as UNKNOWN and reconciled instead of retried blind",
        SUITE_ORC,
        "integration",
        "offline",
        "critical",
        "P1",
        "blueprint",
        ["NFR-004", "NFR-003", "BR-006", "NFR-008", "TC-E2E-008"],
        ["stage:EXECUTION", "entity:Execution", "kpi:Failed Execution"],
        [ORCH, PLAN_API, DB],
        "A timeout after the request was sent is treated as failure, so the action is repeated and the customer "
        "receives the message or the refund twice.",
        ["fixtures/offline/platform.json"],
        [
            "Tenant T1 run orc-unknown-* sending one message where the adapter aborts after receiving the request",
            "Reconciliation run executed at 2026-01-15T10:12:00Z against the provider test sink",
        ],
        {
            "tenant_id": T1,
            "run_id": "run-orc-unknown-1",
            "skill_id": "skill.sales.send_message",
            "effect_key": "eff_8c1d0f6a4b2e73915c0d8a6f4b1e2d3c5a7b9e0f1a2b3c4d5e6f70819a2b3c4d",
            "provider_scenario": "effect_present_after_timeout",
        },
        _steps(
            (
                "Dispatch the mutating step and abort the adapter after the request was received",
                "the audit row records execution_status failed with error code DISPATCH_TIMEOUT and error.outcome UNKNOWN; never success",
            ),
            (
                "Read the reservation and task state",
                "the reservation stays RESERVED and the task is parked in waiting with its checkpoint, not retried",
            ),
            (
                "Run reconciliation for the effect key",
                "the provider reports the effect present, the reservation settles to SUCCEEDED with the stored receipt and the step is not re-dispatched",
            ),
            (
                "Run reconciliation for a second effect key whose effect is confirmed absent",
                "that reservation settles to FAILED and only then is a single re-dispatch allowed under the same effect key",
            ),
        ),
        [
            "The timeout attempt is recorded as failed with error.outcome UNKNOWN and never as success",
            "The reservation is left RESERVED until reconciliation; no dispatch occurs between timeout and reconciliation",
            "The present effect yields exactly one external effect and the absent effect yields exactly one re-dispatch under the same key",
        ],
        [
            "Record the timed-out dispatch as success or as a proven no-op",
            "Retry a mutating dispatch without a reconciliation that proves the effect absent",
        ],
        [
            "Audit row with execution_status and the UNKNOWN error object",
            "Reservation status before/after reconciliation plus the provider test-sink effect count per key",
        ],
        [
            "Delete the run-scoped reservation and task rows for orc-unknown-*; keep the audit and evidence records",
        ],
        "Configure the adapter stub to swallow the response after accepting the request; the oracle couples the audit "
        "vocabulary with the reservation state and the sink effect count.",
    ),
    _case(
        "INT-FR-ORC-FAILCLOSED-BINDING",
        "A missing runtime binding fails closed instead of fabricating a decision",
        SUITE_ORC,
        "integration",
        "offline",
        "critical",
        "P1",
        "blueprint",
        ["NFR-008", "FR-ORC-001", "BR-001", "BR-003"],
        ["stage:HYPOTHESIS", "stage:ACTION", "entity:Decision"],
        [ORCH, SEC, CONN],
        "A degraded model or price source silently yields a canned score or a placeholder SKU, and the customer is "
        "quoted something no system can justify.",
        ["fixtures/offline/platform.json", "fixtures/offline/catalog.json"],
        [
            "Tenant T1 run orc-failclosed-* with the cognitive binding for hypothesis derivation removed",
            "A second variant with the pricing source unavailable while a price would be needed",
        ],
        {
            "tenant_id": T1,
            "scenarios": [
                {"missing": "cognitive_binding", "expect": "fatal_fail_closed"},
                {"missing": "price_source", "expect": "P_FLOOR_UNAVAILABLE"},
                {"skill_unregistered": "skill.sales.unknown_skill", "expect": "fatal_fail_closed"},
            ],
            "product": {"sku_id": "SKU-OK", "floor": 800},
        },
        _steps(
            (
                "Run the pipeline with the hypothesis binding absent",
                "the run fails closed with an explicit error and no hypothesis, score or routing decision is fabricated",
            ),
            (
                "Run the pipeline where a price is required but the authoritative price source is unavailable",
                "the action is refused with P_FLOOR_UNAVAILABLE and no locally derived floor is used",
            ),
            (
                "Submit a skill id that is not registered for the tenant",
                "the run fails closed and no skill execution record is created",
            ),
            (
                "Read the audit trail for the three failures",
                "each failure is recorded with its error code and the run state is failed or stopped, never success",
            ),
        ),
        [
            "Zero fabricated values exist: no score, no routing decision and no price appear in any artifact of the failed runs",
            "The three failures are recorded with their exact error codes and terminal states",
            "No outbound dispatch or order row is created by any failed run",
        ],
        [
            "Return a hard-coded score, routing decision or placeholder SKU when a binding is missing",
            "Derive a price floor locally when the authoritative source is unavailable",
        ],
        [
            "Failure records with error codes and terminal task states",
            "Artifact scan showing no fabricated score/price plus the zero dispatch evidence",
        ],
        [
            "Delete the run-scoped task and artifact rows for orc-failclosed-*; keep the failure audit entries",
        ],
        "Remove one binding at a time in an isolated run namespace and assert on the absence of fabricated artifacts; "
        "the real guard code stays in the path.",
    ),
]