"""Shared generator model types and immutable input constants."""
from __future__ import annotations

import re
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
REPO = HERE.parent
SOURCES = HERE / "sources"
MODULES = ("business", "governance", "platform")
REQUIREMENTS_REL = "sources/requirements.json"
BASELINE_REL = "sources/baseline-ids.json"
GENERATOR_REL = "testcases/_generate.py"
SRS_REL = "De_bai_Xay_dung_He_thong_AI_Agent_Marketing_Sales_CSKH_v0.1.md"

# Handwritten source façades and semantic fragments are generator inputs in stable order.
SOURCE_FRAGMENTS = (
    "sources/business/skills.py",
    "sources/business/sales.py",
    "sources/business/e2e.py",
    "sources/business/fixtures.py",
    "sources/governance/fixtures.py",
    "sources/governance/authority.py",
    "sources/governance/business_rules.py",
    "sources/governance/command_center.py",
    "sources/governance/approvals.py",
    "sources/governance/nfr.py",
    "sources/governance/asm.py",
    "sources/governance/kpi.py",
    "sources/governance/gates.py",
    "sources/platform/knowledge_entities.py",
    "sources/platform/connectors.py",
    "sources/platform/customer_360.py",
    "sources/platform/service_cases.py",
    "sources/platform/orchestrator.py",
)
GENERATOR_FRAGMENTS = (
    "generators/__init__.py",
    "generators/model.py",
    "generators/inputs.py",
    "generators/validation.py",
    "generators/render.py",
    "generators/output.py",
)
SOURCE_INPUTS = (
    tuple(f"testcases/sources/{name}.py" for name in MODULES)
    + tuple(f"testcases/{path}" for path in SOURCE_FRAGMENTS)
    + tuple(f"testcases/{path}" for path in GENERATOR_FRAGMENTS)
)

# Files this generator must never create or overwrite: they are hand-written inputs.
SOURCE_OWNED = (
    "_generate.py",
    REQUIREMENTS_REL,
    BASELINE_REL,
    *(f"sources/{name}.py" for name in MODULES),
    *SOURCE_FRAGMENTS,
    *GENERATOR_FRAGMENTS,
)

LAYER_DIRS = ("unit", "integration", "e2e", "governance")
SUITE_RE = re.compile(r"^(unit|integration|e2e|governance)/[A-Za-z0-9][A-Za-z0-9._/-]*\.md$")
CASE_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
ENVIRONMENTS = ("offline", "live")
PRIORITIES = ("critical", "high", "medium")
GATES = ("P0", "P1", "P2", "P3", "P4", "P5")
BASES = ("baseline", "blueprint", "extension")

MINIMUMS = {"preconditions": 2, "steps": 3, "assertions": 3, "forbidden": 2, "evidence": 2, "cleanup": 1}
E2E_RECOMMENDED_STEPS = 6

# The full case contract; 'pair' is additionally allowed (and mandatory for e2e cases).
REQUIRED_FIELDS = (
    "id",
    "title",
    "suite",
    "layer",
    "environment",
    "priority",
    "gate",
    "basis",
    "requirements",
    "facets",
    "references",
    "risk",
    "fixtures",
    "preconditions",
    "inputs",
    "steps",
    "assertions",
    "forbidden",
    "evidence",
    "cleanup",
    "automation",
    "prerequisites",
)

SCENARIO_DIR = "fixtures/scenarios"
LIVE_ENV_EXAMPLE = "fixtures/live/env.example"
FIXTURES_GUIDE = "fixtures/README.md"
LIVE_FIXTURES_GUIDE = "fixtures/live/README.md"

# The nine system acceptance criteria (SRS section 22) and the four independent pilots
# (section 21) must each be represented in BOTH environments, in the inventory and in cases.
E2E_CRITERIA = tuple(f"TC-E2E-{index:03d}" for index in range(1, 10))
PILOT_CRITERIA = tuple(f"PILOT-{index:02d}" for index in range(1, 5))

