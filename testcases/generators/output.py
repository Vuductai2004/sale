"""Output planning, drift checks, and atomic writes."""

from __future__ import annotations

import json
import os
from collections import OrderedDict

from .model import (
    FIXTURES_GUIDE,
    HERE,
    LAYER_DIRS,
    LIVE_ENV_EXAMPLE,
    LIVE_FIXTURES_GUIDE,
    MODULES,
    PLATFORM_DIR,
    PLATFORM_ENTITIES_DOC,
    PLATFORM_KNOWLEDGE_DOC,
    SCENARIO_DIR,
    SOURCE_OWNED,
    GenerateError,
)
from .render import (
    render_coverage,
    render_env_example,
    render_fixtures_guide,
    render_live_guide,
    render_manifest,
    render_platform_entities,
    render_platform_knowledge_memory,
    render_readme,
    render_suite,
    render_traceability,
    scenario_record,
)
from .validation import is_protected
def build_outputs(cases, fixtures, inv, baseline_info, coverage, pairs, both_env, problems, fixture_owners_map):
    outputs: OrderedDict = OrderedDict()

    suites: dict = {}
    for case in sorted(cases, key=lambda item: (item["suite"], item["id"])):
        suites.setdefault(case["suite"], []).append(case)

    documents = []
    for suite in sorted(suites):
        outputs[suite] = render_suite(suite, suites[suite], inv)
        documents.append({"path": suite, "cases": len(suites[suite]), "layer": suite.split("/")[0]})

    outputs["README.md"] = render_readme(inv, cases, fixtures, baseline_info, coverage)
    outputs["TRACEABILITY.md"] = render_traceability(cases, inv, baseline_info, pairs)
    outputs["COVERAGE.md"] = render_coverage(inv, cases, coverage, both_env)
    outputs[PLATFORM_KNOWLEDGE_DOC] = render_platform_knowledge_memory(inv, cases, coverage)
    outputs[PLATFORM_ENTITIES_DOC] = render_platform_entities(inv, cases, coverage)

    for path, data in sorted(fixtures.items()):
        outputs[path] = json.dumps(data, indent=2, ensure_ascii=False) + "\n"

    outputs[FIXTURES_GUIDE] = render_fixtures_guide(fixture_owners_map)
    outputs[LIVE_FIXTURES_GUIDE] = render_live_guide()
    outputs[LIVE_ENV_EXAMPLE] = render_env_example()

    for case in sorted(cases, key=lambda item: item["id"]):
        outputs[f"{SCENARIO_DIR}/{case['id']}.json"] = json.dumps(
            scenario_record(case), indent=2, ensure_ascii=False
        ) + "\n"

    outputs["manifest.json"] = render_manifest(
        inv,
        cases,
        fixtures,
        fixture_owners_map,
        baseline_info,
        coverage,
        pairs,
        both_env,
        problems,
        documents,
    )
    assert_output_paths(outputs)
    return outputs


def assert_output_paths(outputs: dict) -> None:
    """Refuse any output that would leave testcases/ or overwrite a hand-written input."""
    for rel in outputs:
        if rel.startswith("/") or ".." in rel.split("/") or rel.endswith("/"):
            raise GenerateError(f"generated path escapes testcases/: {rel!r}")
        if rel.replace("\\", "/") in SOURCE_OWNED:
            raise GenerateError(
                f"generated path {rel!r} collides with a hand-written input; the generator never "
                "rewrites its own sources"
            )
        if is_protected(rel):
            raise GenerateError(f"generated path {rel!r} is protected (local env, results or secrets)")


def stale_extras(outputs: dict) -> list:
    """Generated-looking files on disk that this run does not produce (never deleted by us)."""
    stale = []
    for directory, pattern in (
        ("fixtures/offline", "*.json"),
        (SCENARIO_DIR, "*.json"),
        ("fixtures/live", "*.json"),
        (PLATFORM_DIR, "*.md"),
        (".", "*.md"),
        (".", "*.tmp"),
    ):
        base = HERE / directory
        if not base.is_dir():
            continue
        for path in sorted(base.glob(pattern)):
            if not path.is_file():
                continue
            rel = path.relative_to(HERE).as_posix()
            if rel in outputs:
                continue
            if is_protected(rel):
                continue
            stale.append(rel)
    for layer in LAYER_DIRS:
        base = HERE / layer
        if not base.is_dir():
            continue
        for path in sorted(base.rglob("*.md")):
            rel = path.relative_to(HERE).as_posix()
            if rel not in outputs:
                stale.append(rel)
    return stale


def check_outputs(outputs: dict) -> int:
    """Compare generated content (case docs, fixtures, manifest, derived maps) with disk."""
    drift = []
    matched = 0
    for rel in sorted(outputs):
        path = HERE / rel
        if not path.is_file():
            drift.append(f"missing generated output: testcases/{rel}")
        elif path.read_text(encoding="utf-8") != outputs[rel]:
            drift.append(f"stale generated output (content differs from sources): testcases/{rel}")
        else:
            matched += 1
    for rel in stale_extras(outputs):
        drift.append(f"unexpected generated file that this generator does not produce: testcases/{rel}")
    if drift:
        for item in drift:
            print(f"STALE: {item}")
        print(
            f"FAILED: {len(drift)} generated file(s) out of date or unexpected "
            f"({matched} matched); run python testcases/_generate.py"
        )
        return 3
    print(
        f"OK: {len(outputs)} generated file(s) match the sources byte for byte, "
        f"including manifest.json and its input hashes"
    )
    return 0


def write_outputs(outputs: dict) -> list:
    """Atomically replace each generated file. All validation has already passed."""
    written = []
    for rel in sorted(outputs):
        if is_protected(rel):
            raise GenerateError(f"refusing to write protected path: testcases/{rel}")
        path = HERE / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_name(path.name + ".tmp")
        try:
            with open(temporary, "w", encoding="utf-8", newline="\n") as handle:
                handle.write(outputs[rel])
            os.replace(temporary, path)
        except OSError as exc:
            if temporary.exists():
                temporary.unlink()
            raise GenerateError(f"cannot write testcases/{rel}: {exc}") from exc
        written.append(rel)
    return written


def fixture_owners(modules: dict) -> dict:
    owners: dict = {}
    for name in MODULES:
        raw = getattr(modules[name], "FIXTURES", None)
        if isinstance(raw, dict):
            for key in raw:
                owners.setdefault(str(key), f"sources/{name}.py")
    return OrderedDict(sorted(owners.items()))
