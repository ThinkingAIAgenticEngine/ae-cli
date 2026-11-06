#!/usr/bin/env python3
"""Compatibility CLI for the single, canonical 11-sheet exporter.

The old handwritten four-sheet exporter is retired. Both commands now use the
same template, normalizer and round-trip checks. --force is intentionally not
supported: existing plans and files are never silently replaced.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import sys
from finalize_plan import write_finalized_plan
from plan_contract import DEFAULT_TEMPLATE, PlanError, ensure_new_path, json_bytes

EXAMPLE_PAYLOAD = {
    "meta": {"product_name": "Synthetic tracking example", "reply_language": "en", "xlsx_language": "zh"},
    "user_id_sheet": [{"product_type":"Account-based", "property_name":"#account_id", "display_name":"Account ID", "description":"System identity", "assignment":"Authenticated account ID", "remarks":"Synthetic example, not customer data"}],
    "events": [{"event_name":"level_start", "display_name":"Level started", "description":"Triggered once when a player enters a level.", "tag":"Level", "platform":"client", "properties":[{"property_name":"level_id", "display_name":"Level ID", "property_type":"String", "description":"Stable level identifier"}, {"property_name":"attempt_number", "display_name":"Attempt number", "property_type":"Number", "description":"One-based attempt count"}]}],
    "common_event_properties": [],
    "user_properties": [{"property_name":"register_time", "display_name":"Registration time", "property_type":"DateTime", "update_method":"user_setOnce", "description":"Timestamp of the first successful account registration"}]
}


def main(argv=None):
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input")
    ap.add_argument("--output")
    ap.add_argument("--template", default=str(DEFAULT_TEMPLATE))
    ap.add_argument("--write-example", help="Write synthetic source JSON to a NEW path, without exporting")
    args=ap.parse_args(argv)
    try:
        if args.write_example:
            if args.input or args.output:
                raise PlanError("--write-example cannot be combined with --input/--output")
            p=ensure_new_path(args.write_example)
            p.parent.mkdir(parents=True,exist_ok=True)
            with p.open("xb") as f: f.write(json_bytes(EXAMPLE_PAYLOAD))
            print(f"Wrote synthetic example: {p}")
            return 0
        if not args.input or not args.output:
            raise PlanError("Both --input and --output are required")
        with open(args.input,encoding="utf-8") as f: source=json.load(f)
        _, metrics=write_finalized_plan(source,args.output,args.template,(args.input,))
        print(json.dumps({"ok":True,"output":args.output,"sheets":11,"counts":metrics,"status":"generated_not_yet_validated_for_upload"},ensure_ascii=False))
        return 0
    except (OSError,ValueError,KeyError) as exc:
        print(f"ERROR: {exc}",file=sys.stderr)
        return 1


if __name__=="__main__":
    raise SystemExit(main())
