#!/usr/bin/env python3
"""Fill the canonical 11-sheet template from one normalized plan.

Creates a NEW workbook only. Seven instruction sheets are preserved. Uses the
import-compatible nine-column event sheet, merged event columns A:E, and explicit
Chinese schema labels/types. Business text is not translated. This local step
is not remote validation or upload authorization.
"""
from __future__ import annotations

import argparse
from copy import copy
from io import BytesIO
import json
from pathlib import Path
import sys
import openpyxl
from openpyxl.comments import Comment
from openpyxl.styles import Font, Border, Side, Alignment

from plan_contract import (DATA_HEADERS, DEFAULT_TEMPLATE, INSTRUCTION_SHEETS,
    SHEET_NAMES, PlanError, normalize_plan, data_rows, counts, ensure_new_path, business_context_text)


def sheet_signature(ws):
    return {
        "cells": [(c.coordinate, c.value, c.data_type, str(c.font), str(c.fill),
                   str(c.border), str(c.alignment), str(c.protection),
                   c.number_format, (c.hyperlink.target if c.hyperlink else None),
                   (c.comment.text if c.comment else None))
                  for row in ws for c in row],
        "merges": sorted(map(str, ws.merged_cells.ranges)),
        "row_dimensions": [(k, str(v)) for k, v in ws.row_dimensions.items()],
        "column_dimensions": [(k, str(v)) for k, v in ws.column_dimensions.items()],
        "state": ws.sheet_state,
    }


def clear_data_rows(ws, width):
    styles = [copy(ws.cell(2, col)._style) for col in range(1, width + 1)]
    for merged in list(ws.merged_cells.ranges):
        if merged.min_row <= 1:
            raise PlanError(f"{ws.title}: data headers must not be merged")
        ws.unmerge_cells(str(merged))
    if ws.max_row > 1:
        ws.delete_rows(2, ws.max_row - 1)
    return styles


def style_body_cell(cell, styles, index):
    if styles[index] is not None:
        cell._style = copy(styles[index])
    else:
        cell.font = Font(name="Calibri", size=10)
        cell.border = Border(*(Side(style="thin") for _ in range(4)))
        cell.alignment = Alignment(vertical="center", wrap_text=True)


def verify_round_trip(wb, plan):
    expected = data_rows(plan)
    context = wb["#事件数据"]["A1"].comment
    if context is None or context.text != business_context_text(plan):
        raise PlanError("Workbook business context comment diverges from source")
    for name, headers in DATA_HEADERS.items():
        ws = wb[name]
        if [ws.cell(1, c).value for c in range(1, len(headers)+1)] != headers:
            raise PlanError(f"{name}: header drift")
        actual = []
        inherited = [""] * 5
        for row_index in range(2, ws.max_row+1):
            values = [ws.cell(row_index, c).value for c in range(1, len(headers)+1)]
            if not any(v is not None and v != "" for v in values):
                continue
            if name == "#事件数据":
                if values[0] not in (None, ""):
                    inherited = values[:5]
                else:
                    for column, supplied in enumerate(values[:5]):
                        expected_value = inherited[column]
                        if supplied not in (None, "") and supplied != expected_value:
                            raise PlanError(f"{name}: conflicting event metadata on continuation row {row_index}, column {column+1}")
                    values[:5] = inherited
            if any(ws.cell(row_index, c).data_type == "f" for c in range(1,len(headers)+1)):
                raise PlanError(f"{name}: generated data must contain literal text, not formulas")
            actual.append(["" if v is None else v for v in values])
        if actual != expected[name]:
            raise PlanError(f"{name}: saved workbook diverges from the normalized source")
    return True


def create_workbook(plan, template=DEFAULT_TEMPLATE):
    plan = normalize_plan(plan)
    wb = openpyxl.load_workbook(template, data_only=False)
    if tuple(wb.sheetnames) != SHEET_NAMES:
        wb.close()
        raise PlanError("Template must have the canonical eleven sheets in order")
    before = {name: sheet_signature(wb[name]) for name in INSTRUCTION_SHEETS}
    for name, rows in data_rows(plan).items():
        ws = wb[name]
        headers = DATA_HEADERS[name]
        if [ws.cell(1,c).value for c in range(1,len(headers)+1)] != headers:
            wb.close()
            raise PlanError(f"{name}: template has outdated or unsupported headers; use the v2.0.1 template")
        styles = clear_data_rows(ws, len(headers))
        for r, values in enumerate(rows, 2):
            for c, value in enumerate(values, 1):
                cell = ws.cell(r,c)
                cell.value = value
                # Prevent formula injection without altering business strings or identifiers.
                cell.data_type = "s"
                style_body_cell(cell, styles, c-1)
    ws = wb["#事件数据"]
    ws["A1"].comment = Comment(business_context_text(plan), "Tracking plan context")
    start = 2
    for event in plan["events"]:
        n = max(1, len(event["properties"]))
        if n > 1:
            for col in range(1,6):
                ws.merge_cells(start_row=start, start_column=col, end_row=start+n-1, end_column=col)
        start += n
    if any(sheet_signature(wb[name]) != before[name] for name in INSTRUCTION_SHEETS):
        wb.close()
        raise PlanError("Instruction sheets changed during generation")
    verify_round_trip(wb, plan)
    return wb, plan, before


def write_finalized_plan(plan, output, template=DEFAULT_TEMPLATE, protected=()):
    output = ensure_new_path(output, (template, *protected))
    wb, normalized, before = create_workbook(plan, template)
    stream = BytesIO()
    wb.save(stream)
    wb.close()
    stream.seek(0)
    saved = openpyxl.load_workbook(stream, data_only=False)
    verify_round_trip(saved, normalized)
    if any(sheet_signature(saved[name]) != before[name] for name in INSTRUCTION_SHEETS):
        saved.close()
        raise PlanError("Instruction sheets changed after serialization")
    saved.close()
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("xb") as f:
        f.write(stream.getvalue())
    return normalized, counts(normalized)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--plan", required=True, help="Source plan JSON")
    ap.add_argument("--template", default=str(DEFAULT_TEMPLATE))
    ap.add_argument("--output", required=True, help="NEW XLSX output; never replaces an input or existing file")
    args = ap.parse_args(argv)
    try:
        with open(args.plan, encoding="utf-8") as f:
            plan = json.load(f)
        _, metrics = write_finalized_plan(plan, args.output, args.template, (args.plan,))
        print(json.dumps({"ok":True,"output":str(args.output),"sheets":11,"counts":metrics,
                          "status":"generated_not_yet_validated_for_upload"}, ensure_ascii=False))
        return 0
    except (PlanError, ValueError, OSError, KeyError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
