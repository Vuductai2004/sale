"""Validation and coverage bookkeeping for testcase sources."""

from __future__ import annotations

import json
import re
from collections import Counter

from .model import (
    BASELINE_REL,
    BASES,
    CASE_ID_RE,
    E2E_CRITERIA,
    E2E_RECOMMENDED_STEPS,
    EMAIL_RE,
    ENVIRONMENTS,
    GATES,
    Inventory,
    LAYER_DIRS,
    MINIMUMS,
    PHONE_RE,
    PLATFORM_DIR,
    PRIORITIES,
    PROTECTED_NAMES,
    PROTECTED_PARTS,
    PROTECTED_SUFFIXES,
    REQUIRED_FIELDS,
    REPO,
    REQUIREMENTS_REL,
    SUITE_RE,
    PILOT_CRITERIA,
)
# --------------------------------------------------------------------------------------
# validation
# --------------------------------------------------------------------------------------


def is_protected(rel: str) -> bool:
    parts = [part for part in rel.split("/") if part and part != "."]
    if not parts or ".." in parts:
        return True
    lowered = [part.lower() for part in parts]
    if any(part in PROTECTED_PARTS for part in lowered[:-1]):
        return True
    name = lowered[-1]
    if name in PROTECTED_NAMES:
        return True
    return any(name.endswith(suffix) for suffix in PROTECTED_SUFFIXES)


def case_origin(case: dict) -> str:
    module = case.get("_module", "?")
    position = case.get("_position", "?")
    cid = case.get("id")
    if isinstance(cid, str) and cid:
        return f"sources/{module}.py[{position}] id={cid}"
    return f"sources/{module}.py[{position}]"


def string_field(case: dict, key: str, where: str, problems: Problems, minimum: int = 1):
    value = case.get(key)
    if not isinstance(value, str) or len(value.strip()) < minimum:
        problems.error(f"{where}: field '{key}' must be a non-empty string")
        return None
    return value


def list_field(case: dict, key: str, where: str, problems: Problems, minimum: int = 0, item_type=str):
    value = case.get(key)
    if not isinstance(value, list):
        problems.error(f"{where}: field '{key}' must be a list")
        return None
    if any(not isinstance(item, item_type) for item in value):
        problems.error(f"{where}: field '{key}' must contain only {item_type.__name__} values")
        return None
    cleaned = [item.strip() for item in value] if item_type is str else list(value)
    if item_type is str and any(not item for item in cleaned):
        problems.error(f"{where}: field '{key}' must not contain empty strings")
        return None
    if len(cleaned) < minimum:
        problems.error(
            f"{where}: field '{key}' needs at least {minimum} entries, found {len(cleaned)}"
        )
        return None
    return cleaned


def steps_field(case: dict, where: str, problems: Problems):
    raw = case.get("steps")
    if not isinstance(raw, list):
        problems.error(f"{where}: field 'steps' must be a list of {{action, expected}} dicts")
        return None
    steps = []
    for index, step in enumerate(raw, 1):
        if not isinstance(step, dict):
            problems.error(f"{where}: steps[{index}] is not a dict")
            continue
        action = step.get("action")
        expected = step.get("expected")
        if not isinstance(action, str) or not action.strip():
            problems.error(f"{where}: steps[{index}].action must be a non-empty string")
            continue
        if not isinstance(expected, str) or not expected.strip():
            problems.error(f"{where}: steps[{index}].expected must be a non-empty string")
            continue
        extra = sorted(set(step) - {"action", "expected"})
        if extra:
            problems.warn(f"{where}: steps[{index}] has ignored extra keys {extra}")
        steps.append({"action": action.strip(), "expected": expected.strip()})
    if len(steps) < MINIMUMS["steps"]:
        problems.error(
            f"{where}: field 'steps' needs at least {MINIMUMS['steps']} named steps, found {len(steps)}"
        )
        return None
    return steps


def inputs_field(case: dict, where: str, problems: Problems):
    value = case.get("inputs")
    if not isinstance(value, dict) or not value:
        problems.error(f"{where}: field 'inputs' must be a non-empty JSON object")
        return None
    try:
        json.dumps(value)
    except (TypeError, ValueError) as exc:
        problems.error(f"{where}: field 'inputs' is not JSON-serializable: {exc}")
        return None
    return value


