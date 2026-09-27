"""Internal platform fragment loaded by the platform source façade."""

# Shared constants, helpers and fixtures are defined by the façade before it
# loads this fragment.  Importing them explicitly keeps dependencies visible
# while avoiding a package-relative import cycle under the generator's
# ``tc_sources_platform`` dynamic module name.
from tc_sources_platform import (
    CMD,
    DB,
    ORCH,
    PLAN_DATA,
    PLAN_FLOW,
    SKILLS,
    SRS,
    SUITE_CASE,
    T1,
    _case,
    _steps,
)

CASES = [
    # Service case lifecycle (integration/case-fsm.md)
    # ----------------------------------------------------------------------------------
    _case(
        "INT-CASE-NEW-to-CLASSIFIED",
        "A new case is classified with an intent and a priority",
        SUITE_CASE,
        "integration",
        "offline",
        "critical",
        "P1",
        "baseline",
        ["CS-01", "FR-CS-002", "SRS-08"],
        ["entity:Service Case", "intent:shipping", "stage:SIGNAL"],
        [SRS, DB, SKILLS],
        "An inbound request is never classified, so it stays invisible to the queue and breaches first-response "
        "commitments silently.",
        ["fixtures/offline/customers.json", "fixtures/offline/platform.json"],
        [
            "Tenant T1 with a conversation for cust-a carrying the utterance 'my order has not arrived' in namespace cd-case-*",
            "Case created at 2026-01-15T10:00:00Z with priority P3 default",
        ],
        {
            "tenant_id": T1,
            "customer_id": "cust-a",
            "case": {"case_number": "CASE-T1-0001", "state": "NEW", "priority": "P3"},
            "transition": {"event": "classify", "intent": "shipping", "priority": "P2"},
        },
        _steps(
            (
                "Create the case from the inbound utterance and read its initial projection",
                "state is NEW, priority P3, and the case is linked to the conversation and to cust-a",
            ),
            (
                "Apply the classification transition with intent shipping and priority P2",
                "the case reports state CLASSIFIED, intent shipping, priority P2 and a state-change timestamp after creation",
            ),
            (
                "Read the audit trail for the case",
                "exactly one NEW to CLASSIFIED entry exists with the actor, the previous state and the new state",
            ),
            (
                "Re-apply the identical classification event",
                "the case stays CLASSIFIED and the audit gains no second transition for that event identity",
            ),
        ),
        [
            "The case projection reports CLASSIFIED with intent shipping and priority P2",
            "Exactly one audit entry records the NEW to CLASSIFIED transition",
            "The duplicate classification produces zero additional transitions and does not regress the state",
        ],
        [
            "Accept a classification with an intent outside the ten supported intents",
            "Skip NEW and write a case directly in CLASSIFIED with no audit entry",
        ],
        [
            "Case projection before and after classification (state, intent, priority, timestamps)",
            "Audit entries for the case with actor and previous/new state",
        ],
        [
            "Delete the run-scoped case and its conversation link for cd-case-*; keep the append-only audit entries",
        ],
        "Drive the real case-management skill against fixture conversations, freezing the clock so ordering is "
        "deterministic; state the oracle on the projection and the audit count, not on the enum definition.",
    ),
    _case(
        "INT-CASE-CLASSIFIED-to-ASSIGNED",
        "A classified case is assigned to an owner and the queue reflects it",
        SUITE_CASE,
        "integration",
        "offline",
        "high",
        "P1",
        "baseline",
        ["CS-01", "FR-CS-002", "SRS-08"],
        ["entity:Service Case", "entity:Agent", "kpi:First Response Time"],
        [SRS, DB, PLAN_FLOW],
        "A classified case is never owned by anyone, so no operator acts on it and the customer waits indefinitely.",
        ["fixtures/offline/platform.json", "fixtures/offline/customers.json"],
        [
            "A CLASSIFIED shipping case CASE-T1-0002 for cust-a in namespace cd-assign-*",
            "Two candidate owners: agent CS-01 (auto) and operator op-7 (human)",
        ],
        {
            "tenant_id": T1,
            "case_number": "CASE-T1-0002",
            "assignment": {"owner": "CS-01", "queue": "support-shipping", "sla_due_at": "2026-01-15T18:00:00Z"},
        },
        _steps(
            (
                "Assign the classified case to owner CS-01 with an SLA due time",
                "state becomes ASSIGNED, owner is CS-01 and sla_due_at equals the supplied value",
            ),
            (
                "Read the operator queue for tenant T1",
                "the case appears in queue support-shipping exactly once with its priority and SLA due time",
            ),
            (
                "Attempt a second assignment to a different owner without an unassign event",
                "the reassignment is refused or produces an explicit reassignment audit entry, never a silent owner swap",
            ),
            (
                "Attempt to assign a case from tenant T2 to owner CS-01 of tenant T1",
                "the assignment is rejected and no cross-tenant ownership row is created",
            ),
        ),
        [
            "The case reports ASSIGNED with owner CS-01 and the exact SLA due time supplied",
            "The queue contains the case exactly once and the owner field is populated",
            "The cross-tenant assignment attempt leaves both tenants' case tables unchanged",
        ],
        [
            "Leave the case unowned while reporting it as ASSIGNED",
            "Let an owner from another tenant appear on the case",
        ],
        [
            "Case projection after assignment (owner, queue, sla_due_at)",
            "Queue listing entry plus the audit entries for the assignment attempts",
        ],
        [
            "Unassign and delete the run-scoped case for cd-assign-*; keep audit history",
        ],
        "Exercise the real case-management skill with a fixture operator roster; the assertion covers both the case "
        "projection and the queue listing so an unowned case cannot pass.",
    ),
    _case(
        "INT-CASE-ASSIGNED-to-IN_PROGRESS",
        "An assigned case starts work and records the resolution attempt",
        SUITE_CASE,
        "integration",
        "offline",
        "high",
        "P1",
        "baseline",
        ["CS-01", "FR-CS-002", "FR-CS-001"],
        ["entity:Service Case", "intent:order_status", "stage:ACTION"],
        [SRS, DB, SKILLS],
        "Work begins without any recorded attempt, so a later escalation has no history and the customer repeats the "
        "same problem.",
        ["fixtures/offline/orders.json", "fixtures/offline/platform.json"],
        [
            "An ASSIGNED order-status case CASE-T1-0003 for cust-a linked to ORD-A-1 in namespace cd-progress-*",
            "Order lookup available through the stubbed ERP fixture",
        ],
        {
            "tenant_id": T1,
            "case_number": "CASE-T1-0003",
            "transition": {"event": "start_work", "actor": "CS-01"},
            "evidence": {"source": "ORD-A-1", "skill": "skill.care.lookup_order"},
        },
        _steps(
            (
                "Start work on the assigned case",
                "state becomes IN_PROGRESS with a start timestamp and the owner unchanged",
            ),
            (
                "Record the lookup attempt against ORD-A-1 with its source reference",
                "the case links an evidence record that references ORD-A-1 and the skill id used",
            ),
            (
                "Attempt to start work on a case that is still CLASSIFIED",
                "the transition is refused as an invalid state transition and the case state is unchanged",
            ),
            (
                "Read the case timeline",
                "the IN_PROGRESS transition and the evidence link appear once each in chronological order",
            ),
        ),
        [
            "The case reports IN_PROGRESS with exactly one evidence link to ORD-A-1",
            "Starting work from CLASSIFIED is refused with an invalid-transition error",
            "The case timeline shows the transition and the evidence link exactly once each",
        ],
        [
            "Report IN_PROGRESS without any recorded resolution attempt",
            "Overwrite the assigned owner while starting work",
        ],
        [
            "Case projection and evidence link (source reference, skill id)",
            "Invalid-transition audit entry from the CLASSIFIED attempt",
        ],
        [
            "Delete the run-scoped case and evidence link for cd-progress-*; keep the audit entries",
        ],
        "Call the real manage_case skill with the ERP adapter stubbed by fixtures/offline/orders.json; assert on the "
        "evidence linkage rather than on the state string alone.",
    ),
    _case(
        "INT-CASE-IN_PROGRESS-to-WAITING_CUSTOMER",
        "Waiting for the customer pauses the case without losing the SLA",
        SUITE_CASE,
        "integration",
        "offline",
        "high",
        "P1",
        "baseline",
        ["CS-01", "FR-CS-002", "SRS-08"],
        ["entity:Service Case", "intent:return_refund", "kpi:Resolution Time"],
        [SRS, DB, PLAN_FLOW],
        "The case waits forever with no customer-facing follow-up, or the SLA clock keeps running while the ball is "
        "in the customer's court.",
        ["fixtures/offline/platform.json", "fixtures/offline/customers.json"],
        [
            "An IN_PROGRESS return case CASE-T1-0004 for cust-a in namespace cd-wait-*",
            "Outbound follow-up question prepared for the customer",
        ],
        {
            "tenant_id": T1,
            "case_number": "CASE-T1-0004",
            "transition": {"event": "await_customer", "reason": "awaiting_return_photo"},
            "follow_up": {"message_ref": "msg_wait_1", "due_at": "2026-01-17T10:00:00Z"},
        },
        _steps(
            (
                "Move the in-progress case to WAITING_CUSTOMER with a reason",
                "state is WAITING_CUSTOMER and the reason is stored on the case",
            ),
            (
                "Ask the system for the automatic follow-up",
                "exactly one follow-up is scheduled at the due time and the message reference is recorded on the case",
            ),
            (
                "Escalate the waiting case to a human operator",
                "the case is escalated with its waiting state preserved and a new owner recorded, without a state regression",
            ),
            (
                "Compare the SLA fields before and after the wait transition",
                "the SLA due time is unchanged or explicitly extended by policy, never silently cleared",
            ),
        ),
        [
            "The case reports WAITING_CUSTOMER with reason awaiting_return_photo",
            "Exactly one follow-up is scheduled and referenced on the case",
            "sla_due_at is unchanged after the transition or carries an explicit policy extension reason",
        ],
        [
            "Leave WAITING_CUSTOMER without any scheduled follow-up",
            "Clear the SLA due time to hide a breach",
        ],
        [
            "Case projection with state, reason, owner and SLA fields",
            "Scheduled follow-up record plus any extension audit entry",
        ],
        [
            "Cancel the run-scoped follow-up and delete the case for cd-wait-*; retire the message reference only if it was never dispatched",
        ],
        "Run the real manage_case skill with a deterministic scheduler; the oracle combines the case projection with the "
        "scheduled follow-up so a case parked without follow-up fails.",
    ),
    _case(
        "INT-CASE-WAITING_CUSTOMER-to-RESOLVED",
        "The customer answers and the case is resolved with an outcome",
        SUITE_CASE,
        "integration",
        "offline",
        "high",
        "P1",
        "baseline",
        ["CS-01", "FR-CS-002", "FR-CS-003"],
        ["entity:Service Case", "entity:Outcome", "stage:OUTCOME"],
        [SRS, DB, PLAN_FLOW],
        "A case is closed as resolved without a resolution or an outcome, so retention analytics and CSAT are built "
        "on fiction.",
        ["fixtures/offline/orders.json", "fixtures/offline/platform.json"],
        [
            "A WAITING_CUSTOMER case CASE-T1-0005 for cust-a in namespace cd-resolve-*",
            "Inbound customer reply received at 2026-01-16T09:00:00Z",
        ],
        {
            "tenant_id": T1,
            "case_number": "CASE-T1-0005",
            "transition": {"event": "customer_replied", "reply_ref": "msg_reply_1"},
            "resolution": {"code": "refund_approved", "outcome": "ticket_resolved_fcr", "amount_twd": 1000},
        },
        _steps(
            (
                "Ingest the customer reply and re-enter the case",
                "the case leaves WAITING_CUSTOMER and continues from IN_PROGRESS rather than jumping straight to RESOLVED",
            ),
            (
                "Resolve the case with code refund_approved and outcome ticket_resolved_fcr",
                "state becomes RESOLVED with a resolution code, an outcome reference and a resolution timestamp",
            ),
            (
                "Attempt to resolve the same case a second time with a different resolution code",
                "the second resolution is refused and the first resolution remains authoritative",
            ),
            (
                "Read the case-linked outcome and its evidence",
                "the outcome row carries conversion_type ticket_resolved_fcr and references the case and its evidence record",
            ),
        ),
        [
            "The case reports RESOLVED with resolution code refund_approved and a linked outcome row",
            "The reply re-entry passed through IN_PROGRESS instead of skipping states",
            "A second resolution attempt leaves exactly one resolution record on the case",
        ],
        [
            "Mark a case RESOLVED with no resolution code or outcome reference",
            "Overwrite a recorded resolution with a later attempt",
        ],
        [
            "Case projection with resolution code, timestamps and outcome reference",
            "Outcome row with conversion_type and its evidence linkage",
        ],
        [
            "Delete the run-scoped case, resolution and outcome rows for cd-resolve-*; the refund artifact itself is not created offline",
        ],
        "Drive the real case skill with fixture replies; the resolution step is stubbed at the payment boundary only, and "
        "the assertion is on resolution plus outcome linkage, not on the state label.",
    ),
    _case(
        "INT-CASE-RESOLVED-to-CLOSED",
        "A resolved case closes after the confirmation window and stays immutable",
        SUITE_CASE,
        "integration",
        "offline",
        "high",
        "P1",
        "baseline",
        ["CS-01", "NFR-002", "SRS-08"],
        ["entity:Service Case", "kpi:Reopen Rate", "stage:OUTCOME"],
        [SRS, DB, PLAN_FLOW],
        "Cases stay open forever, or a closed case is edited so the audit trail no longer reflects what the customer "
        "was told.",
        ["fixtures/offline/platform.json"],
        [
            "A RESOLVED case CASE-T1-0006 for cust-a resolved at 2026-01-16T09:10:00Z in namespace cd-close-*",
            "54 hours pass with no customer reply before the close transition",
        ],
        {
            "tenant_id": T1,
            "case_number": "CASE-T1-0006",
            "closed_at": "2026-01-18T15:10:00Z",
            "confirmation_window_hours": 48,
        },
        _steps(
            (
                "Close the resolved case after the confirmation window",
                "state becomes CLOSED with a closed_at timestamp after the resolution timestamp",
            ),
            (
                "Attempt to edit the resolution text and the owner of the closed case",
                "the edits are refused and the closed case content is unchanged",
            ),
            (
                "Attempt a reply to the closed case",
                "the reply does not reopen the case implicitly and is routed for explicit reopen handling",
            ),
            (
                "Read the case audit trail after the close",
                "the full transition history is intact, including resolution and close entries with their actors",
            ),
        ),
        [
            "The case reports CLOSED with closed_at later than the resolution timestamp",
            "Post-close edits are refused and the case content hash is unchanged",
            "The audit trail still contains every earlier transition entry",
        ],
        [
            "Modify a closed case's resolution or owner",
            "Delete any case transition entry to make the history look cleaner",
        ],
        [
            "Closed case projection with closed_at and content hash before/after the edit attempts",
            "Refusal audit entries for the post-close edit and reply attempts",
        ],
        [
            "Delete the run-scoped closed case for cd-close-*; retain its immutable audit history for the run window",
        ],
        "Freeze the clock to cross the confirmation window deterministically and run the real case skill; the oracle "
        "includes the content hash so silent edits cannot pass.",
    ),
    _case(
        "INT-CASE-ILLEGAL",
        "CLOSED to CLASSIFIED is refused as an illegal transition",
        SUITE_CASE,
        "integration",
        "offline",
        "critical",
        "P1",
        "baseline",
        ["CS-01", "FR-CS-002", "NFR-002"],
        ["entity:Service Case", "stage:ACTION"],
        [SRS, DB, PLAN_FLOW],
        "A closed case silently reopens into classification, so agents work a stale request and the reported reopen "
        "rate is understated.",
        ["fixtures/offline/platform.json"],
        [
            "A CLOSED case CASE-T1-0007 for cust-a in namespace cd-illegal-*",
            "Transition request sent by agent CS-01 with target state CLASSIFIED",
        ],
        {
            "tenant_id": T1,
            "case_number": "CASE-T1-0007",
            "illegal_transition": {"from": "CLOSED", "to": "CLASSIFIED", "actor": "CS-01"},
        },
        _steps(
            (
                "Request CLOSED to CLASSIFIED without an explicit reopen decision",
                "the transition is refused with an invalid-transition error and the case stays CLOSED",
            ),
            (
                "Request the same illegal transition with an unknown target state",
                "the request is also refused and the case target state vocabulary is unchanged",
            ),
            (
                "Attempt the illegal transition from tenant T2 against the T1 case",
                "the request returns no-row/not-found behavior and the T1 case is untouched",
            ),
            (
                "Read the case audit trail after the attempts",
                "each refused attempt is recorded with its actor and the illegal previous/new state pair, and no state change entry exists",
            ),
        ),
        [
            "The case reports CLOSED after every refusal and its transition history contains no CLOSED to CLASSIFIED entry",
            "Each refusal produces one audit entry naming the illegal transition pair",
            "A cross-tenant attempt returns no-row behavior without leaking the T1 case number",
        ],
        [
            "Silently reopen a closed case through the ordinary classification path",
            "Suppress the refusal audit entry so the illegal attempt is invisible",
        ],
        [
            "Case projection and transition count before/after the refusals",
            "Refusal audit entries with actor and the illegal state pair",
        ],
        [
            "Delete the run-scoped case for cd-illegal-*; keep the refusal audit entries",
        ],
        "Exercise the real state machine directly with illegal transitions; the oracle is the unchanged state plus the "
        "refusal audit trail, not the error message wording.",
    ),
    _case(
        "INT-CASE-REOPEN",
        "A closed case reopens through the explicit reopen branch",
        SUITE_CASE,
        "integration",
        "offline",
        "medium",
        "P1",
        "extension",
        ["CS-01", "FR-CS-002", "FR-CS-003"],
        ["entity:Service Case", "kpi:Reopen Rate", "intent:complaint"],
        [PLAN_DATA, PLAN_FLOW, DB],
        "A dissatisfied customer cannot reopen a closed case, so the complaint is lost and the reopen KPI is wrong. "
        "The blueprint names a REOPENED branch while the SRS lists only the seven minimum states, so the transition "
        "here is proposed configuration.",
        ["fixtures/offline/platform.json", "fixtures/offline/customers.json"],
        [
            "A CLOSED case CASE-T1-0008 for cust-a in namespace cd-reopen-*",
            "Tenant policy publish_case_reopen enabled with a 30 day reopen window",
        ],
        {
            "tenant_id": T1,
            "case_number": "CASE-T1-0008",
            "reopen_event": {"reason": "customer_complaint", "within_days": 12, "actor": "CS-01"},
            "closed_at": "2026-01-04T10:00:00Z",
        },
        _steps(
            (
                "Apply the explicit reopen event inside the policy window",
                "the case enters REOPENED with the previous resolution retained and a reopen timestamp recorded",
            ),
            (
                "Apply an identical reopen event again",
                "no second reopen entry is produced and the case stays REOPENED",
            ),
            (
                "Attempt a reopen 45 days after closure",
                "the reopen is refused by the window policy and the case stays CLOSED",
            ),
            (
                "Read the reopen KPI input for the tenant",
                "the reopened case is counted exactly once in the Reopen Rate numerator for the period",
            ),
        ),
        [
            "The in-window reopen produces state REOPENED with one reopen audit entry and the original resolution preserved",
            "The out-of-window reopen is refused and the case stays CLOSED",
            "The Reopen Rate input counts the case exactly once",
        ],
        [
            "Reopen a closed case while discarding the previous resolution or its evidence",
            "Count the same reopen twice in the KPI input",
        ],
        [
            "Case projection after each reopen attempt with the retained resolution reference",
            "Reopen Rate input rows for the tenant period",
        ],
        [
            "Delete the run-scoped reopen rows for cd-reopen-*; restore the policy flag to its fixture value",
        ],
        "Run the real state machine with the reopen branch enabled by tenant policy; because the SRS fixes only the "
        "minimum states, this case is labelled a proposed configuration and must not be reported as SRS-mandated.",
    ),
    _case(
        "INT-CASE-SKIP-DENIED",
        "Skipping required states is refused while the documented reopen path still works",
        SUITE_CASE,
        "integration",
        "offline",
        "high",
        "P1",
        "blueprint",
        ["CS-01", "FR-CS-002", "SRS-08"],
        ["entity:Service Case", "stage:APPROVAL"],
        [DB, PLAN_DATA, SRS],
        "A case is forced straight to RESOLVED to hit a metric, hiding the fact that no agent ever worked it.",
        ["fixtures/offline/platform.json"],
        [
            "A NEW case CASE-T1-0009 for cust-a in namespace cd-skip-*",
            "Tenant policy allows only the documented forward transitions plus the REOPENED branch",
        ],
        {
            "tenant_id": T1,
            "case_number": "CASE-T1-0009",
            "attempts": [
                {"from": "NEW", "to": "RESOLVED"},
                {"from": "NEW", "to": "CLOSED"},
                {"from": "IN_PROGRESS", "to": "NEW"},
            ],
        },
        _steps(
            (
                "Attempt NEW to RESOLVED and NEW to CLOSED directly",
                "both are refused with an invalid-transition error and the case remains NEW",
            ),
            (
                "Walk the documented forward path one state at a time",
                "each documented transition is accepted in order: CLASSIFIED, ASSIGNED, IN_PROGRESS, WAITING_CUSTOMER, RESOLVED, CLOSED",
            ),
            (
                "Attempt one backward transition (IN_PROGRESS to NEW) on a second case",
                "the backward transition is refused and that case keeps its state",
            ),
            (
                "Read both cases' transition histories",
                "the refused skips appear only as refusal audit entries and the accepted path appears as one entry per step",
            ),
        ),
        [
            "All three skip/backward attempts are refused with no state change",
            "The stepwise path completes all seven states with one audit entry per accepted transition",
            "No case reaches RESOLVED without having passed IN_PROGRESS",
        ],
        [
            "Allow an unconfigured skip so a metric looks better",
            "Permit a backward transition that silently rewrites the earlier history",
        ],
        [
            "Transition history for the case in each attempt with accepted/refused status",
            "Case projection after the full forward path",
        ],
        [
            "Delete the run-scoped cases for cd-skip-*; keep refusal and transition audit entries",
        ],
        "Run the real state machine once with the documented configuration; the case treats the SRS minimum states as the "
        "requirement and reports any additional allowed transition as proposed configuration.",
    ),
    _case(
        "INT-CASE-CONCURRENCY",
        "Two concurrent transitions on one case admit exactly one winner",
        SUITE_CASE,
        "integration",
        "offline",
        "critical",
        "P1",
        "blueprint",
        ["CS-01", "NFR-002", "NFR-006"],
        ["entity:Service Case", "memory:Agent Operational Memory", "stage:ACTION"],
        [DB, ORCH, CMD],
        "Two operators act on the same case simultaneously, so the case ends in an impossible state and one operator's "
        "work silently disappears.",
        ["fixtures/offline/platform.json"],
        [
            "An IN_PROGRESS case CASE-T1-0010 for cust-a in namespace cd-race-*",
            "Two concurrent transition requests issued at 2026-01-15T10:00:00Z by CS-01 (to RESOLVED) and op-7 (to WAITING_CUSTOMER)",
        ],
        {
            "tenant_id": T1,
            "case_number": "CASE-T1-0010",
            "requests": [
                {"actor": "CS-01", "to": "RESOLVED", "resolution_code": "refund_approved"},
                {"actor": "op-7", "to": "WAITING_CUSTOMER", "reason": "awaiting_photo"},
            ],
        },
        _steps(
            (
                "Issue both transitions concurrently against the same case version",
                "exactly one request succeeds and the other is rejected as a stale/concurrent transition",
            ),
            (
                "Read the resulting case state and its version",
                "the case holds exactly one of the two target states and the version advanced by exactly one",
            ),
            (
                "Replay the losing request after the winner committed",
                "the replay is refused against the new version and still does not change the state",
            ),
            (
                "Read the audit trail for the case",
                "one accepted transition entry and at least one refused entry exist, each naming its actor",
            ),
        ),
        [
            "Exactly one of the two concurrent transitions is accepted; the case version increases by exactly 1",
            "The losing request is refused without any partial write (no orphan resolution or reason field)",
            "The audit trail records both the accepted and the refused attempt with actor identity",
        ],
        [
            "Apply both transitions so the case ends with a resolution and a waiting reason at once",
            "Let the losing request overwrite the winner's fields without a version check",
        ],
        [
            "Case state, version and field-level projection after the race",
            "Audit entries for both attempts with accepted/refused status",
        ],
        [
            "Delete the run-scoped case and its audit entries for the run window cd-race-*",
        ],
        "Issue the two requests from two worker threads against the real case service behind the tenant-scoped wrapper; "
        "the version column and the field projection are the oracle, so a last-writer-wins implementation fails.",
    ),
    _case(
        "INT-CASE-SLA-BREACH",
        "SLA breach and priority ordering are observable on the case queue",
        SUITE_CASE,
        "integration",
        "offline",
        "high",
        "P1",
        "blueprint",
        ["CS-01", "NFR-009", "SRS-20"],
        ["entity:Service Case", "kpi:Resolution Time", "kpi:First Response Time"],
        [DB, CMD, PLAN_FLOW],
        "Breached cases are invisible in the queue, so customers with the oldest problems keep waiting while the "
        "dashboard reports a healthy service level.",
        ["fixtures/offline/platform.json"],
        [
            "Tenant T1 with four cases at priorities P1..P4 and sla_due_at 2026-01-15T18:00:00Z in namespace cd-sla-*",
            "Queue read at 2026-01-15T19:30:00Z, after two due times have passed",
        ],
        {
            "tenant_id": T1,
            "cases": [
                {"case_number": "CASE-T1-0011", "priority": "P1", "sla_due_at": "2026-01-15T11:00:00Z"},
                {"case_number": "CASE-T1-0012", "priority": "P4", "sla_due_at": "2026-01-15T18:00:00Z"},
            ],
            "read_at": "2026-01-15T19:30:00Z",
        },
        _steps(
            (
                "Read the case queue ordered by priority and SLA due time",
                "P1 cases precede P4 cases, and within a priority the earliest sla_due_at comes first",
            ),
            (
                "Read the breach flags at the observation timestamp",
                "CASE-T1-0011 is flagged breached with the elapsed overrun and CASE-T1-0012 is not flagged",
            ),
            (
                "Attempt to assign priority P5 to a case",
                "the assignment is refused and the priority vocabulary stays P1..P4",
            ),
            (
                "Read the Resolution Time and First Response Time inputs for the breached case",
                "both inputs are derived from the case timestamps and the breach is reflected rather than hidden",
            ),
        ),
        [
            "The queue ordering matches priority then earliest due time, with the breached P1 case first",
            "Exactly one of the two cases is flagged breached at the observation timestamp",
            "Resolution Time and First Response Time inputs reflect the case timestamps including the breach",
        ],
        [
            "Hide a breached case from the operator queue",
            "Accept a priority outside P1..P4",
        ],
        [
            "Queue listing with priority, sla_due_at and breach flag per case",
            "KPI input rows for the breached case (first response and resolution timings)",
        ],
        [
            "Delete the run-scoped cases for cd-sla-*; keep KPI inputs for the run window only",
        ],
        "Freeze the clock at a point after the due time so breach detection is deterministic; the oracle is the queue "
        "ordering and the breach flag, both read through the real projection.",
    ),
    _case(
        "INT-CASE-EVIDENCE-LINK",
        "A case closure is traceable from trigger to evidence to outcome",
        SUITE_CASE,
        "integration",
        "offline",
        "high",
        "P1",
        "blueprint",
        ["CS-01", "BR-010", "TC-E2E-009"],
        ["entity:Service Case", "entity:Evidence", "entity:Outcome", "stage:EVIDENCE"],
        [DB, ORCH, SRS],
        "A closed case cannot be explained later, so the business cannot prove what the customer was told or whether "
        "the promise was kept.",
        ["fixtures/offline/orders.json", "fixtures/offline/platform.json"],
        [
            "A case for cust-a resolved with refund_approved and linked to ORD-A-1 in namespace cd-trace-*",
            "Traceability query executed for the case at 2026-01-16T12:00:00Z",
        ],
        {
            "tenant_id": T1,
            "case_number": "CASE-T1-0013",
            "expected_chain": [
                "trigger_event",
                "conversation_message",
                "decision",
                "action",
                "evidence",
                "outcome",
            ],
        },
        _steps(
            (
                "Traverse the case traceability chain from the trigger to the outcome",
                "each hop resolves to a concrete record id and the chain is unbroken end to end",
            ),
            (
                "Verify the evidence record backing the resolution",
                "the evidence record carries a provider or system reference and its own identifier, and resolves to ORD-A-1",
            ),
            (
                "Attempt to close a second case without linking any evidence record",
                "the closure is refused because resolution requires evidence for a customer-impacting action",
            ),
            (
                "Compare the traceability chain before and after an attempted evidence edit",
                "the edit is refused and the chain hashes are unchanged",
            ),
        ),
        [
            "The chain resolves every hop from trigger to outcome with concrete record identifiers",
            "Closing a case with no evidence record is refused",
            "Evidence records are immutable: the edit attempt leaves the chain hash unchanged",
        ],
        [
            "Close a customer-impacting case with no evidence record",
            "Rewrite or delete an evidence record after the case closed",
        ],
        [
            "Traceability chain output for CASE-T1-0013 with record identifiers (redacted)",
            "Refusal entry for the evidence-less closure and the chain hash before/after the edit attempt",
        ],
        [
            "Delete the run-scoped case and evidence rows for cd-trace-*; retain the linked audit chain for the run window",
        ],
        "Query the real traceability projection over fixture records; the assertion walks the chain end to end instead "
        "of checking that a field exists.",
    ),
]
