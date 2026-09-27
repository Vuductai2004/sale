"""Governance acceptance specifications: authority, business rules, command center,
NFR/ASM governance, KPI measurement, release gates and Definition of Done.

Owned by GovernanceCases. Exports ``CASES`` (list[dict]) and ``FIXTURES`` (dict).
Source of truth: De_bai_Xay_dung_He_thong_AI_Agent_Marketing_Sales_CSKH_v0.1.md (SRS v0.1)
plus the implement/ blueprint contracts named in ``references``.

All amounts, clocks, thresholds and identifiers in this module are SYNTHETIC TEST
CONFIGURATION. They are not production policies, not approved thresholds and not SLAs.
Policy parameters owned by Business/Finance (ASM-003/ASM-004) and KPI targets (ASM-002)
stay unapproved unless a case explicitly exercises a labelled synthetic lock.
"""
from __future__ import annotations

SRS = "De_bai_Xay_dung_He_thong_AI_Agent_Marketing_Sales_CSKH_v0.1.md"
IMPL07 = "implement/07-human-command-center-ui.md"
IMPL08 = "implement/08-security-governance-nfr.md"
IMPL09 = "implement/09-sprint-roadmap-and-pilots.md"
API06 = "implement/06-api-and-connectors-spec.md"
ANALYTICS = "plans/delivery/analytics.md"

GOV_FX = "fixtures/offline/governance.json"
CUST_FX = "fixtures/offline/customers.json"
CONSENT_FX = "fixtures/offline/consents.json"
CATALOG_FX = "fixtures/offline/catalog.json"
ORDERS_FX = "fixtures/offline/orders.json"
TENANTS_FX = "fixtures/offline/tenants.json"
EVENTS_FX = "fixtures/offline/events.json"
KNOW_FX = "fixtures/offline/knowledge.json"
ENV_EXAMPLE = "fixtures/live/env.example"

AUTH_SUITE = "unit/authority.md"
BR_SUITE = "unit/business-rules.md"
CC_SUITE = "integration/command-center.md"
NFR_SUITE = "governance/nfr.md"
ASM_SUITE = "governance/asm.md"
APPROVAL_SUITE = "governance/approval.md"
KPI_SUITE = "governance/kpi.md"
GATE_SUITE = "governance/gates.md"
DOD_SUITE = "governance/dod.md"

# Frozen synthetic clock used by every governance case (matches PlatformCases fixtures).
CLOCK = "2026-01-15T10:00:00Z"
NS = "gov-"  # run namespace prefix; each case uses NS + case_id + worker id.


def case(
    cid: str,
    title: str,
    suite: str,
    layer: str,
    reqs: list[str],
    facets: list[str],
    basis: str,
    gate: str,
    priority: str,
    risk: str,
    fixtures: list[str],
    pre: list[str],
    inp: dict,
    steps: list[tuple[str, str]],
    asserts: list[str],
    forbid: list[str],
    evid: list[str],
    clean: list[str],
    auto: str,
    prereq: list[str] | None = None,
    env: str = "offline",
    pair: str | None = None,
    refs: list[str] | None = None,
) -> dict:
    """Build one case record. ``steps`` are (action, expected) pairs, in order."""
    rec = {
        "id": cid,
        "title": title,
        "suite": suite,
        "layer": layer,
        "environment": env,
        "priority": priority,
        "gate": gate,
        "requirements": list(reqs),
        "facets": list(facets),
        "basis": basis,
        "references": list(refs) if refs else [SRS, IMPL08],
        "risk": risk,
        "fixtures": list(fixtures),
        "preconditions": list(pre),
        "inputs": dict(inp),
        "steps": [{"action": a, "expected": e} for a, e in steps],
        "assertions": list(asserts),
        "forbidden": list(forbid),
        "evidence": list(evid),
        "cleanup": list(clean),
        "automation": auto,
        "prerequisites": list(prereq) if prereq else [],
    }
    if pair:
        rec["pair"] = pair
    return rec

from pathlib import Path


_FRAGMENT_DIR = Path(__file__).resolve().parent / "governance"


def _load_fragment(name: str) -> None:
    """Execute a governance fragment in this façade's namespace."""
    path = _FRAGMENT_DIR / name
    source = path.read_text(encoding="utf-8")
    exec(compile(source, str(path), "exec"), globals(), globals())


_load_fragment("fixtures.py")

CASES: list[dict] = []


def _add(*records: dict) -> None:
    CASES.extend(records)


for _fragment in (
    "authority.py",
    "business_rules.py",
    "command_center.py",
    "approvals.py",
    "nfr.py",
    "asm.py",
    "kpi.py",
    "gates.py",
):
    _load_fragment(_fragment)
