#!/usr/bin/env python3
"""Local tracking-plan checks; never upload or overwrite an input workbook.

Check:  --input plan.xlsx [--strict-delivery --template template.xlsx]
Fix:    --input plan.xlsx --fix --output NEW.xlsx

Fixes are limited to lossless enum normalization. Names, display languages,
reserved # properties, conflicting definitions and missing data require review.
A nonzero exit status means validation failed, including after a partial fix.
"""

import argparse
from collections import Counter, defaultdict
from copy import copy
from pathlib import Path
import os
import re
import sys

import openpyxl
from openpyxl.xml.functions import tostring

try:  # Both `python scripts/lint_tracking_plan.py` and package imports work.
    from .plan_types import (
        VALID_PROP_TYPES, VALID_UPDATE_METHODS, CANONICAL_UPDATE_METHODS,
        normalize_property_type, normalize_update_method,
    )
except ImportError:
    from plan_types import (
        VALID_PROP_TYPES, VALID_UPDATE_METHODS, CANONICAL_UPDATE_METHODS,
        normalize_property_type, normalize_update_method,
    )

SHEET_EVENT = "#事件数据"
SHEET_COMMON = "#公共事件属性"
SHEET_USER = "#用户数据"
SHEET_USER_ID = "#用户ID体系"
DATA_SHEETS = (SHEET_USER_ID, SHEET_EVENT, SHEET_COMMON, SHEET_USER)
DELIVERY_SHEETS = (
    "接入必知", "埋点注意事项", SHEET_USER_ID, SHEET_EVENT, SHEET_COMMON,
    SHEET_USER, "数据类型设计原则", "公共事件属性设置方式", "多端接入注意点",
    "多用户ID体系的埋点建议", "ID体系常见疑问",
)
INSTRUCTION_SHEETS = tuple(s for s in DELIVERY_SHEETS if s not in DATA_SHEETS)
DEFAULT_TEMPLATE = Path(__file__).resolve().parents[1] / "assets" / "埋点模版.xlsx"

EVENT_COLS = dict(event_name=0, event_display=1, event_desc=2, event_tag=3,
                  prop_name=4, prop_display=5, prop_type=6, prop_desc=7)
COMMON_COLS = dict(prop_name=0, prop_display=1, prop_type=2, prop_desc=3)
USER_COLS = dict(prop_name=0, prop_display=1, prop_type=2,
                 update_method=3, prop_desc=4)
HEADERS = {
    SHEET_USER_ID: ("游戏类型", "属性名", "属性显示名", "属性说明", "赋值说明"),
    SHEET_EVENT: ("事件名", "事件显示名", "事件说明", "事件标签", "属性名",
                  "属性显示名", "属性类型", "属性说明"),
    SHEET_COMMON: ("属性名", "属性显示名", "属性类型", "属性说明"),
    SHEET_USER: ("属性名", "属性显示名", "属性类型", "更新方式", "属性说明"),
}
# Each component of an object subpath must be a valid custom identifier.
LEGAL_PROP_NAME_RE = re.compile(r"[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)*\Z")
LEGAL_EVENT_NAME_RE = re.compile(r"[A-Za-z][A-Za-z0-9_]{0,49}\Z")
OBJECT_GROUP_TYPES = frozenset({"对象组"})
COMPLEX_TYPES = frozenset({"对象", "对象组"})


class LintError:
    def __init__(self, code, sheet, row, field, message, prop_name=None, value=None):
        self.code, self.sheet, self.row = code, sheet, row
        self.field, self.message = field, message
        self.prop_name, self.value = prop_name, value

    def __repr__(self):
        return f"{self.code} {self.sheet}，第{self.row}行：{self.message}"

    def to_dict(self):
        return dict(vars(self))


class FixAction:
    def __init__(self, sheet, row, col, field, old_value, new_value, reason):
        self.sheet, self.row, self.col = sheet, row, col
        self.field, self.old_value = field, old_value
        self.new_value, self.reason = new_value, reason

    def __repr__(self):
        return (f"Fix: {self.sheet} Row {self.row} {self.field}: "
                f"{self.old_value!r} → {self.new_value!r} ({self.reason})")

    def to_dict(self):
        return dict(vars(self))


def get_cell(ws, row, col_idx):
    value = ws.cell(row=row, column=col_idx + 1).value
    if isinstance(value, str):
        return value.strip() or None
    return value


