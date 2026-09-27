# Business sales and retention cases are loaded by the business facade.
# ---------------------------------------------------------------------------------------------
# Integration: sales qualification/recommendation, the ten FR-CS-001 intents, FR-CS-003 retention
# ---------------------------------------------------------------------------------------------
INT_SAL_01 = case(
    id="INT-SAL-01", suite="integration/sales-care-orchestrator.md", layer="integration",
    environment="offline", title="SAL-01 qualification returns reason + evidence, never guessed traits",
    priority="high", gate="P2",
    requirements=["SAL-01", "FR-SAL-001", "FR-C360-002", "FR-C360-003", "NFR-005", "MKT-02", "SRS-11"],
    facets=["skill:skill.sales.retrieve_customer", "event:add_to_cart", "event:search",
            "memory:Customer Context", "stage:HYPOTHESIS", "kpi:Qualified Lead Rate"],
    basis="baseline",
    references=[R_SRS, R_SKILL, R_SAL, R_LIFE],
    risk="High-score leads are fabricated (or real ones discarded) because the qualification gives "
         "no verifiable reason/evidence, so Sales works the wrong list.",
    fixtures=[F_BIZ, F_CUS, F_EVT, F_ORD, F_CON],
    preconditions=[
        "run_id=RUN-INT-SAL01-0115, case_id=INT-SAL-01, worker=w-biz-int; mocked API-002 events and "
        "API-001 orders only, no shared session",
        "cust-a has timeline events product_view(01-14T09:00Z) + add_to_cart(01-14T09:20Z) and "
        "ORD-A-1 delivered 2026-01-04; cust-dormant has no event in 60 days",
        "the mock Marketing handoff payload (from segment_audience) is present for cust-a",
    ],
    inputs={
        "tenant_id": T1, "candidate_leads": ["cust-a", "cust-dormant"],
        "handoff_source": "MKT-02 segment SEG-atrisk-0115",
        "behaviour_window_days": 30, "marketing_handoff_score": 0.81,
        "caller_agent": "SAL-01", "granted_authority": "AUTH-1",
        "probe_payload": {"customer_id": "cust-dormant", "caller_asserted_attributes":
                          ["income=high", "has_children=true"]},
    },
    steps=[
        ("Run qualification for both candidates",
         "SAL-01 returns one qualification per candidate, each with reason and evidence; a high "
         "marketing score alone is re-verified by Sales and never accepted as the verdict"),
        ("Inspect the evidence for cust-a",
         "evidence references the verified timeline event ids of the 30-day window plus ORD-A-1; "
         "reason names the observed behaviour (cart add without purchase, last order 11 days ago) "
         "rather than an asserted trait"),
        ("Resolve the insufficient-data candidate",
         "cust-dormant with no recent event is reported as insufficient evidence / not qualified, "
         "with the missing fields listed as unknown; nothing is inferred to fill them"),
        ("Probe inference on caller-asserted attributes",
         "the caller-asserted income/children payload is ignored: no qualification field, segment "
         "label or score changes, and no sensitive attribute is persisted (BR-009, FR-C360-003)"),
        ("Hand off the qualified lead through the orchestrator",
         "the handoff is an orchestrator-bus event carrying reason+evidence; no peer-to-peer call "
         "between MKT-02 and SAL-01 exists in the trace"),
    ],
    assertions=[
        "every qualification record carries a non-empty reason and evidence containing at least one "
        "verified Customer 360 timeline event id from the case window",
        "a qualification with insufficient evidence is explicitly labelled, never upgraded to "
        "qualified by a marketing score or by model confidence alone",
        "no sensitive/inferred personal attribute is written to Customer 360 or used in the "
        "reason/evidence fields (a hypothesis cannot become a customer fact)",
        "the lead-to-opportunity record is traceable to the MKT-02 handoff event id and run_id",
    ],
    forbidden=["qualifying a lead from an unverified attribute or a caller-supplied claim",
               "calling SAL-02/SAL-03 directly from SAL-01 outside the orchestrator"],
    evidence=[
        "qualification cards for cust-a and cust-dormant with reason/evidence and the missing-field "
        "list",
        "Customer 360 diff showing no new FACT rows for the asserted sensitive attributes",
        "orchestrator bus trace of the MKT-02 -> SAL-01 handoff (event id, run_id, policy decision)",
    ],
    cleanup=["drop run RUN-INT-SAL01-0115 leads/opportunities created by the case; keep the "
             "handoff event and qualification evidence rows"],
    automation=SEAM + " MKT-02/SAL-01 reason+evidence is judged by a semantic oracle (does the "
                      "evidence cite the timeline event ids? is the reason behavioural?) rather "
                      "than by wording.",
)

