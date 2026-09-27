"""Business-domain acceptance specifications (Marketing / Sales / Customer Care & Retention).

Owner: BusinessCases.  Exports CASES (list[dict]) and FIXTURES (dict) per the shared contract.
Authority for every skill row is implement/05-skill-system-specifications.md (23 skills);
section/ID obligations come from the SRS blueprint; business playbooks come from plans/modules/*.

These are descriptive acceptance specifications, not executable tests. They never assert raw LLM
prose; chat/answer assertions use a semantic oracle (intent label, cited source id, required facts)
instead of exact wording. Vendor adapters are substituted boundaries; the PEP/authority guard,
orchestrator routing, evidence/audit and idempotency logic stay real code under test.
"""

# ---------------------------------------------------------------------------------------------
# Shared, stable identifiers. All amounts/clocks/thresholds here are SYNTHETIC test configuration,
# never production policy. Tenant UUIDs and customer/SKU handles come from the shared fixtures.
# ---------------------------------------------------------------------------------------------
T1 = "11111111-1111-1111-1111-111111111111"
T2 = "22222222-2222-2222-2222-222222222222"
CLOCK = "2026-01-15T10:00:00Z"

F_TEN = "fixtures/offline/tenants.json"
F_CUS = "fixtures/offline/customers.json"
F_CON = "fixtures/offline/consents.json"
F_CAT = "fixtures/offline/catalog.json"
F_ORD = "fixtures/offline/orders.json"
F_EVT = "fixtures/offline/events.json"
F_KB = "fixtures/offline/knowledge.json"
F_BIZ = "fixtures/offline/business.json"
F_LIVE = "fixtures/live/env.example"

R_SRS = "De_bai_Xay_dung_He_thong_AI_Agent_Marketing_Sales_CSKH_v0.1.md"
R_SKILL = "implement/05-skill-system-specifications.md"
R_ORC = "implement/04-core-engine-and-orchestrator.md"
R_DB = "implement/03-database-and-memory-schema.md"
R_API = "implement/06-api-and-connectors-spec.md"
R_GOV = "implement/08-security-governance-nfr.md"
R_PILOT = "implement/09-sprint-roadmap-and-pilots.md"
R_MKT = "plans/modules/marketing.md"
R_SAL = "plans/modules/sales.md"
R_CS = "plans/modules/customer-support.md"
R_LIFE = "plans/customer-lifecycle.md"
R_FLOW = "plans/platform/workflows-and-handoffs.md"
R_ROAD = "plans/delivery/mvp-and-roadmap.md"
R_AN = "plans/delivery/analytics.md"

SEAM = ("Real code under test: skill registry row, authority guard/PEP, input validator, deadline "
        "and retry loop, effect_key reservation + reconciliation, evidence/audit writer. Substituted "
        "boundary: the external adapter (in-memory for offline, approved sandbox for live). Frozen "
        "clock %s; all waits are condition/deadline waits on the engine's virtual clock, never sleep."
        % CLOCK)


def _steps(pairs):
    return [{"action": a, "expected": e} for a, e in pairs]


def case(**kw):
    """Assemble one case record; every mandatory contract key is required here."""
    rec = {
        "id": kw["id"],
        "title": kw["title"],
        "suite": kw["suite"],
        "layer": kw["layer"],
        "environment": kw.get("environment", "offline"),
        "priority": kw.get("priority", "high"),
        "gate": kw["gate"],
        "requirements": kw["requirements"],
        "facets": kw.get("facets", []),
        "basis": kw.get("basis", "blueprint"),
        "references": kw["references"],
        "risk": kw["risk"],
        "fixtures": kw["fixtures"],
        "preconditions": kw["preconditions"],
        "inputs": kw["inputs"],
        "steps": _steps(kw["steps"]),
        "assertions": kw["assertions"],
        "forbidden": kw["forbidden"],
        "evidence": kw["evidence"],
        "cleanup": kw["cleanup"],
        "automation": kw.get("automation", SEAM),
        "prerequisites": kw.get("prerequisites", []),
    }
    if kw.get("pair"):
        rec["pair"] = kw["pair"]
    for key in ("steps", "assertions", "forbidden", "evidence", "cleanup", "preconditions"):
        assert rec[key], "%s: empty %s" % (rec["id"], key)
    assert len(rec["steps"]) >= 3 and len(rec["assertions"]) >= 3
    assert len(rec["forbidden"]) >= 2 and len(rec["evidence"]) >= 2
    return rec


def S(**kw):
    """Skill-contract row (blueprint §4 of implement/05)."""
    row = dict(kw)
    row.setdefault("fx", [F_BIZ, F_TEN])
    row.setdefault("refs", [R_SRS, R_SKILL, R_ORC])
    row.setdefault("prio", "high")
    row.setdefault("mask", [])
    row.setdefault("facets", [])
    return row


from pathlib import Path


_FRAGMENT_DIR = Path(__file__).resolve().parent / "business"


def _load_fragment(name: str) -> None:
    path = _FRAGMENT_DIR / name
    source = path.read_text(encoding="utf-8")
    exec(compile(source, str(path), "exec"), globals(), globals())


for _fragment in ("skills.py", "sales.py", "e2e.py", "fixtures.py"):
    _load_fragment(_fragment)


E2E_CASES = _e2e_pairs(E2E_DEFS_A + E2E_DEFS_B)
CASES = SKILL_CASES + INT_CASES + E2E_CASES
