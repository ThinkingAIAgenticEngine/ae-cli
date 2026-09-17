#!/usr/bin/env python3
"""Read saved CLI envelopes together; never query a service or infer formulas."""

import argparse
import json
from decimal import Decimal
from pathlib import Path


def encoded(value):
    return json.dumps(value, ensure_ascii=False, default=str, separators=(",", ":"))


def diagnostic(value, path, truncations):
    if isinstance(value, dict):
        return {key: diagnostic(item, path + "[" + encoded(key) + "]", truncations)
                for key, item in value.items()}
    if isinstance(value, list):
        if len(value) > 20:
            truncations.append({"path": path, "items_omitted": len(value) - 20})
        return [diagnostic(item, f"{path}[{index}]", truncations) for index, item in enumerate(value[:20])]
    if isinstance(value, str) and len(value) > 800:
        truncations.append({"path": path, "chars_omitted": len(value) - 800})
        return value[:800]
    return value


def structure(value):
    """Index actual paths and types, sampling arrays without guessing model keys."""
    entries = []

    def visit(node, path, depth):
        if len(entries) >= 64:
            return
        item = {"path": path, "type": type(node).__name__}
        if isinstance(node, (dict, list, str)):
            item["length"] = len(node)
        entries.append(item)
        if depth >= 3:
            return
        if isinstance(node, dict):
            for key in list(node)[:24]:
                visit(node[key], path + "[" + json.dumps(key) + "]", depth + 1)
        elif isinstance(node, list) and node:
            visit(node[0], path + "[0]", depth + 1)

    visit(value, "$.data", 0)
    return {"paths": entries, "sample_policy": "depth 3, first array item, 24 keys, 64 paths"}


def summarize(envelope, path, row_limit=40, column_limit=40):
    if not isinstance(envelope, dict) or type(envelope.get("ok")) is not bool:
        raise ValueError("Expected a CLI envelope with a boolean ok field")
    local_view = {"decimal_json_numbers": "strings; calculations use original files", "truncations": []}
    result = {"file": str(path), "ok": envelope["ok"], "local_view": local_view}
    for key in ("error", "meta", "_notice", "warnings"):
        if key in envelope:
            result[key] = diagnostic(envelope[key], "$[" + encoded(key) + "]", local_view["truncations"])
    data = envelope.get("data")
    if not isinstance(data, dict):
        if "data" in envelope:
            result["data"] = diagnostic(data, "$.data", local_view["truncations"])
            local_view["structure"] = structure(data)
        else:
            local_view["missing_fields"] = ["data"]
        return result
    scope_keys = (
        "request_id", "model_type", "status", "returned_rows", "has_more", "total",
        "complete", "effective_time_range", "data_time_range", "effective_zone_offset",
        "time_range_adjustments", "clipping_reasons", "actual_cluster_query_scope",
        "actual_slave_cluster_id", "cluster_query_scope_source", "warnings", "resolved",
    )
    projected = {key: diagnostic(data[key], "$.data[" + encoded(key) + "]", local_view["truncations"])
                 for key in scope_keys if key in data}
    result["data"] = projected
    rows = data.get("rows")
    if not isinstance(rows, list):
        local_view["structure"] = structure(data)
        local_view["omitted_data_keys"] = [key for key in data if key not in projected]
        return result
    projected["rows"] = []
    remaining = 14000
    for index, row in enumerate(rows[:row_limit]):
        shown = row[:column_limit] if isinstance(row, list) else row
        size = len(encoded(shown))
        if size > remaining:
            break
        if isinstance(row, list) and len(row) > column_limit:
            local_view["truncations"].append({"path": f"$.data.rows[{index}]", "items_omitted": len(row) - column_limit})
        projected["rows"].append(shown)
        remaining -= size
    local_view["rows_total"] = len(rows)
    local_view["rows_omitted"] = len(rows) - len(projected["rows"])
    for key, limit in (("title", column_limit), ("column_metadata", column_limit), ("row_metadata", len(projected["rows"]))):
        if key not in data:
            continue
        value = data[key]
        if isinstance(value, list):
            if len(value) > limit:
                local_view["truncations"].append({"path": "$.data." + key, "items_omitted": len(value) - limit})
            # Each descriptor keeps its original column or row index.
            projected[key] = [diagnostic(item, f"$.data.{key}[{index}]", local_view["truncations"])
                              for index, item in enumerate(value[:limit])]
        else:
            projected[key] = diagnostic(value, "$.data." + key, local_view["truncations"])
    local_view["missing_table_fields"] = [key for key in ("title", "row_metadata", "column_metadata") if key not in data]
    local_view["omitted_data_keys"] = [key for key in data if key not in projected]
    return result