def _is_text(value):
    return isinstance(value, str) and bool(value.strip())


def _valid_prop_name(value):
    return (isinstance(value, str) and len(value) <= 50
            and LEGAL_PROP_NAME_RE.fullmatch(value) is not None)


def _type_or_none(value):
    try:
        return normalize_property_type(value)
    except ValueError:
        return None


def _error(errors, code, ws, row, field, message, prop=None, value=None):
    errors.append(LintError(code, ws.title, row, field, message, prop, value))


def _row_has_data(ws, row, first, last):
    return any(get_cell(ws, row, i) is not None for i in range(first, last))


def event_columns(ws):
    """Bind legacy 8-column and current 9-column schemas by the actual header."""
    if get_cell(ws, 1, 4) == "采集端":
        return dict(event_name=0, event_display=1, event_desc=2, event_tag=3,
                    platform=4, prop_name=5, prop_display=6, prop_type=7, prop_desc=8)
    return EVENT_COLS.copy()


def find_event_for_row(ws, row):
    for r in range(row, 1, -1):
        value = get_cell(ws, r, EVENT_COLS["event_name"])
        if value is not None:
            return value
    return None


def get_event_blocks(ws):
    """Return event blocks without treating a child row as a new event."""
    blocks = []
    current = None
    cols = event_columns(ws)
    for row in range(2, ws.max_row + 1):
        name = get_cell(ws, row, 0)
        if name is not None:
            current = (name, get_cell(ws, row, 1), row, [])
            blocks.append(current)
        prop = get_cell(ws, row, cols["prop_name"])
        if prop is not None and current is not None:
            current[3].append((row, prop, get_cell(ws, row, cols["prop_display"]),
                               get_cell(ws, row, cols["prop_type"]),
                               get_cell(ws, row, cols["prop_desc"])))
    return blocks


def _lint_properties(ws, cols, *, event=False, user=False):
    errors, records = [], []
    scope = None if event else ws.title
    for row in range(2, ws.max_row + 1):
        if event and get_cell(ws, row, 0) is not None:
            scope = row  # Do not merge distinct blocks with duplicate names.
        pn = get_cell(ws, row, cols["prop_name"])
        pd = get_cell(ws, row, cols["prop_display"])
        raw_type = get_cell(ws, row, cols["prop_type"])
        if pn is None:
            if _row_has_data(ws, row, cols["prop_name"], len(cols)):
                _error(errors, "E08", ws, row, "属性名", "属性行缺少属性名")
            continue
        raw_name = ws.cell(row, cols["prop_name"] + 1).value
        if not _valid_prop_name(raw_name):
            message = f"属性名或对象子路径不合法 {raw_name!r}"
            if isinstance(pn, str) and pn.startswith("#"):
                message += "；保留系统属性标识，请人工确认，不能改成自定义属性"
            _error(errors, "E01", ws, row, "属性名", message, pn, pn)
        if not _is_text(pd):
            _error(errors, "E08", ws, row, "属性显示名", "属性显示名缺失或不是文本", pn)
        canonical = _type_or_none(raw_type)
        if raw_type is None:
            _error(errors, "E08", ws, row, "属性类型", "属性类型为空", pn)
        elif canonical is None:
            _error(errors, "E09", ws, row, "属性类型", f"未知属性类型 {raw_type!r}", pn, raw_type)
        if event and scope is None:
            _error(errors, "E08", ws, row, "事件名", "属性行没有所属事件", pn)
        if user:
            method = get_cell(ws, row, cols["update_method"])
            try:
                normalize_update_method(method)
            except ValueError:
                _error(errors, "E08" if method is None else "E09", ws, row,
                       "更新方式", f"更新方式缺失或不合法 {method!r}", pn, method)
        if isinstance(pn, str):
            records.append((row, pn, pd, canonical, scope))

    by_name, by_display, by_scope = defaultdict(list), defaultdict(list), defaultdict(list)
    for record in records:
        row, pn, pd, pt, scope = record
        by_name[pn].append(record)
        if _is_text(pd):
            by_display[pd].append(record)
        by_scope[scope].append(record)
    for pn, group in by_name.items():
        mappings = {(pd, pt) for _, _, pd, pt, _ in group if _is_text(pd) and pt}
        if len(mappings) > 1:
            for row, _, _, _, _ in group:
                _error(errors, "E06" if user else "E03", ws, row,
                       "属性显示名/类型", f"属性 {pn} 的显示名/类型不一致", pn)
    for pd, group in by_display.items():
        if len({rec[1] for rec in group}) > 1:
            for row, pn, _, _, _ in group:
                _error(errors, "E06" if user else "E04", ws, row,
                       "属性显示名", f"不同属性共用显示名 {pd!r}", pn, pd)
    for group in by_scope.values():
        counts = Counter(rec[1] for rec in group)
        types = {rec[1]: rec[3] for rec in group}
        for row, pn, _, pt, _ in group:
            if counts[pn] > 1:
                _error(errors, "E10", ws, row, "属性重复", f"属性 {pn} 重复", pn)
            if pt in COMPLEX_TYPES and not any(
                    "." in name and name.rsplit(".", 1)[0] == pn for name in types):
                _error(errors, "E05", ws, row, "复杂属性子属性",
                       f"{pt}属性 {pn} 没有子属性", pn, pt)
            if "." in pn and _valid_prop_name(pn):
                parent = pn.rsplit(".", 1)[0]
                if types.get(parent) not in COMPLEX_TYPES:
                    _error(errors, "E05", ws, row, "复杂属性父路径",
                           f"子属性 {pn} 缺少对象/对象组父属性 {parent}", pn)
    if event:
        errors.extend(_lint_event_object_schemas(ws, by_scope))
    return errors