def privacy_warnings(case: dict, where: str, problems: Problems) -> None:
    blob = json.dumps(case, ensure_ascii=False, default=str)
    for domain in sorted({match.group(1).lower() for match in EMAIL_RE.finditer(blob)}):
        if not (domain.endswith(".invalid") or domain.endswith(".example")):
            problems.warn(f"{where}: email domain {domain!r} is not a reserved .invalid domain")
    for match in sorted({m.group(0) for m in PHONE_RE.finditer(blob)}):
        problems.warn(
            f"{where}: value {match!r} looks like a phone number; use a synthetic logical handle"
        )


def validate_case(case: dict, problems: Problems, inv: Inventory, fixture_paths: set) -> None:
    where = case_origin(case)

    known = set(REQUIRED_FIELDS) | {"pair"}
    for field in sorted(set(case) - known - {"_module", "_position"}):
        problems.warn(f"{where}: unexpected field {field!r} is not part of the case contract and is ignored")
    for field in REQUIRED_FIELDS:
        if field not in case:
            problems.error(f"{where}: missing required field '{field}'")

    cid = case.get("id")
    if not isinstance(cid, str) or not cid.strip():
        problems.error(f"{where}: field 'id' must be a non-empty string")
    elif cid != cid.strip():
        problems.error(f"{where}: id {cid!r} has leading/trailing whitespace")
    elif not CASE_ID_RE.match(cid):
        problems.error(
            f"{where}: id {cid!r} must match {CASE_ID_RE.pattern} (no spaces, slashes, ':' or '?')"
        )

    string_field(case, "title", where, problems, minimum=3)

    layer = case.get("layer")
    if layer not in LAYER_DIRS:
        problems.error(f"{where}: field 'layer' must be one of {list(LAYER_DIRS)}")
        layer = None

    suite = case.get("suite")
    if not isinstance(suite, str) or not SUITE_RE.match(suite) or ".." in suite.split("/"):
        problems.error(
            f"{where}: field 'suite' must be a path like 'unit/<name>.md' under one of "
            f"{list(LAYER_DIRS)}; '{PLATFORM_DIR}/' holds generated coverage maps, not case documents"
        )
    elif layer and suite.split("/")[0] != layer:
        problems.error(f"{where}: suite {suite!r} directory disagrees with layer {layer!r}")

    environment = case.get("environment")
    if environment not in ENVIRONMENTS:
        problems.error(f"{where}: field 'environment' must be one of {list(ENVIRONMENTS)}")
        environment = None

    if case.get("priority") not in PRIORITIES:
        problems.error(f"{where}: field 'priority' must be one of {list(PRIORITIES)}")
    if case.get("gate") not in GATES:
        problems.error(f"{where}: field 'gate' must be one of {list(GATES)}")
    if case.get("basis") not in BASES:
        problems.error(f"{where}: field 'basis' must be one of {list(BASES)}")

    string_field(case, "risk", where, problems, minimum=10)
    string_field(case, "automation", where, problems, minimum=10)

    requirements = list_field(case, "requirements", where, problems)
    if requirements is not None:
        for token in requirements:
            if not inv.requirement_meta(token):
                problems.error(
                    f"{where}: unknown requirement token {token!r}; use an exact SRS ID or a declared "
                    f"section alias ({', '.join(sorted(inv.aliases))})"
                )

    facets = list_field(case, "facets", where, problems)
    if facets is not None:
        for token in facets:
            if inv.facet_meta(token) is None:
                family = token.partition(":")[0]
                if family not in inv.facets:
                    problems.error(f"{where}: unknown facet family {family!r} in token {token!r}")
                else:
                    problems.error(f"{where}: unknown {family} facet token {token!r}")

    references = list_field(case, "references", where, problems, minimum=1)
    if references is not None:
        for reference in references:
            if reference.startswith("/") or ".." in reference.split("/"):
                problems.error(f"{where}: reference {reference!r} must be a repo-relative path")
                continue
            if "#" in reference or "::" in reference:
                problems.error(
                    f"{where}: reference {reference!r} must be a plain file path with no fabricated "
                    "line number or section anchor"
                )
                continue
            if not (REPO / reference).is_file():
                problems.error(f"{where}: reference {reference!r} does not exist in the repository")

    fixtures = list_field(case, "fixtures", where, problems)
    if fixtures is not None:
        for fixture in fixtures:
            if "*" in fixture or fixture.endswith("/"):
                problems.error(
                    f"{where}: fixture {fixture!r} must be a concrete file path without wildcards"
                )
            elif fixture not in fixture_paths:
                problems.error(
                    f"{where}: fixture {fixture!r} is not produced by any source module or by the generator"
                )

    preconditions = list_field(
        case, "preconditions", where, problems, minimum=MINIMUMS["preconditions"]
    )
    steps = steps_field(case, where, problems)
    assertions = list_field(case, "assertions", where, problems, minimum=MINIMUMS["assertions"])
    forbidden = list_field(case, "forbidden", where, problems, minimum=MINIMUMS["forbidden"])
    evidence = list_field(case, "evidence", where, problems, minimum=MINIMUMS["evidence"])
    list_field(case, "cleanup", where, problems, minimum=MINIMUMS["cleanup"])
    prerequisites = list_field(case, "prerequisites", where, problems)
    inputs_field(case, where, problems)

    if layer == "e2e" and steps is not None and len(steps) < E2E_RECOMMENDED_STEPS:
        problems.warn(
            f"{where}: e2e case has only {len(steps)} steps "
            f"(the contract expects a complete journey, >= {E2E_RECOMMENDED_STEPS})"
        )

    if environment == "live":
        if not prerequisites:
            problems.error(
                f"{where}: live case must declare prerequisites (approved ASM-001 lock, sandbox allowlist)"
            )
        elif not any("ASM-001" in item for item in prerequisites):
            problems.error(
                f"{where}: live case prerequisites must include the approved ASM-001 connector lock"
            )

    pair = case.get("pair")
    if layer == "e2e" and (not isinstance(pair, str) or not pair.strip()):
        problems.error(f"{where}: every e2e case must declare 'pair' (its offline/live counterpart)")
    if pair is not None and not isinstance(pair, str):
        problems.error(f"{where}: field 'pair' must be a case ID string when present")
    elif isinstance(pair, str) and pair and not CASE_ID_RE.match(pair):
        problems.error(f"{where}: pair {pair!r} is not a valid case ID")

    if preconditions is None or assertions is None or forbidden is None or evidence is None:
        return
    privacy_warnings(case, where, problems)