INT_SAL_03 = case(
    id="INT-SAL-03", suite="integration/sales-care-orchestrator.md", layer="integration",
    environment="offline",
    title="SAL-03 recommendations: six modes, 7 fields, eligibility and suppression respected",
    priority="high", gate="P2",
    requirements=["SAL-03", "SAL-02", "SAL-05", "FR-SAL-003", "FR-SAL-002", "BR-004", "BR-001",
                  "NFR-005", "SRS-11"],
    facets=["skill:skill.sales.recommend_product", "skill:skill.sales.check_price",
            "skill:skill.sales.check_stock", "event:purchase", "kpi:Recommendation Conversion",
            "kpi:Upsell Revenue", "kpi:Cross-sell Revenue", "stage:DECISION"],
    basis="baseline", references=[R_SRS, R_SKILL, R_SAL],
    risk="Customers get incomplete or ineligible offers (stale price, out-of-stock item, opt-out "
         "customer), destroying conversion and trust.",
    fixtures=[F_BIZ, F_CAT, F_CUS, F_CON, F_EVT],
    preconditions=[
        "run_id=RUN-INT-SAL03-0115, case_id=INT-SAL-03, worker=w-biz-int; catalog/stock/price "
        "adapters mocked from the fixtures; no shared session",
        "cust-a has cart CART-A-0115-01 with SKU-OK x2 and consent for EMAIL marketing; cust-b is "
        "marketing opt-out; SKU-ZERO has stock 0; SKU-NOPRICE has no ERP price",
    ],
    inputs={
        "tenant_id": T1, "customer_id": "cust-a", "current_cart_skus": ["SKU-OK"],
        "modes": ["PRODUCT_RECOMMENDATION (baseline FR-SAL-003 mode, no dedicated enum value)",
                  "CROSS_SELL", "UPSELL", "SUBSTITUTE", "REPLENISHMENT", "BUNDLE"],
        "recent_purchase_probe": {"customer_id": "cust-a", "last_order_days_ago": 11,
                                  "consumable_cycle_days": 90},
        "suppression_probe": {"customer_id": "cust-b", "channel": "EMAIL"},
        "stock_price_probe": {"sku_id": "SKU-NOPRICE"},
        "caller_agent": "SAL-03", "granted_authority": "AUTH-1",
    },
    steps=[
        ("Generate one recommendation per mode for cust-a",
         "each mode returns the same 7-field shape (customer, product, reason, evidence, "
         "eligibility, confidence, expected_outcome) with mode-appropriate reason/evidence; no mode "
         "returns a partial object and none is presented with a missing field"),
        ("Verify eligibility before presentation",
         "eligibility = {stock_available:true, consent_verified:true, suppression_cleared:true} is "
         "evaluated per candidate; a candidate with stock 0 or a suppression hit is withheld"),
        ("Probe the replenishment suppression rule",
         "cust-a bought SKU-OK 11 days ago inside a 90-day consumable cycle, so the REPLENISHMENT "
         "recommendation is suppressed as 'recently purchased'; the reason states the rule that "
         "fired"),
        ("Probe price/stock freshness",
         "any price in product.price equals the ERP quote for the SKU and any stock claim equals "
         "the inventory read; SKU-NOPRICE yields no recommendation rather than a guess (BR-001, "
         "BR-003)"),
        ("Probe the opt-out customer",
         "for cust-b the consent_verified flag is false and no recommendation is emitted or sent; "
         "no marketing message is queued for an opted-out customer (BR-004)"),
        ("Compare with a downgraded-confidence run",
         "when the best candidate scores below the 0.65 threshold the run refuses explicitly "
         "instead of presenting a low-confidence product"),
    ],
    assertions=[
        "all six modes return the 7 FR-SAL-003 fields, and confidence >= 0.65 plus at least one "
        "verified timeline event id gate every presentation",
        "eligibility is evaluated against real fixture state: SKU-ZERO/SKU-NOPRICE candidates are "
        "withheld, and cust-b (opt-out) receives nothing",
        "a recent purchase suppresses the replenishment recommendation for the same consumable "
        "inside its cycle window",
        "prices and stock levels in every recommendation match the ERP/inventory reads at run "
        "time; no recommendation carries an invented number",
    ],
    forbidden=["presenting or sending a recommendation whose eligibility check failed",
               "attaching recency/consumable rules as facts about the customer instead of as "
               "hypothesis-tagged evidence"],
    evidence=[
        "six recommendation payloads with their evidence/eligibility blocks",
        "withheld-candidate log with the exact rule that suppressed it (stock 0, no price, opt-out, "
        "recent purchase, confidence < 0.65)",
        "ERP/inventory read timestamps used by the recommendations (freshness proof)",
    ],
    cleanup=["drop run RUN-INT-SAL03-0115 recommendations and any queued drafts; keep the "
             "eligibility decision log"],
    automation=SEAM + " Number-level assertions compare against the mocked ERP/inventory reads; the "
                      "reason field is judged semantically (mode-appropriate, evidence-linked).",
)


