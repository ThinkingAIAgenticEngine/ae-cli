# Tracking Plan Linter

## Use This Skill When

- The user provides a tracking plan Excel file and asks to check for validation errors and fix them.
- The user mentions tracking errors, failed validation, property conflicts, duplicate display names, illegal property names, etc.
- The user says "help me fix the tracking plan", "this file has errors, help me fix them", or "validate the tracking plan".
- The user pastes an error message like `#事件数据, row XX: property type is empty`.
- The user pastes a validation error from the TE platform after upload.

## Directory Guide

- Main validation and repair script: `scripts/lint_tracking_plan.py`
- Naming dictionary (authoritative mapping of property name ↔ display name ↔ type): at `references/naming-dict.md` in this package.

## v2.0.1 Delivery Gate

Run read-only first: `python3 scripts/lint_tracking_plan.py --input ORIGINAL.xlsx --strict-delivery --template assets/埋点模版.xlsx`. Final delivery must match the repaired 11-sheet Chinese template: nine event columns with `采集端` at E, required-header suffixes, and seven unchanged instruction sheets. Missing/damaged required sheets block acceptance.

After a proposed diff and explicit confirmation only: `python3 scripts/lint_tracking_plan.py --input ORIGINAL.xlsx --fix --output NEW_FIXED.xlsx --strict-delivery --template assets/埋点模版.xlsx`. `--fix` requires a NEW output; never modify the original or overwrite an existing output. Then recheck the new file without `--fix`. Synchronize approved corrections to canonical JSON and regenerate the conversation view and workbook; record first-run and final results separately.

The [15 semantic checks](../business-semantic-checks.md) are manual/model-assisted, not automatic scoring. Machine lint does not prove remote import or business completeness. Any later upload goes through [Validated Upload](validated-upload.md), never automatic upload.

## Non-Negotiable Rules

1. **The event table and the common property table belong to one validation domain**: the property names, display names, and types in `#公共事件属性` and `#事件数据` must correspond one-to-one and must not conflict. Same-named properties must have the same display name + same type.
2. **The user table is validated independently**: `#用户数据` only needs internal self-consistency, and is not cross-validated with the event table.
3. **Property name legality**: event names start with a letter, may only contain letters/digits/underscores, and are ≤50 characters; property names start with a letter, may only contain letters/digits/underscores/dots (object group sub-properties), and are ≤50 characters. Property names starting with `#` are illegal.
4. **Display name uniqueness**: within the same validation domain, different property names cannot share the same display name.
5. **Must save as a NEW file after confirmation**: `--fix --output NEW_FIXED.xlsx`; never modify the original file even when a backup exists.
6. **Must show a change report before fixing**: first show the user all modifications (grouped by reason, in table form), and wait for the user's confirmation before modifying the file. Let the user judge whether each modification is correct.

## Workflow

### 1. Read the Excel

Use openpyxl to read the user-provided `.xlsx` file. Focus on 4 Sheets:
- `#用户ID体系`
- `#公共事件属性`
- `#事件数据`
- `#用户数据`

### 2. Run Validation

Call `scripts/lint_tracking_plan.py` to run the following 10 categories of validation (corresponding to TE platform upload validation rules):

| Code | Validation item | Corresponding platform error | Validation domain | Description |
|---|---|---|---|---|
| E01 | Property name legality | Invalid property name | Event + Common + User | Property name must start with a letter, contain only letters/digits/underscores/dots, ≤50 characters |
| E02 | Event name legality | Invalid event name | Event | Event name must start with a letter, contain only letters/digits/underscores, ≤50 characters |
| E03 | Property type has multiple values | Property {property name} has multiple | Event + Common | The same property name has inconsistent data types across different events |
| E04 | Duplicate property display name | Duplicate property display name | Event + Common (same domain) / User (independent domain) | Different property names share the same display name |
| E05 | Object group sub-property completeness | Complex event property has no sub-property | Event | A property of type "object group" must be immediately followed by sub-property rows |
| E06 | User data internal consistency | User property conflict | User | Property name → display name → type correspond one-to-one within the user table, and display names are unique |
| E07 | Duplicate event name / event display name | Duplicate event display name | Event | The same event name or event display name appears multiple times |
| E08 | Required field empty | {required field} is empty | All | Required fields such as property type and property display name cannot be empty |
| E09 | Enum field has non-enum value | {enum field} value error | All | The property type value must be within the legal enum range (text/number/boolean/datetime/object group/list) |
| E10 | Duplicate property | Property {property name} duplicated | All | Duplicate properties under the same event; common event properties duplicated with ordinary event properties; multiple identical user properties |

### 3. Show the Error Report

The output format aligns with the TE platform: `table name, row X: error reason`.

Report the script's actual severity, code, sheet and row. Unresolved structural/E01–E10 errors block acceptance, including E05 composite completeness and E06 user consistency; do not downgrade them to a pass or claim a particular remote error without evidence.