def validate_ids(cases: list, problems: Problems) -> dict:
    by_id: dict = {}
    for case in cases:
        cid = case.get("id")
        if not isinstance(cid, str) or not cid:
            continue
        if cid in by_id:
            problems.error(
                f"{case_origin(case)}: duplicate case id {cid!r} (also declared by {case_origin(by_id[cid])})"
            )
            continue
        by_id[cid] = case
    return by_id


def validate_baseline(cases: list, baseline: list, problems: Problems) -> dict:
    counts = Counter(case.get("id") for case in cases if isinstance(case.get("id"), str))
    baseline_set = set(baseline)
    if len(baseline_set) != len(baseline):
        repeated = sorted(cid for cid, count in Counter(baseline).items() if count > 1)
        problems.error(
            f"{BASELINE_REL} lists {len(baseline) - len(baseline_set)} duplicated baseline ID(s): {repeated}"
        )
    missing = sorted(cid for cid in baseline if counts.get(cid, 0) == 0)
    duplicated = sorted(
        cid for cid, count in counts.items() if count > 1 and cid in baseline_set
    )
    for cid in missing:
        problems.error(
            f"baseline case ID {cid!r} from {BASELINE_REL} is not produced by any source module"
        )
    for cid in duplicated:
        problems.error(f"baseline case ID {cid!r} is produced more than once")
    new_ids = sorted(str(cid) for cid in counts if cid not in baseline_set)
    duplicated_set = set(duplicated)
    return {
        "file": BASELINE_REL,
        "count": len(baseline),
        "preserved": len(baseline) - len(missing) - len(duplicated),
        "preserved_ids": [cid for cid in baseline if counts.get(cid, 0) == 1],
        "order": list(baseline),
        "missing": missing,
        "duplicated": duplicated,
        "duplicated_ids": sorted(duplicated_set),
        "new_case_ids": new_ids,
        "new_case_count": len(new_ids),
    }


