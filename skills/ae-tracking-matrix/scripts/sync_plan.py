#!/usr/bin/env python3
"""Sync a reviewed plan through tracking.plan.save_items without creating XLSX.

Stages: conversation-only delivery -> read-only preflight/dry-run -> semantic
review and explicit target confirmation -> one structured sync -> readback.
No delete, replace, hidden workbook, automatic retry or success-only verification.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

from plan_contract import PlanError, counts, ensure_new_path, file_sha256, json_bytes, normalize_plan
from upload_plan import (UploadError, api, check_target, default_runner, digest,
                         import_errors, now, read_json, require_context,
                         review_gate, run_help, validate_baseline, write_new_json)

TYPE_MAP = {
    "文本": "string", "数值": "number", "布尔": "bool", "时间": "datetime",
    "对象": "object", "对象组": "array_row", "列表": "array_string",
}
SYNC_UPDATE_METHODS = {"user_set", "user_setOnce", "user_add"}


def property_payload(record):
    return {
        "name": record["property_name"],
        "display_name": record["display_name"],
        "type": TYPE_MAP[record["property_type"]],
        "desc": record["description"],
    }


def build_payload(source, project_id):
    """Translate canonical JSON losslessly into the inspected snake_case API pools."""
    source = normalize_plan(source)
    events = []
    event_props = {}
    description_variants = {}
    for event in source["events"]:
        item = {
            "event_name": event["event_name"],
            "display_name": event["display_name"],
            "event_desc": event["description"],
            "event_tag": event["tag"],
            "props": [prop["property_name"] for prop in event["properties"]],
        }
        if event["platform"]:
            # The deployment dry-run must accept this value before any write.
            item["data_origin"] = event["platform"]
        events.append(item)
        for prop in event["properties"]:
            converted = property_payload(prop)
            name = prop["property_name"]
            previous = event_props.setdefault(name, converted)
            identity = ("name", "display_name", "type")
            if any(previous[field] != converted[field] for field in identity):
                raise UploadError("Same-name event property identity differs; reconcile definitions before structured sync: " + name)
            description_variants.setdefault(name, []).append((event["event_name"], prop["description"]))
    for name, variants in description_variants.items():
        if len({description for _, description in variants}) > 1:
            # A global property has one description. Preserve event-specific wording
            # explicitly instead of dropping it or treating it as a type conflict.
            event_props[name]["desc"] = "\n".join(f"[{event}] {description}" for event, description in variants)
    user_props = []
    for prop in source["user_properties"]:
        if prop["update_method"] not in SYNC_UPDATE_METHODS:
            raise UploadError("Structured save-items does not support update method " + prop["update_method"] +
                              "; keep the plan local, revise the semantics, or choose the Excel import path")
        user_props.append({**property_payload(prop), "update_type": prop["update_method"]})
    payload = {"project_id": project_id}
    for key, values in (
        ("events", events),
        ("event_props", list(event_props.values())),
        ("common_event_props", [property_payload(prop) for prop in source["common_event_properties"]]),
        ("user_props", user_props),
    ):
        if values:
            payload[key] = values
    return payload


def local_gate(delivery):
    root = Path(delivery).resolve()
    validation = read_json(root / "validation.json")
    if (validation.get("schema_version") != 1 or
            validation.get("status") != "review_ready_delivery_choice_pending" or
            validation.get("delivery_choice_pending") is not True or
            validation.get("machine_validation", {}).get("passed") is not None):
        raise UploadError("Structured sync requires a conversation-only delivery awaiting a delivery choice")
    if (root / "plan.xlsx").exists() or (root / "lint.txt").exists():
        raise UploadError("Conversation-only delivery must not contain an Excel workbook or Excel lint log")
    expected = validation.get("fingerprints", {})
    if set(expected) != {"plan.normalized.json", "conversation.md"}:
        raise UploadError("Unexpected structured-delivery artifact fingerprints")
    for name in expected:
        path = root / name
        if path.is_symlink() or not path.is_file() or file_sha256(path) != expected[name]:
            raise UploadError("Delivery changed or fingerprint missing: " + name)
    source = normalize_plan(read_json(root / "plan.normalized.json"))
    if counts(source) != validation.get("counts"):
        raise UploadError("Counts do not match normalized source")
    return root, validation, source


def capability_contract(envelope):
    data = envelope.get("data")
    if not isinstance(data, dict):
        raise UploadError("Unsupported save-items inspection envelope")
    identifier = data.get("capability_id", data.get("id"))
    schema = data.get("input_schema")
    if identifier != "tracking.plan.save_items" or data.get("risk") != "write":
        raise UploadError("Unexpected or destructive save-items capability contract")
    if not isinstance(schema, dict) or schema.get("type") != "object":
        raise UploadError("Unknown save-items input schema")
    properties = schema.get("properties")
    required = {"project_id", "events", "event_props", "common_event_props", "user_props"}
    if not isinstance(properties, dict) or not required.issubset(properties):
        raise UploadError("Save-items schema lacks the documented project/item pools")
    if schema.get("additionalProperties") is not False:
        raise UploadError("Save-items schema changed; inspect new fields before composing input")
    for pool in ("event_props", "common_event_props", "user_props"):
        item_schema = properties[pool].get("items", {})
        if item_schema.get("additionalProperties") is not False:
            raise UploadError("Save-items property schema is open or unknown: " + pool)
        prop_schema = item_schema.get("properties", {})
        if not {"name", "type"}.issubset(item_schema.get("required", [])) or not {"name", "display_name", "type", "desc"}.issubset(prop_schema):
            raise UploadError("Save-items property fields changed: " + pool)
        if set(prop_schema["type"].get("enum", [])) != set(TYPE_MAP.values()):
            raise UploadError("Save-items property types changed: " + pool)
    user_schema = properties["user_props"]["items"].get("properties", {})
    if set(user_schema.get("update_type", {}).get("enum", [])) != SYNC_UPDATE_METHODS:
        raise UploadError("Save-items user update methods changed; review user_append handling")
    return {"capability_id": identifier, "risk": data["risk"], "input_schema": schema}


def discover(cli, runner, target):
    # --host is a global CLI option; subcommand help need not repeat it.
    run_help(cli, [], ["--host"], runner)
    run_help(cli, ["tracking", "plan", "get"], ["--project-id", "--host"], runner)
    run_help(cli, ["capability", "inspect"], ["--project-id"], runner)
    run_help(cli, ["capability", "dry-run"], ["--input"], runner)
    run_help(cli, ["capability", "run"], ["--input"], runner)
    inspected = api(cli, ["capability", "inspect", "tracking.plan.save_items",
                          "--project-id", str(target["project_id"]), "--host", target["host"]], runner)
    capability_contract(inspected)
    return inspected


def checked_dry_run(envelope, payload):
    data = envelope.get("data", {})
    if (data.get("dry_run") is not True or
            data.get("capability_id") != "tracking.plan.save_items" or
            data.get("risk") != "write"):
        raise UploadError("Save-items dry-run did not confirm the expected write contract")
    if data.get("normalized_input") != payload:
        raise UploadError("Save-items dry-run normalized the payload unexpectedly; review differences before writing")
    return envelope


def preflight(delivery, project_id, host, output, cli="ae-cli", runner=default_runner, context_cwd=None):
    root, validation, source = local_gate(delivery)
    target = check_target(project_id, host)
    output = ensure_new_path(output, (root / "validation.json", root / "plan.normalized.json", root / "conversation.md"))
    require_context(context_cwd)
    payload = build_payload(source, project_id)
    payload_path = root / "sync-payload.json"
    write_new_json(payload_path, payload)
    schema = discover(cli, runner, target)
    baseline = api(cli, ["tracking", "plan", "get", "--project-id", str(project_id), "--host", target["host"]], runner)
    validate_baseline(baseline, target)
    dry_run = checked_dry_run(api(cli, ["capability", "dry-run", "tracking.plan.save_items",
                                       "--host", target["host"], "--input", str(payload_path)], runner), payload)
    result = {
        "schema_version": 1, "created_at": now(), "target": target,
        "fingerprints": validation["fingerprints"], "payload_sha256": digest(payload),
        "baseline_sha256": digest(baseline["data"]), "baseline": baseline,
        "sync_capability": schema, "dry_run": dry_run,
        "status": "read_only_preflight_complete",
        "warning": "Dry-run is not persistence evidence. Review baseline conflicts, target and scope before confirmation.",
    }
    write_new_json(output, result)
    return result


def freeze_payload(root, payload):
    snapshot = root / ".sync-snapshot"
    snapshot.mkdir(mode=0o700, exist_ok=False)
    path = snapshot / "payload.json"
    content = json_bytes(payload)
    if digest(payload) != hashlib.sha256(content).hexdigest():
        # digest() hashes the same canonical JSON bytes; this is a defensive invariant.
        raise UploadError("Structured payload canonicalization changed")
    with path.open("xb") as handle:
        handle.write(content)
        handle.flush()
        os.fchmod(handle.fileno(), 0o400)
    return path


def sync(delivery, project_id, host, preflight_path, review_path, confirmed=False,
         cli="ae-cli", runner=default_runner, context_cwd=None):
    if confirmed is not True:
        raise UploadError("Explicit user confirmation of the displayed target and sync scope is required")
    root, validation, source = local_gate(delivery)
    target = check_target(project_id, host)
    prepared = read_json(preflight_path)
    review = read_json(review_path)
    review_gate(review, prepared, validation, target)
    if prepared.get("status") != "read_only_preflight_complete":
        raise UploadError("Read-only structured preflight is incomplete")
    payload = build_payload(source, project_id)
    if digest(payload) != prepared.get("payload_sha256"):
        raise UploadError("Structured payload changed since review; confirmation is stale")
    receipt_path = ensure_new_path(root / "sync-attempt.json")
    require_context(context_cwd)
    inspected = discover(cli, runner, target)
    if capability_contract(inspected) != capability_contract(prepared.get("sync_capability", {})):
        raise UploadError("Save-items capability changed since preflight; review the new scope")
    current = api(cli, ["tracking", "plan", "get", "--project-id", str(project_id), "--host", target["host"]], runner)
    validate_baseline(current, target)
    if digest(current["data"]) != prepared["baseline_sha256"]:
        raise UploadError("Project plan changed since review; inspect the diff and obtain fresh confirmation")
    if source.get("meta", {}).get("blocking_unknowns"):
        raise UploadError("Source still contains blocking unknowns")
    payload_path = freeze_payload(root, payload)
    attempt = {
        "schema_version": 1, "started_at": now(), "target": target,
        "fingerprints": validation["fingerprints"], "payload_sha256": digest(payload),
        "baseline_sha256": prepared["baseline_sha256"],
        "status": "dispatch_started_outcome_unknown", "mode": "structured_save_items",
        "user_confirmation_supplied": True, "snapshot_file": str(payload_path),
        "snapshot_sha256": file_sha256(payload_path), "excel_generated": False,
    }
    write_new_json(receipt_path, attempt)
    try:
        synced = api(cli, ["capability", "run", "tracking.plan.save_items",
                           "--host", target["host"], "--input", str(payload_path)], runner)
        readback = api(cli, ["tracking", "plan", "get", "--project-id", str(project_id), "--host", target["host"]], runner)
        errors = import_errors(synced)
        status = "sync_reported_errors_require_review" if errors else "sync_accepted_readback_requires_review"
        result = {
            **attempt, "finished_at": now(), "status": status,
            "sync_response": synced, "sync_errors": errors, "readback": readback,
            "readback_sha256": digest(readback["data"]),
            "management_url": target["host"] + "/#/data/plan",
            "next_step": "Compare event names, collection sides, property types, associations and preserved baseline items; only then report sync verified. Never auto-retry or delete/replace.",
        }
        write_new_json(root / "sync-result.json", result)
        return result
    except (OSError, ValueError, subprocess.SubprocessError) as exc:
        write_new_json(root / "sync-error.json", {
            **attempt, "finished_at": now(), "status": "outcome_requires_reconciliation",
            "error": str(exc), "next_step": "Read back the target before any retry; preserve attempt evidence.",
        })
        raise


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--delivery", required=True)
    parser.add_argument("--project-id", required=True, type=int)
    parser.add_argument("--host", required=True)
    parser.add_argument("--ae-cli", default="ae-cli")
    parser.add_argument("--preflight", action="store_true")
    parser.add_argument("--output")
    parser.add_argument("--preflight-file")
    parser.add_argument("--review")
    parser.add_argument("--confirm", action="store_true")
    args = parser.parse_args(argv)
    try:
        if args.preflight:
            if not args.output or args.confirm or args.review or args.preflight_file:
                raise UploadError("--preflight requires --output only; never combine it with write confirmation")
            result = preflight(args.delivery, args.project_id, args.host, args.output, args.ae_cli)
            code = 0
        else:
            if not args.preflight_file or not args.review or args.output:
                raise UploadError("Structured sync requires --preflight-file, --review and explicit --confirm")
            result = sync(args.delivery, args.project_id, args.host, args.preflight_file,
                          args.review, args.confirm, args.ae_cli)
            code = 3
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return code
    except (OSError, ValueError, KeyError) as exc:
        print("ERROR: " + str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