# Generated platform-level coverage maps (facet families -> covering cases). They are
# derived documents, not case suites: no case may declare a suite under platform/.
PLATFORM_DIR = "platform"
PLATFORM_KNOWLEDGE_DOC = f"{PLATFORM_DIR}/knowledge-memory.md"
PLATFORM_ENTITIES_DOC = f"{PLATFORM_DIR}/entities.md"
PLATFORM_FACET_FAMILIES = ("kb", "memory", "entity")
DERIVED_DOCS = (
    "README.md",
    "TRACEABILITY.md",
    "COVERAGE.md",
    PLATFORM_KNOWLEDGE_DOC,
    PLATFORM_ENTITIES_DOC,
    FIXTURES_GUIDE,
    LIVE_FIXTURES_GUIDE,
    LIVE_ENV_EXAMPLE,
    "manifest.json",
)

# Every generator input is hashed into manifest.json so a review can pin exactly which
# sources produced the documents.
HASHED_INPUTS = (GENERATOR_REL, SRS_REL, "testcases/sources/requirements.json", "testcases/sources/baseline-ids.json")

STATUS_VOCAB = [
    "NOT_RUN",
    "PASS",
    "FAIL",
    "SKIP_ASM_001",
    "SKIP_UNIMPLEMENTED",
    "BLOCKED_PREREQUISITE",
]
DEFAULT_STATUS = "NOT_RUN"

PROTECTED_SUFFIXES = (".local", ".secret", ".key", ".pem", ".env")
PROTECTED_NAMES = ("env.local", "credentials.json", "secrets.json", "results.json")
PROTECTED_PARTS = ("results",)

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})")
PHONE_RE = re.compile(r"\+\d[\d\s().-]{5,}\d")


class GenerateError(Exception):
    """Fatal, non-recoverable condition (missing file, unreadable source module)."""


class Problems:
    """Collected validation findings. Errors block generation; warnings do not."""

    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)

    @property
    def ok(self) -> bool:
        return not self.errors


# --------------------------------------------------------------------------------------
# inventory
# --------------------------------------------------------------------------------------


class Inventory:
    """Requirement IDs, section aliases and mandatory facet tokens from requirements.json."""

    def __init__(self, doc: dict) -> None:
        self.doc = doc
        self.requirements: dict[str, dict] = dict(doc.get("requirements") or {})
        self.aliases: dict[str, dict] = dict(doc.get("aliases") or {})
        self.facets: dict[str, dict] = {}
        for family, spec in (doc.get("facets") or {}).items():
            items = {}
            for item in spec.get("items") or []:
                token = item.get("token")
                if not isinstance(token, str) or not token:
                    raise GenerateError(
                        f"requirements.json: facet family '{family}' has an item without a token"
                    )
                items[token] = item
            self.facets[family] = {
                "description": spec.get("description", ""),
                "srs_section": spec.get("srs_section", ""),
                "mandatory": bool(spec.get("mandatory", True)),
                "items": items,
            }

    def requirement_meta(self, token: str):
        return self.requirements.get(token) or self.aliases.get(token)

    def facet_meta(self, token: str):
        family, sep, value = token.partition(":")
        if not sep:
            return None
        family_spec = self.facets.get(family)
        if family_spec is None:
            return None
        item = family_spec["items"].get(value)
        if item is None:
            return None
        return family, item

    def requirement_tokens(self) -> list:
        return sorted(list(self.requirements) + list(self.aliases))

    def mandatory_facet_tokens(self) -> list:
        tokens = []
        for family in sorted(self.facets):
            spec = self.facets[family]
            if spec["mandatory"]:
                tokens.extend(f"{family}:{value}" for value in sorted(spec["items"]))
        return tokens

    def facet_tokens(self) -> list:
        return sorted(
            f"{family}:{value}" for family, spec in self.facets.items() for value in spec["items"]
        )
