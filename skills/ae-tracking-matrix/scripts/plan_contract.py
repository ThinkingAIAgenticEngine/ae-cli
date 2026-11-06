#!/usr/bin/env python3
"""Shared, local-only contract for chat, 11-sheet XLSX and upload gates.

No API calls, credential reads, translations or implicit business-field fixes.
"""
from __future__ import annotations

from copy import deepcopy
import hashlib
import json
import re
from pathlib import Path

from plan_types import normalize_property_type, normalize_update_method

DATA_HEADERS = {
    "#用户ID体系": ["游戏类型", "属性名", "属性显示名", "属性说明", "赋值说明"],
    "#事件数据": ["事件名（必填）", "事件显示名", "事件说明", "事件标签", "采集端", "属性名（必填）", "属性显示名", "属性类型（必填）", "属性说明"],
    "#公共事件属性": ["属性名（必填）", "属性显示名", "属性类型（必填）", "属性说明"],
    "#用户数据": ["属性名（必填）", "属性显示名", "属性类型（必填）", "更新方式", "属性说明"],
}
SHEET_NAMES = ("接入必知", "埋点注意事项", "#用户ID体系", "#事件数据", "#公共事件属性", "#用户数据", "数据类型设计原则", "公共事件属性设置方式", "多端接入注意点", "多用户ID体系的埋点建议", "ID体系常见疑问")
INSTRUCTION_SHEETS = tuple(s for s in SHEET_NAMES if s not in DATA_HEADERS)
PLAN_UPDATE_METHODS = {"user_set", "user_setOnce", "user_add", "user_append"}
BUSINESS_CONTEXT_FIELDS = ("business_context", "notes", "timezone", "metric_mapping", "change_log", "assumptions", "open_questions", "blocking_unknowns")


def business_context_text(plan):
    # Retained in a data-header comment, never by altering the seven instruction sheets.
    return json.dumps({key: plan.get("meta", {}).get(key) for key in BUSINESS_CONTEXT_FIELDS}, ensure_ascii=False, sort_keys=True, indent=2)
NAME_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_]{0,49}$")
PROP_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)*$")
XML_ILLEGAL_RE = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F]")
DEFAULT_TEMPLATE = Path(__file__).resolve().parents[1] / "assets" / "埋点模版.xlsx"


class PlanError(ValueError):
    pass


def string(value, path, required=False):
    if value is None and not required:
        return ""
    if not isinstance(value, str):
        raise PlanError(f"{path}: expected a string, not {type(value).__name__}")
    if required and not value.strip():
        raise PlanError(f"{path}: required non-empty string")
    if XML_ILLEGAL_RE.search(value):
        raise PlanError(f"{path}: illegal XML control character")
    if len(value) > 32767:
        raise PlanError(f"{path}: exceeds Excel's cell text limit")
    return value


def records(value, path):
    if not isinstance(value, list):
        raise PlanError(f"{path}: expected an array")
    if any(not isinstance(v, dict) for v in value):
        raise PlanError(f"{path}: entries must be objects")
    return value


def named(record, key, path, prop=False):
    name = string(record.get(key), f"{path}.{key}", True)
    rule = PROP_RE if prop else NAME_RE
    if len(name) > 50 or not rule.fullmatch(name):
        raise PlanError(f"{path}.{key}: invalid custom {'property' if prop else 'event'} name {name!r}; system # fields belong in the ID sheet, not custom properties")
    return name


def allowed_keys(record, allowed, path):
    extras = set(record) - set(allowed)
    if extras:
        raise PlanError(f"{path}: unsupported fields {sorted(extras)}; preserve their business meaning explicitly in description/remarks instead of silently dropping them")


def merge_notes(record, path):
    if "remarks" in record:
        notes = string(record.pop("remarks"), f"{path}.remarks")
        if notes:
            record["description"] += ("\n" if record["description"] else "") + notes
            if len(record["description"]) > 32767:
                raise PlanError(f"{path}: combined description exceeds Excel's cell text limit")