### 4. Auto-fix

For errors that can be auto-fixed, handle them with the following strategies:

#### E01: Invalid property name
- Property name starting with `#`: treat as a system/preset field, not a custom property. Review/remove an accidental custom-table row after confirmation; never strip `#` to manufacture a custom field.
- Contains illegal characters: prompt the user to handle manually

#### E03: Property type has multiple values
- Look up the standard mapping in `STANDARD_MAPPING`
- If a standard mapping exists, unify to the standard value
- If no standard mapping exists, use the most frequently occurring mapping as the standard

#### E04: Duplicate property display name
- Disambiguate per `DISPLAY_DISAMBIGUATION` and `STANDARD_MAPPING`
- Object group sub-properties: add the parent property name as prefix
- Ordinary properties: add a prefix based on the owning event/module

#### E08: Required field empty
- Use `STANDARD_MAPPING` to fill in missing display names and types

#### E09: Enum field has non-enum value
- Use shared `normalize_property_type` / `normalize_update_method` from `scripts/plan_types.py`. English/Chinese aliases normalize to template enum values; `Object` and `Object Group` remain distinct.

#### E10: Duplicate property
- Common event property duplicated with ordinary event property: clear the duplicate row in the event properties
- Duplicate property under the same event: prompt the user to deduplicate manually

### 5. Output the Change Report

Before fixing, you must show the user a structured change report, **and wait for the user's confirmation before modifying the file**. Report format:

```
── Unify property ad_id's display name to the standard mapping ──
  | Row | Sheet | Property name | Field | Before | After |
  |------|-------|--------|------|--------|--------|
  | 397 | #事件数据 | ad_id | property display name | ad id | Third-party Ad ID |

── Disambiguate: property get_item_info.item_id shares display name 'item id' ──
  | Row | Sheet | Property name | Field | Before | After |
  |------|-------|--------|------|--------|--------|
  | 66 | #事件数据 | get_item_info.item_id | property display name | item id | Obtained Item ID |
  | 74 | #事件数据 | get_item_info.item_id | property display name | item id | Obtained Item ID |
```

Group by modification reason, one table per group, for item-by-item review.

**Must tell the user**:
- Which modifications are auto-inferred (such as display name disambiguation), may have semantic deviation, and need the user to judge whether they are correct
- Which modifications use recognized aliases, and which require semantic approval; never treat removal of a system-field prefix as a safe custom-property repair
- If the user objects to a modification, they can adjust it individually and re-validate

### 6. Apply Fixes

1. After the user confirms the change report, preserve the original file unchanged.
2. Run the confirmed fixes with `--fix --output NEW_FIXED.xlsx`; a new output is mandatory.
3. Re-run strict validation read-only on the new file; retain any unresolved errors.
4. Output the actual first/final results and synchronize the canonical JSON with the conversation and selected Excel-branch artifacts. Do not create an Excel file for a direct-sync delivery.

### 7. Return the File

- Return the new fixed file and the before/after report; never overwrite the original path.
- An optional backup is extra protection, not authorization for in-place modification.

## Design Rules

### Legal property type enum values

Workbook types: `文本`, `数值`, `布尔`, `时间`, `对象`, `对象组`, `列表`; use the shared alias normalizer, not duplicated tables. Object and object group are distinct.

Plan update methods: `user_set`, `user_setOnce`, `user_add`, `user_append`. SDK `user_unset`, `user_del` and `user_uniq_append` must not be assumed import enums. Legacy Chinese timing prose requires business confirmation, not silent mapping.

### Property name–display name mapping rules

When fixing, refer to the standard mapping in `STANDARD_MAPPING` (from `naming-dict.md`)

### Display name disambiguation rules

When multiple different property names share the same display name, disambiguate in the following priority:

1. First check `DISPLAY_DISAMBIGUATION`
2. Then check `STANDARD_MAPPING`
3. Object group sub-properties (containing a dot): generate a prefix from the parent property name
4. Ordinary properties: generate a prefix from the owning event or module name

### Type unification rules

- When the same property name appears in different events, its type must be consistent
- Prefer the standard type in `STANDARD_MAPPING`
- Recognized aliases normalize through `scripts/plan_types.py`; keep object/object-group semantics distinct, and reject unknown enums instead of guessing.

## Output Contract

1. The fixed Excel file at a NEW path, only after confirmed repairs
2. The unchanged original file; optional backup is not permission to overwrite
3. The change report (Markdown table, including: row, Sheet, property name, field, before value, after value)
4. Validation pass confirmation (zero errors after re-validation)

## When To Open Which File

- To run validation + repair: `scripts/lint_tracking_plan.py`
- To look up standard property name mappings: `references/naming-dict.md`
- To look up object group sub-property structure: `references/plan-generation/reference.md` §6
