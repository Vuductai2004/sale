"""Loading and collecting generator inputs."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import sys
from collections import OrderedDict

from .model import (
    BASELINE_REL,
    HASHED_INPUTS,
    HERE,
    MODULES,
    REPO,
    REQUIREMENTS_REL,
    SOURCE_INPUTS,
    SOURCES,
    GenerateError,
    Inventory,
)
from .validation import is_protected
def sha256_file(rel: str) -> str:
    """Hash text inputs with canonical LF so Git checkouts agree across operating systems."""
    path = REPO / rel
    if not path.is_file():
        return "missing"
    return hashlib.sha256(path.read_bytes().replace(b"\r\n", b"\n")).hexdigest()


def input_hashes() -> OrderedDict:
    """Pin every generator input (SRS, inventory, baseline, façades and fragments) by SHA-256."""
    hashes: OrderedDict = OrderedDict()
    for rel in HASHED_INPUTS:
        hashes[rel] = sha256_file(rel)
    for rel in SOURCE_INPUTS:
        hashes[rel] = sha256_file(rel)
    return hashes


def load_inventory() -> Inventory:
    path = HERE / REQUIREMENTS_REL
    if not path.is_file():
        raise GenerateError(f"missing requirement inventory: testcases/{REQUIREMENTS_REL}")
    try:
        doc = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise GenerateError(f"testcases/{REQUIREMENTS_REL} is not valid JSON: {exc}") from exc
    if not isinstance(doc, dict):
        raise GenerateError(f"testcases/{REQUIREMENTS_REL} must contain a JSON object")
    inventory = Inventory(doc)
    if not inventory.requirements:
        raise GenerateError(f"testcases/{REQUIREMENTS_REL} declares no requirements")
    if not inventory.facets:
        raise GenerateError(f"testcases/{REQUIREMENTS_REL} declares no facet families")
    return inventory


def load_baseline() -> list:
    path = HERE / BASELINE_REL
    if not path.is_file():
        raise GenerateError(f"missing baseline ID snapshot: testcases/{BASELINE_REL}")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise GenerateError(f"testcases/{BASELINE_REL} is not valid JSON: {exc}") from exc
    if not isinstance(data, list) or not all(isinstance(item, str) for item in data):
        raise GenerateError(f"testcases/{BASELINE_REL} must be a JSON array of case ID strings")
    return data


# --------------------------------------------------------------------------------------
# source modules
# --------------------------------------------------------------------------------------


def load_modules() -> dict:
    missing = [name for name in MODULES if not (SOURCES / f"{name}.py").is_file()]
    if missing:
        raise GenerateError(
            "missing case source module(s): "
            + ", ".join(f"testcases/sources/{name}.py" for name in missing)
        )
    modules: dict = {}
    for name in MODULES:
        path = SOURCES / f"{name}.py"
        spec = importlib.util.spec_from_file_location(f"tc_sources_{name}", path)
        if spec is None or spec.loader is None:
            raise GenerateError(f"cannot load testcases/sources/{name}.py")
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        try:
            spec.loader.exec_module(module)
        except Exception as exc:  # surface the source module failure as-is
            raise GenerateError(f"testcases/sources/{name}.py failed to import: {exc!r}") from exc
        modules[name] = module
    return modules


def collect_cases(modules: dict, problems: Problems) -> list:
    cases: list = []
    for name in MODULES:
        raw = getattr(modules[name], "CASES", None)
        if not isinstance(raw, list):
            problems.error(f"sources/{name}.py: CASES must be a list of case dicts")
            continue
        for position, case in enumerate(raw):
            if not isinstance(case, dict):
                problems.error(f"sources/{name}.py: CASES[{position}] is not a dict")
                continue
            record = OrderedDict(case)
            record["_module"] = name
            record["_position"] = position
            cases.append(record)
    return cases


def collect_fixtures(modules: dict, problems: Problems) -> OrderedDict:
    merged: OrderedDict = OrderedDict()
    owners: dict = {}
    for name in MODULES:
        raw = getattr(modules[name], "FIXTURES", None)
        if not isinstance(raw, dict):
            problems.error(
                f"sources/{name}.py: FIXTURES must be a dict of relative path -> JSON data"
            )
            continue
        for key, value in raw.items():
            if not isinstance(key, str) or not key:
                problems.error(f"sources/{name}.py: FIXTURES has an empty or non-string key")
                continue
            if key != key.replace("\\", "/"):
                problems.error(f"sources/{name}.py: fixture path {key!r} must use forward slashes")
                continue
            if not key.startswith("fixtures/") or key.endswith("/"):
                problems.error(f"sources/{name}.py: fixture path {key!r} must live under fixtures/")
                continue
            if ".." in key.split("/") or "*" in key:
                problems.error(
                    f"sources/{name}.py: fixture path {key!r} must not contain '..' or wildcards"
                )
                continue
            if is_protected(key):
                problems.error(f"sources/{name}.py: refusing to own protected path {key!r}")
                continue
            if key in merged:
                problems.error(
                    f"sources/{name}.py: fixture {key!r} already provided by sources/{owners[key]}.py"
                )
                continue
            if not key.endswith(".json"):
                problems.error(f"sources/{name}.py: fixture {key!r} must be a .json file")
                continue
            try:
                json.dumps(value)
            except (TypeError, ValueError) as exc:
                problems.error(f"sources/{name}.py: fixture {key!r} is not JSON-serializable: {exc}")
                continue
            merged[key] = value
            owners[key] = name
    return merged