def self_test():
    sample = {"ok": True, "data": {
        "title": ["Time", "Users", "Time", "Users"],
        "rows": [["Overview", "9", "Overview", "7"], ["day", "4", "day", "3"]],
        "row_metadata": [{"scope": "total", "period_values": ["dist"]}, {}],
        "column_metadata": [{}, {"metric": "users"}, {}, {"metric": "users"}],
        "has_more": False,
    }}
    value = summarize(sample, "one.json", 1)
    assert value["data"]["rows"][0][1] == sample["data"]["rows"][0][1]
    assert value["data"]["title"] == sample["data"]["title"]
    assert value["data"]["column_metadata"] == sample["data"]["column_metadata"]
    assert value["data"]["rows"][0][1::2] == ["9", "7"]
    assert value["data"]["row_metadata"][0]["scope"] == "total"
    assert value["local_view"]["rows_omitted"] == 1 and value["data"]["has_more"] is False
    cut = summarize(sample, "one.json", 1, 2)
    assert cut["data"]["rows"] == [["Overview", "9"]]
    assert len(cut["data"]["title"]) == len(cut["data"]["column_metadata"]) == 2
    assert len(cut["data"]["row_metadata"]) == 1
    assert {"path": "$.data.rows[0]", "items_omitted": 2} in cut["local_view"]["truncations"]
    graph = summarize({"ok": True, "data": {"result": {"vertices": [{"weight": 1}]}}}, "graph.json")
    assert any(item["path"] == '$.data["result"]["vertices"][0]' for item in graph["local_view"]["structure"]["paths"])
    assert graph["local_view"]["omitted_data_keys"] == ["result"]
    failure = summarize({"ok": False, "error": {"code": "QUERY_FAILED"}}, "failed.json")
    assert failure["ok"] is False and failure["error"]["code"] == "QUERY_FAILED"
    assert "data" not in failure and failure["local_view"]["missing_fields"] == ["data"]
    long_failure = summarize({"ok": False,
        "error": {"code": "QUERY_FAILED", "message": "x" * 6000, "retryable": False},
        "meta": {"partial": True, "request_id": "request-example", "message": "y" * 6000,
                 "failures": [{"request_id": "child-example", "retryable": True,
                               "error": {"code": "CHILD_FAILED", "message": "z" * 6000}}] * 25},
    }, "long-failure.json")
    assert long_failure["error"]["code"] == "QUERY_FAILED"
    assert isinstance(long_failure["error"]["message"], str) and len(long_failure["error"]["message"]) == 800
    assert long_failure["meta"]["partial"] is True
    assert long_failure["meta"]["request_id"] == "request-example"
    failures = long_failure["meta"]["failures"]
    assert failures[0]["error"]["code"] == "CHILD_FAILED" and failures[0]["retryable"] is True
    assert len(failures) == 20
    assert {"path": '$["meta"]["failures"]', "items_omitted": 5} in long_failure["local_view"]["truncations"]
    precise = json.loads('{"ok":true,"data":{"rows":[[1,0.10000000000000000001,"0.1",null]]}}', parse_float=Decimal)
    precise_view = json.loads(encoded(summarize(precise, "precise.json")), parse_float=Decimal)
    assert precise_view["data"]["rows"][0][0] == precise["data"]["rows"][0][0]
    assert precise_view["data"]["rows"][0][2:] == precise["data"]["rows"][0][2:]
    assert precise_view["data"]["rows"][0][1] == "0.10000000000000000001"
    assert precise_view["local_view"]["decimal_json_numbers"] == "strings; calculations use original files"
    assert precise_view["local_view"]["missing_table_fields"] == ["title", "row_metadata", "column_metadata"]
    assert "title" not in precise_view["data"]
    huge = summarize({"ok": True, "data": {"rows": [["x" * 20000]]}}, "huge.json")
    assert huge["local_view"]["rows_omitted"] == 1 and huge["data"]["rows"] == []
    assert len(encoded(huge)) < 1000
    print("read_results self-check passed")


def reject_constant(value):
    raise ValueError("Invalid JSON numeric constant: " + value)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("files", nargs="*", type=Path)
    parser.add_argument("--rows", type=int, default=40, help="Maximum rows shown per file (default: 40)")
    parser.add_argument("--columns", type=int, default=40, help="Maximum columns shown (default: 40)")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    if not args.files or not 1 <= args.rows <= 1000 or not 1 <= args.columns <= 100:
        parser.error("Provide saved files, --rows in 1..1000 and --columns in 1..100")
    results = []
    failed = False
    for path in args.files:
        try:
            # ponytail: envelopes load one at a time; use an export reader for large artifacts.
            with path.open(encoding="utf-8") as source:
                envelope = json.load(source, parse_float=Decimal, parse_constant=reject_constant)
            results.append(summarize(envelope, path, args.rows, args.columns))
        except (OSError, ValueError) as error:
            failed = True
            results.append({"file": str(path), "read_error": str(error)})
    print(encoded({"results": results}))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