def _lint_event_object_schemas(ws, by_scope):
    """Compare direct-child (name, canonical type) schemas by full parent path.

    Only occurrences of the same parent in different event blocks are compared.
    Nested parents are checked separately, never by just their leaf name; a
    different business object is not required to have the same child schema.
    """
    schemas = defaultdict(list)
    for scope, records in by_scope.items():
        if scope is None:
            continue  # Orphan rows already fail E08.
        children = defaultdict(set)
        for _, name, _, ptype, _ in records:
            if _valid_prop_name(name) and "." in name:
                parent, child = name.rsplit(".", 1)
                children[parent].add((child, ptype))
        for row, name, _, ptype, _ in records:
            if _valid_prop_name(name) and ptype in COMPLEX_TYPES:
                schemas[name].append((row, scope, frozenset(children[name])))
    errors = []
    for parent, occurrences in schemas.items():
        if (len({scope for _, scope, _ in occurrences}) < 2
                or len({schema for _, _, schema in occurrences}) < 2):
            continue
        for row, _, schema in occurrences:
            detail = sorted(schema, key=lambda pair: (pair[0], str(pair[1])))
            _error(errors, "E05", ws, row, "复杂属性跨事件子结构",
                   f"同名复杂属性 {parent} 跨事件的直接子属性名/类型不一致；"
                   f"本事件子结构为 {detail!r}", parent)
    return errors


def lint_event_sheet(ws):
    errors = _lint_properties(ws, event_columns(ws), event=True)
    names, displays = defaultdict(list), defaultdict(list)
    for row in range(2, ws.max_row + 1):
        name, display = get_cell(ws, row, 0), get_cell(ws, row, 1)
        if name is not None:
            raw_name = ws.cell(row, 1).value
            if not isinstance(raw_name, str) or not LEGAL_EVENT_NAME_RE.fullmatch(raw_name):
                _error(errors, "E02", ws, row, "事件名", f"事件名不合法 {raw_name!r}", name, raw_name)
            names[str(name)].append(row)
            if not _is_text(display):
                _error(errors, "E08", ws, row, "事件显示名", "事件显示名缺失或不是文本")
        elif _row_has_data(ws, row, 0, 4) and find_event_for_row(ws, row) is None:
            _error(errors, "E08", ws, row, "事件名", "事件信息没有事件名")
        if _is_text(display):
            displays[display].append(row)
    if not names:
        _error(errors, "E08", ws, 0, "事件名", "空方案：至少需要一个事件")
    for field, mapping in (("事件名", names), ("事件显示名", displays)):
        for name, rows in mapping.items():
            if len(rows) > 1:
                for row in rows:
                    _error(errors, "E07", ws, row, field, f"{field}重复 {name!r}", value=name)
    return errors


def lint_common_sheet(ws):
    return _lint_properties(ws, COMMON_COLS)


def lint_user_sheet(ws):
    return _lint_properties(ws, USER_COLS, user=True)


