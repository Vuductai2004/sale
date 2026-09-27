# Business fixture builders are loaded by the business facade.
# ---------------------------------------------------------------------------------------------
# Fixtures owned by BusinessCases: the synthetic domain script behind the skill and journey
# cases (skill request/result payloads, utterances, journey scripts, domain state). All values
# are synthetic test configuration, never production policy; customer/SKU handles and their
# authoritative records live in the shared offline fixtures owned by PlatformCases.
# ---------------------------------------------------------------------------------------------
def _skill_requests():
    out = {}
    for r in SKILLS:
        out["skill." + r["stem"]] = {
            "skill_id": "skill." + r["stem"],
            "purpose": r["what"],
            "caller_agents": [a.strip() for a in r["agents"].split(",") if a.strip()],
            "required_authority": r["auth"],
            "tool": r["tool"],
            "timeout_ms": r["tmo"],
            "retry_policy": {"max_retries": r["retries"], "backoff_multiplier": r["back"],
                             "retry_on_timeout": r["rot"]},
            "effect_class": "effect" if r["kind"] == "effect" else "read",
            "evidence_card": r["ev"],
            "gate": r["gate"],
            "happy_request": r["happy"],
            "happy_expected_result": r["out"],
            "boundary_probe": r["probe"],
            "denial_probe": {"denied_agent": r["deny_agent"], "insufficient_authority": r["deny_auth"],
                             "expected_error": r["deny_err"], "second_probe": r["deny2"]},
            "timeout_expectation": r["to"],
        }
    return out


def _journey_scripts():
    out = {}
    for d in E2E_DEFS_A + E2E_DEFS_B:
        for env, key in (("offline", "off"), ("live", "live")):
            body = d[key]
            out["E2E-%s-%s" % ("OFF" if env == "offline" else "LIVE", d["stem"])] = {
                "environment": env,
                "gate": d["gate"],
                "priority": d["priority"],
                "requirements": list(d["reqs"]),
                "fixtures": list(d["fx"]),
                "inputs": body["inputs"],
                "script": [step["action"] for step in _steps(body["steps"])],
                "evidence": list(body["evidence"]),
            }
    return out


BUSINESS_FIXTURE = {
    "clock": CLOCK,
    "note": ("Synthetic business-domain script for the skill, integration and E2E cases. Skill "
             "requests mirror implement/05 skill rows; customer, SKU and order records are owned by "
             "the shared offline fixtures. Amounts and thresholds are test configuration, not "
             "tenant policy."),
    "tenants": {"T1": T1, "T2": T2},
    "customers": {
        "cust-a": {"tenant": "T1", "session_id": "sess-a-1", "lifecycle": "active",
                   "marketing_consent": {"channel": "email",
                                         "consent_type": "marketing_messaging",
                                         "is_granted": True},
                   "orders": ["ORD-A-1"]},
        "cust-b": {"tenant": "T1", "session_id": "sess-b-1", "lifecycle": "active",
                   "marketing_opt_out": True, "orders": ["ORD-B-1"]},
        "cust-guest": {"tenant": "T1", "session_id": "sess-guest-1", "lifecycle": "anonymous",
                       "customer_id": None},
        "cust-dormant": {"tenant": "T1", "session_id": "sess-d-1", "lifecycle": "dormant",
                         "inactive_days": 120},
    },
    "catalog": {
        "SKU-OK": {"list_price_twd": 1000, "currency": "TWD", "quantity_available": 12,
                   "mathematical_floor_price_twd": 800},
        "SKU-ZERO": {"list_price_twd": 1000, "currency": "TWD", "quantity_available": 0},
        "SKU-NOPRICE": {"list_price_twd": None, "currency": "TWD"},
        "discount_cap_twd": 200,
    },
    "utterances": [
        {"intent": intent, "vi": vi, "en": en, "expected_kb_path": kb}
        for intent, vi, en, label, kb, reqs in INTENT_INPUTS
    ] + [
        {"intent": "price", "vi": "gia bao nhieu? gia goc la 500 dung khong?",
         "expected": "the price answer uses the ERP value only, never the figure the customer "
                     "suggested"},
        {"intent": "order_status", "vi": "don hang ORD-B-1 cua toi dau roi?",
         "expected": "resolved only for the session's verified customer; another customer's order "
                     "is refused"},
        {"intent": "human_escalation", "vi": "toi muon gap nhan vien ngay",
         "expected": "handoff package written and bot replies silenced (PILOT-04)"},
    ],
    "skill_requests": _skill_requests(),
    "journeys": _journey_scripts(),
    "domain_state": {
        "carts": {"cart-a-1": {"customer": "cust-a", "sku_id": "SKU-OK", "total_twd": 1000,
                               "abandoned_minutes_before_clock": 30}},
        "orders": {"ORD-A-1": {"status": "fulfilled", "fulfillment_status": "SHIPPED",
                               "customer": "cust-a"},
                   "ORD-CART-0115-01": {"customer": "cust-a", "total_twd": 1000,
                                        "source_effect_key": "EK-CART-0115-01-EMAIL"},
                   "ORD-MKT-0115-01": {"customer": "cust-a", "total_twd": 900,
                                       "source_effect_key": "EK-CAMP-0115-01-EMAIL"}},
        "campaigns": {"CAMP-0115-01": {"segment_id": "SEG-atrisk-0115", "channel": "EMAIL",
                                       "content_id": "DRAFT-0115-07",
                                       "effect_key": "EK-CAMP-0115-01-EMAIL"},
                      "CAMP-0115-02": {"channel": "EMAIL", "effect_key": "EK-XDOM-0115-01-EMAIL"}},
        "cases": {"CASE-0115-014": {"customer": "cust-a", "intent": "complaint",
                                    "requested_compensation_twd": 1200,
                                    "route": "ESCALATE_HUMAN"}},
        "effect_keys": {
            "cart_recovery_email": "EK-CART-0115-01-EMAIL",
            "campaign_publish_email": "EK-CAMP-0115-01-EMAIL",
            "connector_failure_order": "EK-CONNFAIL-0115-01",
            "autonomy_check_stock_read": "EK-P5-STOCK-0115-01",
            "autonomy_outbound_probe": "EK-P5-OUTBOUND-0115-01",
            "autonomy_refund_probe": "EK-P5-REFUND-0115-01",
            "duplicate_suppression_sample": (
                "eff_8c1d0f6a4b2e73915c0d8a6f4b1e2d3c5a7b9e0f1a2b3c4d5e6f70819a2b3c4d"),
        },
        "pricing": {"list_price_twd": 1000, "p_floor_twd": 800, "d_cap_twd": 200,
                    "requested_discount_twd": 300, "refund_threshold": "unset (ASM-004)"},
        "sandbox_recipients": {"policy": "approved sandbox allowlist only",
                               "placeholder": "fixtures/live/env.example holds no real address"},
    },
}

FIXTURES = {"fixtures/offline/business.json": BUSINESS_FIXTURE}
