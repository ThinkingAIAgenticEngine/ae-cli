# analysis +build_interval_analysis_qp (Build Interval Analysis QP)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Model Analysis**

## Use Cases
- Build a validated interval-analysis QP from structured interval intent.
- Interval analysis measures the time elapsed between an initial event and a return event per user.
- Use in the mandatory builder flow before `+query_adhoc --model_type interval`.
- This command builds QP only and does not execute the analysis query.

## JSON Rules
- CLI flags use snake_case, but JSON object keys use camelCase.
- `--interval` is a JSON object. Required fields: `initialEvent`, `returnEvent`, `window` (`{value, unit}`).
- `window.unit`: second / minute / hour / day / week / month.
- Wrap JSON in single quotes in shell commands.
- Do not call `list_events` or `list_properties` before this builder for normal ad-hoc analysis.

## Command Syntax
```bash
ae-cli analysis +build_interval_analysis_qp --project_id <project_id> --time_range '<time_range_json>' --interval '<interval_json>'
ae-cli analysis +build_interval_analysis_qp --project_id <project_id> --time_range '<time_range_json>' --interval '<interval_json>' --relation and --time_particle_size day
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--time_range` | Yes | Time range JSON |
| `--interval` | Yes | Interval intent JSON |
| `--relation` | No | Filter relation for top-level filters. Values: and, or. Default: and. |
| `--time_particle_size` | No | Time granularity. Allowed values: day, week, month. Defaults to day. |

## JSON Shape
`--interval` object:
```json
{"initialEvent":"login","returnEvent":"purchase","window":{"value":7,"unit":"day"}}
```

Optional fields in `--interval`:
- `relationEventPropertyName`: shared relation property for both events
- `groups`: group-by dimensions array
- `filters`: global filters array
- `initialFilters` / `returnFilters`: event-level filters (event properties only)
- `initialFilterRelation` / `returnFilterRelation`: and / or

## Examples
```bash
ae-cli analysis +build_interval_analysis_qp --project_id 3137 --time_range '{"mode":"previous","unit":"day","value":7}' --interval '{"initialEvent":"login","returnEvent":"purchase","window":{"value":7,"unit":"day"}}'
```

## Decision Rules
- After successful build (`status=generated`), call `+query_adhoc --model_type interval --qp '<response.qp>'`.
- If non-generated status, stop and ask user to clarify.

## Recommended Chain
- `+build_interval_analysis_qp` -> if `status=generated` -> `+query_adhoc --model_type interval --qp '<response.qp>'`
