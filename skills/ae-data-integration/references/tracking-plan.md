# Tracking plan (plan before ingest)

Generate and confirm the event/property plan **before** any transform or upload. This is the data-governance shift-left rule: the plan carries business meaning into AE, so dashboards and reports are usable immediately after ingestion.

## Input

- The `inspect` profile: columns, types, samples, UE eligibility, and mapping confidence.
- Optional business documentation and a one-line user goal.

## Sub-steps

1. **Event-model decision** — reuse the UE routing result: single-table single-event `track`, single-table multi-event (event-name column), `user_set`, or `mixed`. The agent may propose splitting one table into several events (for example an ad table into `ad_show`/`ad_click` by `campaign_type`); that proposal must be confirmed by the user in the confirmation gate.
2. **Column → property draft** — identify system columns (time, `distinct_id`/`account_id`, event-name column, user-property-name column); map the remaining columns to event / user / common properties. Name events and properties in snake_case and fill **every** `display_name`, `desc`, and `event_tag` (events also carry `event_desc`). Infer all three from field names, value distribution, samples, and business-doc / prompt priors — never leave them empty: `desc`/`event_desc` state what the item means in plain language (language follows the user), and `event_tag` picks the closest category from the canonical tag list (see the `event_tag` appendix in `../../ae-generate-tracking-plan/references/business-dimension-mapping.md`). When you cannot infer a `desc` or `event_tag`, mark it pending and ask the user for it inside the confirmation gate. Infer types (`number` / `bool` / `datetime` / enum) the same way; CSV defaults to `string`. Columns that stay uncertain or conflicting are marked pending and asked only inside the confirmation gate.
3. **Confirmation gate (single, one pass)** — present one summary table: event list + property list (uncertain types highlighted) + field scope (default: plan fields only, with a full-import switch) + unrecognized/dirty-data handling. The user answers once with ok or edits (renames, types, add/drop columns).
4. **Merge with the existing plan** — fetch the project's current tracking plan; same-name property type conflicts are severe, same-name events are advisory; decide append vs replace. This runs for **every** file, not just the first: when the project already has a plan (an earlier file or run), diff this file's events and properties against it and put the additions — new events, new properties, new object sub-properties from flattening — in the confirmation gate. An existing plan is never a reason to skip this step; only when every addition is already present may you skip the merge, and even then state and confirm that fact with the user.
5. **Persist the plan** — draft.json → xlsx → upload with `sdk_integration_mode=none`.
6. **Hand off the field mapping** — the confirmed plan plus column→property mapping, `value_mapping`, and `flatten_rules` feed the Transform submodule.

## CLI

`ae-cli data-integration plan --mapping <mapping> [--event-name <name>...] [--plan-name <name>] [--out <draft.json>] [--dry-run]` converts the confirmed `ae-local-data-mapping/v1` mapping into a tracking-plan `draft.json` with `sdk_integration_mode=none` and `source_type=data`.

- `user_set` mode → no events; every mapping property becomes a user property.
- `track` mode → one event per `--event-name` (or the mapping `default_event_name`); every property becomes an event property.
- `mixed` mode → the track event(s) above, plus the same properties mirrored as user properties.
- `exclude_columns` are dropped from the draft.
- `desc` and `event_tag` flow from the mapping: each property's `desc` (falling back to its source column name) and each event's `event_meta.<name>.desc` / `event_meta.<name>.tag` (falling back to the source event name) are written into the draft. Fill them in the mapping so the plan is never empty.
- The per-row event-name column cannot be enumerated without a full scan, so when `default_event_name` is absent the CLI requires `--event-name` for each concrete event name.
- `--dry-run` previews events and properties without writing `draft.json`.

Afterward reuse `ae-cli tracking plan draft --in draft.json --out draft.xlsx` and `ae-cli tracking plan validate / upload` for xlsx generation and ingestion.

## Reuse

The data path owns plan drafting and upload through the commands above: `ae-cli data-integration plan` (draft.json) → `ae-cli tracking plan draft` (xlsx) → `validate` → `upload`; do not reimplement these steps. Plan drafting, validation, and upload semantics otherwise follow the `ae-generate-tracking-plan` skill. The data path adds a dry-run / condensed single-gate confirmation mode and a "data sample as input" path; both are in progress and should not be reimplemented here.