RETENTION_CASES = [
    case(
        id="INT-FR-CS-003-SIGNALS", suite="integration/sales-care-orchestrator.md",
        layer="integration", environment="offline",
        title="CS-02 detects all seven retention signals with evidence and HYPOTHESIS tagging",
        priority="critical", gate="P3",
        requirements=["CS-02", "FR-CS-003", "FR-C360-003", "FR-C360-002", "SRS-11"],
        facets=["skill:skill.care.analyze_churn_risk", "memory:Learning Memory",
                "stage:HYPOTHESIS", "kpi:Churn", "kpi:Retention", "kpi:Reactivation",
                "kpi:Repeat Purchase"],
        basis="baseline", references=[R_SRS, R_SKILL, R_CS, R_LIFE],
        risk="Retention misses (or invents) at-risk customers because signals are unscored, "
             "unsourced or written back as facts.",
        fixtures=[F_BIZ, F_CUS, F_ORD, F_CON, F_EVT],
        preconditions=[
            "run_id=RUN-INT-FRCS003-SIGNALS-0115, case_id=INT-FR-CS-003-SIGNALS, worker=w-biz-int; "
            "frozen clock %s" % CLOCK,
            "cust-dormant: no event for 61 days, one failed order ORD-D-1(CANCELLED), one complaint "
            "case CASE-D-1, no replenishment, lifecycle dormant",
            "cust-a: active 9 days ago with a consumable SKU-OK purchase at day 0 of a 90-day cycle "
            "(replenishment signal) and a delivered order (win-back candidate for review)",
        ],
        inputs={
            "tenant_id": T1, "customer_ids": ["cust-dormant", "cust-a"],
            "signal_families": ["inactivity", "declining_purchase_frequency", "dissatisfaction",
                                "failed_order", "repeated_complaint", "replenishment_opportunity",
                                "win_back_opportunity"],
            "observation_window_days": 90, "caller_agent": "CS-02",
            "granted_authority": "AUTH-1",
        },
        steps=[
            ("Run signal detection across the seven families",
             "each family produces a signal row carrying the customer, the observed evidence "
             "(event ids, order/case ids, dates) and the family name; a family with no evidence "
             "produces no row rather than a default"),
            ("Inspect the classification of every row",
             "each row is tagged HYPOTHESIS; the Customer 360 FACT store is unchanged by the run "
             "(row-level diff before/after is empty)"),
            ("Resolve the ambiguity probes",
             "a customer with a single late delivery does not raise dissatisfaction; a customer "
             "inside its consumable cycle raises replenishment, and a recently repurchased customer "
             "does not (the rule that fired is named)"),
            ("Probe evidence sufficiency",
             "every emitted signal cites at least one verified timeline event/order/case id from "
             "the window; a probe with the window shortened so evidence falls outside yields no "
             "signal instead of a stale one"),
            ("Hand the signals to the orchestrator",
             "signals are emitted as orchestrator events with run_id and evidence; CS-02 makes no "
             "direct send and performs no peer-to-peer call to SAL-05"),
        ],
        assertions=[
            "all seven FR-CS-003 signal families are detected when their evidence exists, each with "
            "at least one verified evidence reference and no fabricated signal for a customer "
            "without evidence",
            "every signal row is HYPOTHESIS and the FACT store diff is empty (FR-C360-003)",
            "the signals carry the customer, the family, the matched rule and the run_id so a "
            "reviewer can reproduce each detection",
            "no customer message, voucher or order action is produced by this step: signal "
            "detection alone changes no external state",
        ],
        forbidden=["writing a churn/dissatisfaction hypothesis into Customer 360 as a fact",
                   "sending a retention message directly from signal detection"],
        evidence=[
            "signal rows for both customers with evidence ids, family names and matched rules",
            "Customer 360 diff proving no new FACT row (hypothesis separation)",
            "orchestrator event log of the emitted signals with run_id",
        ],
        cleanup=["drop run RUN-INT-FRCS003-SIGNALS-0115 signals and any derived hypotheses; keep "
                 "the audit and the unchanged Customer 360 rows"],
        automation=SEAM + " Signal detection is asserted on evidence-linked rows and store diffs; "
                          "the rule that fired is checked by name, not by wording.",
    ),
    case(
        id="INT-FR-CS-003-WORKFLOW", suite="integration/sales-care-orchestrator.md",
        layer="integration", environment="offline",
        title="FR-CS-003 six-step retention workflow with evidence, budget and Learning Memory",
        priority="critical", gate="P3",
        requirements=["CS-02", "SAL-05", "FR-CS-003", "FR-ORC-002", "BR-007", "NFR-002", "NFR-005",
                      "SRS-11"],
        facets=["skill:skill.care.issue_retention_offer", "skill:skill.care.analyze_churn_risk",
                "memory:Learning Memory", "memory:Agent Operational Memory", "stage:PLAN",
                "stage:APPROVAL", "stage:EXECUTION", "stage:OUTCOME", "kpi:Retention",
                "kpi:Reactivation"],
        basis="baseline", references=[R_SRS, R_SKILL, R_CS, R_FLOW, R_ORC],
        risk="Retention actions run without eligibility, budget or approver, spending money on "
             "customers who must not be contacted.",
        fixtures=[F_BIZ, F_CUS, F_CAT, F_CON], preconditions=[
            "run_id=RUN-INT-FRCS003-WORKFLOW-0115, case_id=INT-FR-CS-003-WORKFLOW, "
            "worker=w-biz-int; frozen clock %s" % CLOCK,
            "cust-dormant has an inactivity+HIGH churn hypothesis and consent for EMAIL marketing; "
            "the tenant retention budget is the synthetic 500 TWD/day with a 30-day per-customer "
            "offer quota of 1",
            "the operator approval inbox (SCR-003) is available and the human decision is scripted "
            "as APPROVE in this case",
        ],
        inputs={
            "tenant_id": T1, "customer_id": "cust-dormant",
            "trigger": "inactivity_61d + failed_order signal (INT-FR-CS-003-SIGNALS)",
            "recommended_action": "personalised win-back voucher on EMAIL",
            "max_discount_value": 120, "effect_key": "EK-RET-WB-0115-01",
            "consent_check": "allowed=true (cust-dormant, EMAIL, marketing)",
            "caller_agent": "CS-02", "granted_authority": "AUTH-3",
        },
        steps=[
            ("Emit the six-step chain from the signal",
             "the run materialises Signal -> Hypothesis -> Recommended Action -> Eligibility Check "
             "-> Execution/Approval -> Outcome in order, each step with its own persisted record "
             "and evidence reference"),
            ("Evaluate eligibility",
             "eligibility resolves consent (allowed=true), suppression (none), the 30-day quota "
             "(available) and the daily budget (500 TWD available); a failed check stops the chain "
             "before any value is issued"),
            ("Execute within authority and, where required, through approval",
             "the in-limit voucher is issued under AUTH-3 by skill.care.issue_retention_offer; a "
             "probe variant above the tenant limit produces an AUTH-4 approval request instead of "
             "an issued voucher (BR-007)"),
            ("Deliver through the correct owner",
             "the customer-facing send is performed by the orchestrator-routed SAL-05/send_message "
             "path with the consent and mutex checks, never by CS-02 directly (CS-02 is a sensor, "
             "SAL-05 executes the reorder/reminder)"),
            ("Record the outcome and write learning",
             "the outcome step stores the observed result (no purchase within the observation "
             "window / converted order) and appends a Learning Memory record; the hypothesis is "
             "never upgraded to a FACT by the outcome"),
        ],
        assertions=[
            "the chain executes the six steps in order, each with a persisted record; skipping the "
            "eligibility step or executing before approval is detectable in the run history",
            "within-limit issuance happens under AUTH-3 and over-limit proposals produce exactly "
            "one AUTH-4 approval request with zero value issued before the decision",
            "the customer-facing message is produced by the authorised outbound path with consent "
            "verified and the effect_key reserved, and the outcome step records whether the "
            "customer actually responded or purchased",
            "a Learning Memory entry is written with the action, the observed outcome and the "
            "run_id, and the Customer 360 hypothesis/FACT separation is preserved",
        ],
        forbidden=["issuing or sending the retention value without the eligibility check and the "
                   "required approval",
                   "recording a retention success (repeat purchase/retention) that no order "
                   "evidence supports"],
        evidence=[
            "the six-step chain records with evidence refs (signal id, hypothesis id, action id, "
            "eligibility verdict, approval id, execution receipt, outcome)",
            "voucher record + outbound message receipt with the effect_key",
            "Learning Memory entry and the outcome measurement window definition",
        ],
        cleanup=["release the voucher reservation if unused, drop run "
                 "RUN-INT-FRCS003-WORKFLOW-0115 artefacts, keep approval/audit rows"],
        automation=SEAM + " The operator decision is scripted through the approval gate API (not a "
                          "mock of the gate itself); outcome measurement uses the frozen clock and "
                          "a condition wait instead of a sleep.",
    ),
    case(
        id="INT-FR-CS-003-SUPPRESSION", suite="integration/sales-care-orchestrator.md",
        layer="integration", environment="offline",
        title="FR-CS-003 suppressions: consent, quota, budget and stale signal block the offer",
        priority="critical", gate="P3",
        requirements=["CS-02", "SAL-05", "FR-CS-003", "BR-004", "BR-006", "BR-002", "TC-E2E-007",
                      "NFR-008", "SRS-11"],
        facets=["skill:skill.care.issue_retention_offer", "intent:human_escalation",
                "kpi:Policy Violation Rate", "stage:DECISION", "channel:EMAIL"],
        basis="baseline", references=[R_SRS, R_SKILL, R_CS, R_MKT],
        risk="An opted-out, over-quota or over-budget customer receives retention outreach, which "
             "is both a policy breach and wasted spend.",
        fixtures=[F_BIZ, F_CUS, F_CON],
        preconditions=[
            "run_id=RUN-INT-FRCS003-SUPPRESSION-0115, case_id=INT-FR-CS-003-SUPPRESSION, "
            "worker=w-biz-int; four independent sub-runs with separate namespaces",
            "cust-b is marketing opt-out on every channel; cust-a already received one retention "
            "offer 3 days ago (quota consumed); the tenant daily retention budget is fully spent in "
            "sub-run 3",
        ],
        inputs={
            "tenant_id": T1,
            "sub_runs": [
                {"customer_id": "cust-b", "channel": "EMAIL", "expected": "suppressed: BR-004 "
                 "opt-out"},
                {"customer_id": "cust-a", "channel": "EMAIL", "expected":
                 "suppressed: 30-day quota already consumed, second voucher_code absent"},
                {"customer_id": "cust-dormant", "channel": "SMS", "max_discount_value": 120,
                 "expected": "suppressed: no SMS consent for marketing"},
                {"customer_id": "cust-dormant", "channel": "EMAIL", "max_discount_value": 200,
                 "expected": "refused: P_FLOOR_BREACH / budget exhausted, no value issued"},
            ],
            "caller_agent": "CS-02", "granted_authority": "AUTH-3",
        },
        steps=[
            ("Run the opt-out sub-run",
             "check_consent returns allowed=false for cust-b; the offer skill is refused before "
             "any voucher exists and no message is queued"),
            ("Run the quota sub-run",
             "the 30-day per-customer quota consumes exactly once: a second issue attempt returns "
             "RETENTION_QUOTA_EXCEEDED and the previously issued voucher_code is unchanged"),
            ("Run the channel/marketing-consent sub-run",
             "a transactional-only or absent consent for SMS blocks the marketing offer; the "
             "system does not silently fall back to another channel to bypass consent"),
            ("Run the budget/floor sub-run",
             "the offer would breach the floor price or the daily budget, so it is refused (or "
             "routed to approval) with no value issued and no promise made in chat"),
            ("Confirm the orchestrator enforces the same rules",
             "each suppression is recorded as an eligibility decision on the run with the rule name, "
             "and no direct CS-02 send bypasses the outbound skill"),
        ],
        assertions=[
            "all four sub-runs end with zero customer-visible messages and zero issued vouchers, "
            "each with a distinct, correctly named suppression/refusal reason",
            "the only sub-run with prior quota consumption keeps its original voucher_code and "
            "issue timestamp: no second code is minted",
            "no channel fallback happens around a consent refusal (BR-004), and no stale cached "
            "signal is used to justify outreach after consent changed",
            "each suppression is durably audited with customer, rule and run_id so the decision can "
            "be defended later",
        ],
        forbidden=["sending retention outreach to an opted-out or over-quota customer",
                   "issuing a voucher after any eligibility check returned false, or retrying the "
                   "suppressed send on another channel"],
        evidence=[
            "four eligibility decision records with rule names and the checked consent rows",
            "provider/connector call log showing zero sends for every suppressed sub-run",
            "voucher store state proving no new voucher_code was created",
        ],
        cleanup=["drop the four sub-run namespaces and any reserved budget holds; keep the "
                 "eligibility and suppression audit rows"],
        automation=SEAM + " Consent/quota/budget come from the fixtures and the reservation store; "
                          "suppression is asserted on connector call counts and voucher rows.",
    ),
    case(
        id="INT-FR-CS-003-OUTCOME", suite="integration/sales-care-orchestrator.md",
        layer="integration", environment="offline",
        title="FR-CS-003 outcome measurement: response, conversion and no-success-without-evidence",
        priority="high", gate="P3",
        requirements=["CS-02", "SAL-05", "FR-CS-003", "SRS-20", "NFR-002", "NFR-005", "MKT-06",
                      "SRS-11"],
        facets=["skill:skill.mkt.evaluate_attribution", "memory:Learning Memory", "stage:OUTCOME",
                "stage:LEARNING", "kpi:Repeat Purchase", "kpi:Retention", "kpi:Churn",
                "kpi:Reactivation"],
        basis="blueprint", references=[R_SRS, R_SKILL, R_CS, R_AN],
        risk="Retention looks successful (or fails silently) because outcomes are recorded without "
             "evidence, so spend compounds on what does not work.",
        fixtures=[F_BIZ, F_CUS, F_ORD, F_EVT],
        preconditions=[
            "run_id=RUN-INT-FRCS003-OUTCOME-0115, case_id=INT-FR-CS-003-OUTCOME, worker=w-biz-int; "
            "frozen clock with an observation window of 30 days",
            "an issued voucher OFF-0115-01 exists for cust-dormant with effect_key "
            "EK-RET-D-0115-01, and a later order is scripted in three variants: converted, "
            "no response, and cancelled/refunded",
        ],
        inputs={
            "tenant_id": T1, "customer_id": "cust-dormant", "offer_id": "OFF-0115-01",
            "observation_window_days": 30,
            "variants": ["purchase within window (ORD-D-0115-02, 900 TWD)",
                         "no purchase, no response",
                         "order placed then cancelled/refunded"],
            "expected_metrics": ["Repeat Purchase", "Retention", "Reactivation", "Churn",
                                 "Customer Lifetime Value"],
            "caller_agent": "CS-02", "granted_authority": "AUTH-1",
        },
        steps=[
            ("Advance the frozen clock to the end of the observation window",
             "the outcome step closes only on the deadline condition, never on a wall-clock sleep"),
            ("Run the converted variant",
             "the outcome records the order id as evidence, increments the conversion/retention "
             "counter once, and writes a Learning Memory entry with the observed uplift"),
            ("Run the no-response variant",
             "the outcome records an explicit 'no response' with the window definition; no "
             "conversion, retention or reactivation counter moves"),
            ("Run the cancelled/refunded variant",
             "the previously counted order is excluded and the retention credit is reversed, "
             "matching the KPI definition (a cancelled order is not retention)"),
            ("Check Learning Memory and the hypothesis boundary",
             "each variant appends a Learning Memory record linked to the offer and run; the "
             "original churn hypothesis stays HYPOTHESIS and is never rewritten as a customer fact"),
        ],
        assertions=[
            "outcome counters move only for evidence-supported results: 1 conversion in variant 1, "
            "0 in variant 2, and a reversal in variant 3",
            "each outcome record cites the order id (or the explicit absence of one) plus the "
            "observation window, so the metric can be recomputed later",
            "a Learning Memory entry exists per variant with the action id and observed result, and "
            "the Customer 360 hypothesis/FACT separation is intact",
            "no retention/CLV figure is emitted for the customer without a reconciled source order "
            "(kpi:Hallucination/Error Rate stays 0 on this path)",
        ],
        forbidden=["counting a cancelled or refunded order as retention success",
                   "reporting a retention outcome before the window closes or without order "
                   "evidence"],
        evidence=[
            "outcome records for the three variants with order ids and window timestamps",
            "KPI counter deltas (Repeat Purchase, Retention, Reactivation, Churn, CLV)",
            "Learning Memory entries with offer id, run id and observed result",
        ],
        cleanup=["drop run RUN-INT-FRCS003-OUTCOME-0115 outcome/learning rows if regenerating; "
                 "keep the audit trail of the measured outcomes"],
        automation=SEAM + " The clock is virtual so the 30-day window closes deterministically; "
                          "outcome counters are read from the analytics store, not from the "
                          "agent's own summary text.",
    ),
]

INT_CASES = [INT_SAL_01, INT_SAL_03] + INTENT_CASES + RETENTION_CASES