def lint_user_id_sheet(ws):
    """Validate populated identity rows; header-only is officially supported."""
    errors = []
    for row in range(2, ws.max_row + 1):
        if not _row_has_data(ws, row, 0, 5):
            continue
        name, display = get_cell(ws, row, 1), get_cell(ws, row, 2)
        if not _is_text(name):
            _error(errors, "E08", ws, row, "属性名", "用户ID行缺少属性名")
        if not _is_text(display):
            _error(errors, "E08", ws, row, "属性显示名", "用户ID行缺少属性显示名")
    return errors


def lint_cross_sheet(ws_event, ws_common):
    errors = []
    def collect(ws, cols):
        records = []
        for row in range(2, ws.max_row + 1):
            pn = get_cell(ws, row, cols["prop_name"])
            if isinstance(pn, str):
                records.append((row, pn, get_cell(ws, row, cols["prop_display"]),
                                _type_or_none(get_cell(ws, row, cols["prop_type"]))))
        return records
    event = collect(ws_event, event_columns(ws_event))
    common = collect(ws_common, COMMON_COLS)
    common_by_name = {pn: (pd, pt) for _, pn, pd, pt in common}
    for row, pn, pd, pt in event:
        if pn in common_by_name:
            _error(errors, "E10", ws_event, row, "属性重复", f"属性 {pn} 与公共事件属性重复", pn)
            if common_by_name[pn] != (pd, pt):
                _error(errors, "E03", ws_event, row, "跨表属性映射", f"属性 {pn} 跨表定义不一致", pn)
    display_names = defaultdict(set)
    for _, pn, pd, _ in event:
        if _is_text(pd):
            display_names[pd].add(pn)
    for row, pn, pd, _ in common:
        if _is_text(pd) and display_names[pd] - {pn}:
            _error(errors, "E04", ws_common, row, "属性显示名", f"跨表显示名重复 {pd!r}", pn, pd)
    return errors


def lint_structure(wb):
    errors = []
    for name, expected in HEADERS.items():
        if name not in wb.sheetnames:
            errors.append(LintError("E11", name, 0, "Sheet", f"缺少必要数据 Sheet {name}"))
            continue
        ws = wb[name]
        if name == SHEET_EVENT and "platform" in event_columns(ws):
            expected = expected[:4] + ("采集端",) + expected[4:]
        for col, label in enumerate(expected):
            value = get_cell(ws, 1, col)
            if isinstance(value, str):
                value = re.sub(r"[（(]必填[）)]$", "", value).strip()
            if value != label:
                _error(errors, "E11", ws, 1, "表头",
                       f"第{col + 1}列表头应为 {label!r}，实际 {value!r}", value=value)
    return errors


def _style_signature(obj):
    # Compare effective styles, not workbook-local style IDs.
    return (copy(obj.font), copy(obj.fill), copy(obj.border), copy(obj.alignment),
            obj.number_format, copy(obj.protection), obj.quotePrefix, obj.pivotButton)


def _xml(obj):
    return None if obj is None else tostring(obj.to_tree())


def _sheet_format_signature(ws):
    # Excel/openpyxl may materialize omitted outline defaults as explicit 0
    # during an otherwise lossless save. Compare their effective values.
    fmt = copy(ws.sheet_format)
    fmt.outlineLevelCol = fmt.outlineLevelCol or 0
    fmt.outlineLevelRow = fmt.outlineLevelRow or 0
    return _xml(fmt)


def _dimension_signature(dim):
    attrs = dict(dim)
    attrs.pop("s", None)
    attrs.pop("style", None)
    return (attrs, _style_signature(dim))


def instruction_sheet_signature(ws):
    """Snapshot values and effective formatting, including styled blank cells."""
    cells = []
    for row in ws.iter_rows():
        for cell in row:
            if cell.value is None and not cell.has_style and not cell.comment and not cell.hyperlink:
                continue
            comment = (cell.comment.text, cell.comment.author) if cell.comment else None
            link = None if not cell.hyperlink else (
                cell.hyperlink.target, cell.hyperlink.location,
                cell.hyperlink.tooltip, cell.hyperlink.display,
            )
            cells.append((cell.coordinate, cell.value, cell.data_type,
                          _style_signature(cell), comment, link))
    conditional = []
    for key, rules in ws.conditional_formatting._cf_rules.items():
        for rule in rules:
            effective_rule = copy(rule)
            effective_rule.dxfId = None  # Compare the style, not its local ID.
            conditional.append((_xml(effective_rule), _xml(rule.dxf), str(key.sqref)))
    return (
        cells, sorted(str(r) for r in ws.merged_cells.ranges),
        {key: _dimension_signature(dim) for key, dim in ws.row_dimensions.items()},
        {key: _dimension_signature(dim) for key, dim in ws.column_dimensions.items()},
        ws.sheet_state, ws.freeze_panes,
        (_sheet_format_signature(ws),) + tuple(_xml(obj) for obj in (
            ws.sheet_properties, ws.views, ws.auto_filter, ws.protection,
            ws.page_margins, ws.page_setup, ws.print_options, ws.data_validations)),
        str(ws.print_area), str(ws.print_title_rows), str(ws.print_title_cols), conditional,
    )


