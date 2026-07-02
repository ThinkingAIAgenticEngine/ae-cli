# analysis +build_attribution_analysis_qp (Build Attribution Analysis QP)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Model Analysis**

## Use Cases
- Build a validated attribution-analysis QP from structured attribution intent.
- Attribution analysis assigns conversion credit to touchpoint events that preceded a target conversion event.
- Use in the mandatory builder flow before `+query_adhoc --model_type attribution`.
- This command builds QP only and does not execute the analysis query.

## JSON Rules
- CLI flags use snake_case, but JSON object keys use camelCase.
- `--attribution` is a JSON object. Required fields: `targetEvent`, `targetAggregation`, `attributionEvents` (array), `attributionModel`, `window`.
- `attributionModel` values: `first`=First Touch, `last`=Last Touch, `linear`=Equal credit.
- `window.unit`: day / hour / minute. `window.value`: 0=same day.
- Wrap JSON in single quotes in shell commands.

## Command Syntax
```bash
ae-cli analysis +build_attribution_analysis_qp --project_id <project_id> --time_range '<time_range_json>' --attribution '<attribution_json>'
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--time_range` | Yes | Time range JSON |
| `--attribution` | Yes | Attribution intent JSON |

## JSON Shape
`--attribution` object:
```json
{
  "targetEvent": "purchase",
  "targetAggregation": "A101",
  "attributionEvents": [{"event": "click_ad"}, {"event": "view_product"}],
  "attributionModel": "last",
  "window": {"value": 7, "unit": "day"}
}
```

Optional fields in `--attribution`:
- `targetProperty`: required when targetAggregation is property-based (A103/A104/A106/A107/A108 etc.)
- `directConversion`: include direct conversions without touchpoints. Defaults to true.
- `filters`: global filters array
- `relation`: filter relation (and / or)

## Examples
```bash
ae-cli analysis +build_attribution_analysis_qp --project_id 3137 --time_range '{"mode":"previous","unit":"day","value":30}' --attribution '{"targetEvent":"purchase","targetAggregation":"A101","attributionEvents":[{"event":"click_ad"}],"attributionModel":"last","window":{"value":7,"unit":"day"}}'
```

## Decision Rules
- After successful build (`status=generated`), call `+query_adhoc --model_type attribution --qp '<response.qp>'`.
- If non-generated status, stop and ask user to clarify.

## Recommended Chain
- `+build_attribution_analysis_qp` -> if `status=generated` -> `+query_adhoc --model_type attribution --qp '<response.qp>'`
