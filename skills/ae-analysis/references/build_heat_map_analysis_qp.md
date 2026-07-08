# analysis +build_heat_map_analysis_qp (Build Heatmap Analysis QP)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Model Analysis**

## Use Cases
- Build a validated heatmap-analysis QP from structured heatmap intent.
- Heatmap analysis visualizes user interaction intensity on a 2D coordinate plane (e.g. screen position).
- Use in the mandatory builder flow before `+query_adhoc --model_type heat_map`.
- This command builds QP only and does not execute the analysis query.

## JSON Rules
- CLI flags use snake_case, but JSON object keys use camelCase.
- `--heat_map` is a JSON object. Required fields: `hotEvent`, `hotAggregation`, `xProp`, `yProp`.
- `xProp` and `yProp` must be numeric event properties (e.g. screen_width, screen_height, x_position, y_position).
- Wrap JSON in single quotes in shell commands.

## Command Syntax
```bash
ae-cli analysis +build_heat_map_analysis_qp --project_id <project_id> --time_range '<time_range_json>' --heat_map '<heat_map_json>'
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--authenticated_only` | No | Resolve only authenticated assets while building the QP. Do not pass this flag to `+query_adhoc`. |
| `--time_range` | Yes | Time range JSON |
| `--heat_map` | Yes | Heatmap intent JSON |

## JSON Shape
`--heat_map` object:
```json
{"hotEvent":"screen_tap","hotAggregation":"A100","xProp":"x_position","yProp":"y_position"}
```

Optional fields in `--heat_map`:
- `hotProperty`: required when hotAggregation is property-based (A103/A104 etc.)
- `filters`: event filters array
- `relation`: filter relation (and / or)

## Examples
```bash
ae-cli analysis +build_heat_map_analysis_qp --project_id 3137 --time_range '{"mode":"previous","unit":"day","value":7}' --heat_map '{"hotEvent":"screen_tap","hotAggregation":"A100","xProp":"x_position","yProp":"y_position"}'
```

## Decision Rules
- Use `--authenticated_only true` only when the user explicitly wants authenticated assets; do not add this flag to `+query_adhoc`.
- After successful build (`status=generated`), call `+query_adhoc --model_type heat_map --qp '<response.qp>'`.
- If non-generated status, stop and ask user to clarify.

## Recommended Chain
- `+build_heat_map_analysis_qp` -> if `status=generated` -> `+query_adhoc --model_type heat_map --qp '<response.qp>'`