def _strict_header_errors(wb):
    errors = []
    required = {
        SHEET_EVENT: {0: "事件名（必填）", 4: "采集端", 5: "属性名（必填）", 7: "属性类型（必填）"},
        SHEET_COMMON: {0: "属性名（必填）", 2: "属性类型（必填）"},
        SHEET_USER: {0: "属性名（必填）", 2: "属性类型（必填）"},
    }
    for name, cells in required.items():
        if name not in wb.sheetnames:
            continue
        for col, label in cells.items():
            if wb[name].cell(1, col + 1).value != label:
                _error(errors, "E12", wb[name], 1, "上传表头",
                       f"严格交付第{col + 1}列表头必须是 {label!r}")
    return errors


def _strict_import_errors(wb):
    errors = []
    for name, default_cols in ((SHEET_EVENT, EVENT_COLS), (SHEET_COMMON, COMMON_COLS),
                               (SHEET_USER, USER_COLS)):
        if name not in wb.sheetnames:
            continue
        ws = wb[name]
        cols = event_columns(ws) if name == SHEET_EVENT else default_cols
        for row in range(2, ws.max_row + 1):
            if get_cell(ws, row, cols["prop_name"]) is None:
                continue
            raw_type = ws.cell(row, cols["prop_type"] + 1).value
            if not isinstance(raw_type, str) or raw_type not in VALID_PROP_TYPES:
                _error(errors, "E14", ws, row, "上传属性类型",
                       f"严格交付属性类型必须是中文canonical值，实际 {raw_type!r}；"
                       "已知别名需先使用 --fix --output NEW.xlsx 标准化并复验",
                       get_cell(ws, row, cols["prop_name"]), raw_type)
    if SHEET_USER in wb.sheetnames:
        ws = wb[SHEET_USER]
        for row in range(2, ws.max_row + 1):
            if get_cell(ws, row, 0) is not None:
                method = get_cell(ws, row, USER_COLS["update_method"])
                if method not in CANONICAL_UPDATE_METHODS:
                    _error(errors, "E14", ws, row, "更新方式",
                           f"严格交付要求4种canonical API更新操作；{method!r} 需业务确认，禁止自动替换")
                required_type = {"user_add": "数值", "user_append": "列表"}.get(method)
                actual_type = _type_or_none(get_cell(ws, row, USER_COLS["prop_type"]))
                if required_type is not None and actual_type != required_type:
                    _error(errors, "E14", ws, row, "更新方式/属性类型",
                           f"{method} 只适用于{required_type}属性，实际类型 {actual_type!r}；"
                           "需业务确认，禁止自动替换操作或类型", get_cell(ws, row, 0))
    if SHEET_EVENT in wb.sheetnames:
        ws = wb[SHEET_EVENT]
        cols = event_columns(ws)
        if "platform" in cols:
            for row in range(2, ws.max_row + 1):
                platform = get_cell(ws, row, cols["platform"])
                if platform not in (None, "client", "server", "client,server"):
                    _error(errors, "E14", ws, row, "采集端", f"未知采集端 {platform!r}")
        for _, _, start, props in get_event_blocks(ws):
            last = max([start] + [prop[0] for prop in props])
            if last <= start:
                continue
            for col in range(1, 6):
                if not any(r.min_col == col == r.max_col and r.min_row == start
                           and r.max_row == last for r in ws.merged_cells.ranges):
                    _error(errors, "E14", ws, start, "事件合并单元格",
                           f"多行事件第{col}列必须合并第{start}至{last}行，避免上传重复事件")
    return errors