def normalize_plan(source):
    if not isinstance(source, dict):
        raise PlanError("root: expected an object")
    allowed_keys(source, {"meta", "user_id_sheet", "events", "common_event_properties", "user_properties"}, "root")
    plan = deepcopy(source)
    meta = plan.setdefault("meta", {})
    if not isinstance(meta, dict):
        raise PlanError("meta: expected an object")
    meta["xlsx_language"] = "zh"
    for key in ("user_id_sheet", "events", "common_event_properties", "user_properties"):
        if key not in plan:
            raise PlanError(f"{key}: required array (may be empty except events)")
        records(plan[key], key)
    if not plan["events"]:
        raise PlanError("events: an empty tracking plan is not a deliverable")

    def prop(record, path, user=False):
        allowed_keys(record, {"property_name", "display_name", "property_type", "description", "remarks"} | ({"update_method"} if user else set()), path)
        named(record, "property_name", path, True)
        for key in ("display_name", "description"):
            record[key] = string(record.get(key), f"{path}.{key}", True)
        merge_notes(record, path)
        try:
            record["property_type"] = normalize_property_type(record.get("property_type"))
        except ValueError as exc:
            raise PlanError(f"{path}.property_type: {exc}") from exc
        if user:
            try:
                record["update_method"] = normalize_update_method(record.get("update_method"))
            except ValueError as exc:
                raise PlanError(f"{path}.update_method: {exc}") from exc
            if record["update_method"] not in PLAN_UPDATE_METHODS:
                raise PlanError(f"{path}.update_method: timing is not a plan update operation; confirm one of {sorted(PLAN_UPDATE_METHODS)}")
            if record["update_method"] == "user_add" and record["property_type"] != "数值":
                raise PlanError(f"{path}: user_add requires a numeric property")
            if record["update_method"] == "user_append" and record["property_type"] != "列表":
                raise PlanError(f"{path}: user_append requires a list property")

    for i, record in enumerate(plan["user_id_sheet"]):
        allowed_keys(record, {"product_type", "property_name", "display_name", "description", "assignment", "remarks"}, f"user_id_sheet[{i}]")
        for key in ("product_type", "property_name", "display_name", "description", "assignment", "remarks"):
            record[key] = string(record.get(key, ""), f"user_id_sheet[{i}].{key}", key in ("property_name", "display_name", "assignment"))
    seen_events = set()
    for i, event in enumerate(plan["events"]):
        path = f"events[{i}]"
        allowed_keys(event, {"event_name", "display_name", "description", "tag", "platform", "properties", "remarks"}, path)
        name = named(event, "event_name", path)
        if name in seen_events:
            raise PlanError(f"{path}: duplicate event {name}")
        seen_events.add(name)
        for key in ("display_name", "description"):
            event[key] = string(event.get(key), f"{path}.{key}", True)
        merge_notes(event, path)
        event["tag"] = string(event.get("tag", ""), f"{path}.tag")
        platform = string(event.get("platform", ""), f"{path}.platform").strip()
        platforms = {"": "", "C": "client", "S": "server", "client": "client", "server": "server", "both": "client,server", "S+C": "client,server", "C+S": "client,server", "client,server": "client,server"}
        if platform not in platforms:
            raise PlanError(f"{path}.platform: use client/server/both (legacy C/S accepted)")
        event["platform"] = platforms[platform]
        event.setdefault("properties", [])
        seen_props = set()
        for j, record in enumerate(records(event["properties"], f"{path}.properties")):
            prop(record, f"{path}.properties[{j}]")
            if record["property_name"] in seen_props:
                raise PlanError(f"{path}: duplicate property {record['property_name']}")
            seen_props.add(record["property_name"])
    for key in ("common_event_properties", "user_properties"):
        seen = set()
        for i, record in enumerate(plan[key]):
            prop(record, f"{key}[{i}]", key == "user_properties")
            if record["property_name"] in seen:
                raise PlanError(f"{key}: duplicate property {record['property_name']}")
            seen.add(record["property_name"])
    return plan


def data_rows(plan):
    """Canonical import rows, shared with round-trip verification."""
    rows = {key: [] for key in DATA_HEADERS}
    for p in plan["user_id_sheet"]:
        description = p["description"]
        if p.get("remarks"):
            description += ("\n" if description else "") + p["remarks"]
        rows["#用户ID体系"].append([p["product_type"], p["property_name"], p["display_name"], description, p["assignment"]])
    for event in plan["events"]:
        base = [event["event_name"], event["display_name"], event["description"], event["tag"], event["platform"]]
        for p in event["properties"] or [None]:
            rows["#事件数据"].append(base + ([p["property_name"], p["display_name"], p["property_type"], p["description"]] if p else ["", "", "", ""]))
    for p in plan["common_event_properties"]:
        rows["#公共事件属性"].append([p["property_name"], p["display_name"], p["property_type"], p["description"]])
    for p in plan["user_properties"]:
        rows["#用户数据"].append([p["property_name"], p["display_name"], p["property_type"], p["update_method"], p["description"]])
    return rows


def counts(plan):
    return {"events": len(plan["events"]), "event_property_rows": sum(len(e["properties"]) for e in plan["events"]), "event_properties_unique": len({p["property_name"] for e in plan["events"] for p in e["properties"]}), "common_event_properties": len(plan["common_event_properties"]), "user_properties": len(plan["user_properties"]), "id_rules": len(plan["user_id_sheet"])}


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode("utf-8")


def file_sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def ensure_new_path(path, protected=()):
    path = Path(path)
    resolved = path.resolve()
    if any(resolved == Path(p).resolve() for p in protected):
        raise PlanError(f"Output aliases a protected input: {path}")
    if path.exists() or path.is_symlink():
        raise PlanError(f"Refusing to overwrite existing output: {path}")
    return path