def validate_pairs(cases: list, by_id: dict, problems: Problems) -> dict:
    e2e_cases = [case for case in cases if case.get("layer") == "e2e"]
    asymmetric = []
    relations = {}
    for case in e2e_cases:
        cid = case.get("id")
        pair = case.get("pair")
        if not isinstance(pair, str) or not pair:
            continue
        if pair == cid:
            problems.error(f"{case_origin(case)}: pair must not point at the case itself")
            continue
        partner = by_id.get(pair)
        if partner is None:
            problems.error(f"{case_origin(case)}: pair {pair!r} is not produced by any source module")
            continue
        relations[cid] = pair
        if partner.get("layer") != "e2e":
            problems.error(f"{case_origin(case)}: pair {pair!r} must also be an e2e case")
            continue
        if partner.get("environment") == case.get("environment"):
            problems.error(
                f"{case_origin(case)}: pair {pair!r} must run in the opposite environment "
                f"(both are {case.get('environment')!r})"
            )
        if partner.get("pair") != cid:
            asymmetric.append(f"{cid}->{pair}")
            problems.error(
                f"{case_origin(case)}: pair relation is not symmetric "
                f"({pair!r} declares pair={partner.get('pair')!r}, expected {cid!r})"
            )
        left = set(case.get("requirements") or [])
        right = set(partner.get("requirements") or [])
        if left != right:
            problems.error(
                f"{case_origin(case)}: pair {pair!r} must declare the same requirements; "
                f"only-here={sorted(left - right)} only-there={sorted(right - left)}"
            )
        left_facets = set(case.get("facets") or [])
        right_facets = set(partner.get("facets") or [])
        if left_facets != right_facets:
            problems.error(
                f"{case_origin(case)}: pair {pair!r} must declare the same coverage facets; "
                f"only-here={sorted(left_facets - right_facets)} "
                f"only-there={sorted(right_facets - left_facets)}"
            )
        for field in ("priority", "gate"):
            if case.get(field) != partner.get(field):
                problems.warn(
                    f"{case_origin(case)}: pair {pair!r} differs on {field} "
                    f"({case.get(field)!r} vs {partner.get(field)!r})"
                )
        live_member = case if case.get("environment") == "live" else partner
        live_prereq = live_member.get("prerequisites") or []
        if not live_prereq:
            problems.error(
                f"{case_origin(live_member)}: the live half of pair {pair!r} must state the approved "
                "sandbox prerequisites it needs (ASM-001 lock, allowlist, approved recipients)"
            )
        elif not any("ASM-001" in item for item in live_prereq):
            problems.error(
                f"{case_origin(live_member)}: the live half of pair {pair!r} must name the approved "
                "ASM-001 connector lock in its prerequisites"
            )

    for case in cases:
        if case.get("layer") != "e2e" and case.get("pair"):
            problems.warn(
                f"{case_origin(case)}: non-e2e case declares 'pair'; symmetric pairing is an e2e rule"
            )

    # Presence of 'pair' on every e2e case is enforced in validate_case; here we only count it.
    unpaired = sorted(case["id"] for case in e2e_cases if not case.get("pair"))
    return {
        "e2e_cases": len(e2e_cases),
        "paired_e2e_cases": len(e2e_cases) - len(unpaired),
        "asymmetric": asymmetric,
        "unpaired": unpaired,
        "relations": dict(sorted(relations.items())),
    }


def validate_both_environments(cases: list, inv: Inventory, problems: Problems) -> dict:
    e2e_cases = [case for case in cases if case.get("layer") == "e2e"]
    required = E2E_CRITERIA + PILOT_CRITERIA
    for token in required:
        if not inv.requirement_meta(token):
            problems.error(
                f"{REQUIREMENTS_REL} does not declare {token}; the inventory must list every system "
                "acceptance criterion and every pilot"
            )
    declared = [token for token in inv.requirements if token.startswith("TC-E2E-") or token.startswith("PILOT-")]
    tokens = sorted(set(declared) | set(required))
    matrix: dict = {}
    for token in tokens:
        offline = sorted(
            case["id"]
            for case in e2e_cases
            if case.get("environment") == "offline" and token in set(case.get("requirements") or [])
        )
        live = sorted(
            case["id"]
            for case in e2e_cases
            if case.get("environment") == "live" and token in set(case.get("requirements") or [])
        )
        matrix[token] = {"offline": offline, "live": live}
        if not offline:
            problems.error(f"{token}: no offline e2e case claims this system acceptance criterion")
        if not live:
            problems.error(f"{token}: no live e2e case claims this system acceptance criterion")
    return matrix


def build_coverage(cases: list, inv: Inventory) -> dict:
    requirement_cases: dict = {token: [] for token in inv.requirement_tokens()}
    facet_cases: dict = {token: [] for token in inv.facet_tokens()}
    for case in cases:
        cid = case.get("id")
        if not isinstance(cid, str):
            continue
        for token in sorted(set(case.get("requirements") or [])):
            if token in requirement_cases:
                requirement_cases[token].append(cid)
        for token in sorted(set(case.get("facets") or [])):
            if token in facet_cases:
                facet_cases[token].append(cid)
    requirement_gaps = sorted(token for token, ids in requirement_cases.items() if not ids)
    facet_gaps = sorted(token for token in inv.mandatory_facet_tokens() if not facet_cases.get(token))
    return {
        "requirement_cases": requirement_cases,
        "facet_cases": facet_cases,
        "requirement_gaps": requirement_gaps,
        "facet_gaps": facet_gaps,
    }