def lint_strict_delivery(wb, template_wb):
    errors = []
    expected = list(DELIVERY_SHEETS)
    if (template_wb.sheetnames != expected or lint_structure(template_wb)
            or _strict_header_errors(template_wb)):
        return [LintError("E12", "模板", 0, "Sheet/表头", "模板不是当前规范中文11表/9列事件结构")]
    errors.extend(_strict_header_errors(wb))
    errors.extend(_strict_import_errors(wb))
    for name in DATA_SHEETS:
        if name not in wb.sheetnames:
            continue
        actual = tuple((cell.column, cell.value) for cell in wb[name][1] if cell.value is not None)
        reference = tuple((cell.column, cell.value) for cell in template_wb[name][1] if cell.value is not None)
        if actual != reference:
            errors.append(LintError("E12", name, 1, "表头", "严格交付数据表头必须与参考模板完全一致"))
    if wb.sheetnames != expected:
        errors.append(LintError("E12", "工作簿", 0, "Sheet",
                                "strict-delivery 要求规范11表及原始顺序，不得缺少/增加/改名"))
    for name in INSTRUCTION_SHEETS:
        if name not in wb.sheetnames:
            continue  # Missing sheets are reported by E12.
        if instruction_sheet_signature(wb[name]) != instruction_sheet_signature(template_wb[name]):
            errors.append(LintError("E13", name, 0, "说明表值/样式", "说明 Sheet 值或样式与模板不一致"))
    # Theme colors/fonts affect visual styles even if cell style references match.
    if wb.loaded_theme != template_wb.loaded_theme or wb._colors != template_wb._colors:
        errors.append(LintError("E13", "工作簿", 0, "主题", "工作簿主题/颜色与模板不一致"))
    return errors


def lint_workbook(wb, *, strict_delivery=False, template_wb=None):
    """Return all errors without saving or changing cell values."""
    errors = lint_structure(wb)
    bad_sheets = {err.sheet for err in errors}
    validators = {SHEET_EVENT: lint_event_sheet, SHEET_COMMON: lint_common_sheet,
                  SHEET_USER: lint_user_sheet, SHEET_USER_ID: lint_user_id_sheet}
    for name, validator in validators.items():
        if name in wb.sheetnames and name not in bad_sheets:
            errors.extend(validator(wb[name]))
    if all(name in wb.sheetnames and name not in bad_sheets for name in (SHEET_EVENT, SHEET_COMMON)):
        errors.extend(lint_cross_sheet(wb[SHEET_EVENT], wb[SHEET_COMMON]))
    if strict_delivery:
        if template_wb is None:
            errors.append(LintError("E12", "模板", 0, "模板", "strict-delivery 缺少可读取模板"))
        else:
            errors.extend(lint_strict_delivery(wb, template_wb))
    return errors


def fix_errors(wb, errors):
    """Propose only safe alias normalization, even if aliases already validate.

    Never invent names, translate display labels, strip '#', collapse object
    types, erase duplicates, choose a conflicting mapping or guess missing data.
    """
    fixes = []
    for name, cols in ((SHEET_EVENT, EVENT_COLS), (SHEET_COMMON, COMMON_COLS), (SHEET_USER, USER_COLS)):
        if name not in wb.sheetnames:
            continue
        ws = wb[name]
        if name == SHEET_EVENT:
            cols = event_columns(ws)
        for row in range(2, ws.max_row + 1):
            if get_cell(ws, row, cols["prop_name"]) is None:
                continue
            fields = [("prop_type", "属性类型", normalize_property_type)]
            if name == SHEET_USER:
                fields.append(("update_method", "更新方式", normalize_update_method))
            for key, label, normalize in fields:
                value = ws.cell(row, cols[key] + 1).value
                try:
                    new_value = normalize(value)
                except ValueError:
                    continue
                if value != new_value:
                    fixes.append(FixAction(name, row, cols[key], label, value,
                                           new_value, "无语义变化的枚举标准化"))
    return fixes


def apply_fixes(wb, fixes):
    for fix in fixes:
        wb[fix.sheet].cell(fix.row, fix.col + 1).value = fix.new_value
    return len(fixes)


