# Excel Export Schema

> One canonical JSON supplies the in-session reviewable conversation view (`scripts/prepare_delivery.py --conversation-only`) and, only after the user selects that branch, either a structured sync payload (`scripts/sync_plan.py`) or the complete 11-sheet workbook (`scripts/finalize_plan.py`). The initial review creates no workbook. v2.0.1's repaired official Chinese data headers remain the Excel contract, including `采集端` in event column E; the seven instruction sheets remain unchanged. Business content/replies follow the user's language, while sheet names/headers/type labels remain Chinese.

## CLI (run from the package root)

```bash
python3 scripts/finalize_plan.py \
  --plan ./plan.json \
  --template assets/埋点模版.xlsx \
  --output ./product_tracking_plan_NEW.xlsx
python3 scripts/lint_tracking_plan.py \
  --input ./product_tracking_plan_NEW.xlsx \
  --strict-delivery --template assets/埋点模版.xlsx
```

No overwrite flag is part of final delivery. These Excel commands run only after the user selects the local-file branch. If checks fail, show findings and obtain confirmation before `--fix --output <NEW_FIXED.xlsx>` with the strict flags, then recheck read-only and synchronize approved corrections to JSON, conversation and selected artifacts. A first-run failure is not erased by a later pass. Remote sync is governed by [Validated Upload](../workflows/validated-upload.md), not these local commands.

## Top-Level Structure

This skeleton documents array names, not a ready-to-deliver example: `events` must be nonempty in an actual plan, and every array must exist. Fill confirmed event/property/identity definitions before generation. Unknown extra record fields are rejected; preserve their meaning explicitly in supported descriptions/remarks, not silently dropped columns.

```json
{
  "meta": {
    "product_name": "Short Drama Product A",
    "output_name": "short_drama_product_a_tracking_plan_20260325.xlsx",
    "author": "tracking-plan-generator",
    "generated_at": "2026-03-25",
    "reply_language": "en",
    "xlsx_language": "zh"
  },
  "user_id_sheet": [],
  "common_event_properties": [],
  "events": [],
  "user_properties": []
}
```

## `meta`

- `product_name`: optional business title (used by the conversation renderer), not a replacement for required `--output` / `--output-dir` CLI arguments.
- `output_name`, `author`, `generated_at`: optional provenance/business metadata only; do not assume filename defaults or workbook metadata writes from these legacy fields.
- `reply_language`: actual conversation-renderer language, currently `zh` or `en`; authored business strings are preserved.
- `xlsx_language`: `zh` for the fixed Chinese sheet/header/type contract, independent of reply language. Required CLI output paths must be new.

Optional business context fields under `meta` are `business_context`, `notes`, `timezone`, `metric_mapping`, `change_log`, `assumptions`, `open_questions`, and `blocking_unknowns`. Supply verified strings, lists or objects, not invented facts. The conversational renderer shows these fields (missing inputs remain TBC); the same context is retained in the event-sheet A1 comment without changing seven instruction sheets. Nonempty source `blocking_unknowns` blocks the upload adapter. Additional top-level/event/property fields outside this documented schema are rejected rather than silently discarded; preserve their meaning explicitly in the supported description/remarks/context fields.

## `user_id_sheet`

Each entry corresponds to one row of `#用户ID体系`:

```json
{
  "product_type": "Single Account",
  "property_name": "#account_id",
  "display_name": "Account ID",
  "description": "System Property",
  "assignment": "Set to the user's unique account ID",
  "remarks": "Preferred for products with a login system"
}
```

Field requirements:

- `property_name`
- `display_name`
- `description`
- `assignment`

`product_type` and `remarks` may be empty strings.

## `common_event_properties`

Each entry corresponds to one row of `#公共事件属性`:

```json
{
  "property_name": "channel",
  "display_name": "Channel",
  "property_type": "Text",
  "description": "Confirmed app distribution channel, only common when stable and applicable to nearly all events; not MMP first-touch attribution"
}
```

All fields are required.

## `events`

Each entry corresponds to one event; the script automatically flattens `properties` into the `#事件数据` Sheet.

```json
{
  "event_name": "playlet_start",
  "display_name": "Short Drama Start",
  "description": "Reported when the user starts playing a short drama",
  "tag": "Content Playback",
  "platform": "client",
  "properties": [
    {
      "property_name": "playlet_id",
      "display_name": "Short Drama ID",
      "property_type": "Text",
      "description": "Unique identifier of the short drama; attaching a dimension table is recommended"
    }
  ]
}
```

Rules:

- `event_name` must be globally unique.
- `properties` may be an empty array; the event row is still output when it is empty.
- `tag` holds only the owning module/category, e.g. `Login`, `Ad System`; it does not include the collection-side marker.
- `platform` holds the collection-side semantics: `client`, `server`, or `client,server` in the Chinese `采集端` column E. Legacy C/S/S+C aliases must be normalized, not dropped. Dual-side reporting requires an explicit authoritative source and dedup strategy, not two counted facts.
- `remarks`, when present, must survive in the existing event/property description or ID assignment field; never add a new notes column or silently discard them.
- The event columns A–I are `事件名（必填）`, `事件显示名`, `事件说明`, `事件标签`, `采集端`, `属性名（必填）`, `属性显示名`, `属性类型（必填）`, `属性说明`. Event fields are merged across their property rows according to the repaired template contract.

## `user_properties`

Each entry corresponds to one row of `#用户数据`:

```json
{
  "property_name": "register_time",
  "display_name": "Registration Time",
  "property_type": "Datetime",
  "update_method": "user_setOnce",
  "description": "Recorded when the user registers successfully for the first time"
}
```

All fields are required.

## Usage Constraints

1. First normalize naming, types, collection side, and self-check rules against `../naming-dict.md` and `reference.md`.
2. Formal event/property definitions represent confirmed design. Preserve unresolved business facts explicitly as TBC in separate review metadata/notes; do not turn candidates into factual enums or upload-ready definitions. The review gate remains pending while required unknowns exist.
3. If you need to reference industry templates, first read `template-catalog.md`, then open `../categories/*.md` as needed, and finally return to this schema to export.
4. Deliver the reviewable conversation plan first, then ask for direct structured sync or local Excel. Generate only the selected branch artifact from this same JSON; direct sync must not create an Excel intermediate. No independent model rewrite between views.
5. `normalize_property_type` / `normalize_update_method` in `scripts/plan_types.py` own aliases. Workbook types remain Chinese; `Object` and `Object Group` stay distinct. Import update methods are `user_set`, `user_setOnce`, `user_add`, `user_append`; SDK deletion/unique-append operations are not assumed valid plan enums. Legacy timing prose needs semantic confirmation, not guessed mapping.
6. `meta.reply_language` records reply/business language; `meta.xlsx_language` records Chinese workbook import language (`zh`). Upload parsing language must match actual sheet/header/type language, not the user's conversational language. See the upload workflow for current CLI discovery.