def _validate_paths(filepath, fix, output):
    source = Path(filepath).expanduser().resolve(strict=True)
    if not source.is_file() or source.suffix.lower() != ".xlsx":
        raise ValueError("输入必须是本地 .xlsx 文件")
    if not fix:
        if output is not None:
            raise ValueError("--output 只能与 --fix 一起使用")
        return source, None
    if output is None:
        raise ValueError("--fix 必须显式提供 --output NEW.xlsx；禁止覆盖原件")
    target = Path(output).expanduser()
    resolved = target.resolve(strict=False)
    if resolved == source:
        raise ValueError("--output 与输入是同一路径或路径别名；禁止覆盖原件")
    # lexists also catches dangling symlinks; xb below guards creation races.
    if os.path.lexists(target):
        raise ValueError("--output 已存在；禁止覆盖任何现有目标")
    if target.suffix.lower() != ".xlsx" or not resolved.parent.is_dir():
        raise ValueError("--output 必须是已存在目录中的全新 .xlsx 路径")
    return source, resolved


def _print_errors(errors):
    print(f"校验失败：{len(errors)} 个错误。")
    for error in sorted(errors, key=lambda e: (e.sheet, e.row, e.code)):
        print(f"  {error}")


def lint(filepath, fix=False, backup_dir=None, *, output=None,
         strict_delivery=False, template=None):
    """Local file entry point. Return 0 only when all checks pass; otherwise 1.

    backup_dir is retained solely to reject obsolete in-place-fix callers.
    Normal checks open the source read-only at the OS level and never save it.
    """
    wb = template_wb = reopened = None
    try:
        if backup_dir is not None:
            raise ValueError("不再支持 --backup-dir 原位修复；请使用 --fix --output NEW.xlsx")
        source, target = _validate_paths(filepath, fix, output)
        wb = openpyxl.load_workbook(source, data_only=False)
        if strict_delivery:
            template_path = Path(template).expanduser() if template else DEFAULT_TEMPLATE
            template_wb = openpyxl.load_workbook(template_path, data_only=False)
        elif template is not None:
            raise ValueError("--template 只能与 --strict-delivery 一起使用")
        errors = lint_workbook(wb, strict_delivery=strict_delivery, template_wb=template_wb)
        if not fix:
            if errors:
                _print_errors(errors)
                return 1
            print("校验通过，未发现错误（只读检查，原件未修改）。")
            return 0
        # A malformed layout cannot safely identify editable data cells.
        if any(error.code in {"E11", "E12", "E13"} for error in errors):
            _print_errors(errors)
            print("结构/交付校验失败，不生成修复文件。")
            return 1
        fixes = fix_errors(wb, errors)
        for action in fixes:
            print(action)
        apply_fixes(wb, fixes)
        with target.open("xb") as stream:
            wb.save(stream)
        print(f"已另存候选修复文件：{target}（{len(fixes)} 处枚举标准化；尚待复验）")
        reopened = openpyxl.load_workbook(target, data_only=False)
        remaining = lint_workbook(reopened, strict_delivery=strict_delivery, template_wb=template_wb)
        if remaining:
            _print_errors(remaining)
            print("修复后仍有错误，候选文件未通过验收；请人工处理。")
            return 1
        print("修复文件复验通过，零错误；原件未修改。")
        return 0
    except Exception as exc:
        # Parsing/I/O errors must never fall through to a successful gate.
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    finally:
        for book in (wb, template_wb, reopened):
            if book is not None:
                book.close()


def main(argv=None):
    parser = argparse.ArgumentParser(description="埋点方案本地只读校验与安全另存修复")
    parser.add_argument("--input", required=True, help="本地埋点方案 .xlsx 文件")
    parser.add_argument("--fix", action="store_true", help="仅标准化明确类型别名，另存后复验")
    parser.add_argument("--output", help="修复输出：必须是不同路径且不存在的 NEW.xlsx")
    parser.add_argument("--strict-delivery", action="store_true", help="校验规范11表及7说明表值/样式不变")
    parser.add_argument("--template", help="严格交付参考模板，默认包内 assets/埋点模版.xlsx")
    args = parser.parse_args(argv)
    if args.fix and not args.output:
        parser.error("--fix 必须显式提供 --output NEW.xlsx")
    if args.output and not args.fix:
        parser.error("--output 必须与 --fix 一起使用")
    if args.template and not args.strict_delivery:
        parser.error("--template 必须与 --strict-delivery 一起使用")
    return lint(args.input, fix=args.fix, output=args.output,
                strict_delivery=args.strict_delivery, template=args.template)


if __name__ == "__main__":
    sys.exit(main())
