# analysis +build_distribution_analysis_qp (Build Distribution Analysis QP)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Model Analysis**

## Use Cases
- Build a validated distribution-analysis QP from structured distribution metrics.
- Distribution analysis shows how a metric value is distributed across users or events.
- Use in the mandatory builder flow before `+query_adhoc --model_type distribution`.
- This command builds QP only and does not execute the analysis query.

## JSON Rules
- CLI flags use snake_case, but JSON object keys use camelCase.
- `--distribution_metrics` is a JSON array. Each item requires `event` and `aggregation`.
- Distribution-specific aggregations: `A200`=count, `A201`=active-days, `A202`=active-hours.
- Standard aggregations requiring `property`: A103=sum, A104=avg, A106=max, A107=min, A117=median, A119=percentile.
- Wrap JSON in single quotes in shell commands.

## Command Syntax
```bash
ae-cli analysis +build_distribution_analysis_qp --project_id <project_id> --time_range '<time_range_json>' --distribution_metrics '<metrics_json>'
ae-cli analysis +build_distribution_analysis_qp --project_id <project_id> --time_range '<time_range_json>' --distribution_metrics '<metrics_json>' --time_particle_size day --groups '<groups_json>' --filters '<filters_json>' --relation and
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--authenticated_only` | No | Resolve only authenticated assets while building the QP. Do not pass this flag to `+query_adhoc`. |
| `--time_range` | Yes | Time range JSON |
| `--distribution_metrics` | Yes | Distribution metrics JSON array |
| `--time_particle_size` | No | Time granularity. Allowed values: day, week, month, total. Defaults to day. |
| `--groups` | No | Optional group-by dimensions JSON array |
| `--filters` | No | Optional global filters JSON array |
| `--relation` | No | Filter relation. Supported values: and, or. Default: and. |

## JSON Shape
`--distribution_metrics` array:
```json
[{"event":"login","aggregation":"A200"}]
```

Each metric item fields:
- `event` (required): event name
- `aggregation` (required): aggregation code
- `property` (optional): required for property-based aggregations
- `percentile` (optional): percentile value, e.g. 90 for P90. Required when aggregation=A119.
- `intervalType` (optional): def (auto, default) / user_defined (custom) / discrete (raw value)
- `quotaIntervalArr` (optional): custom bucket boundaries, e.g. [100,1000,10000]. Required when intervalType=user_defined.
- `filters` (optional): metric-level filters
- `relation` (optional): filter relation for metric-level filters

## Examples
```bash
ae-cli analysis +build_distribution_analysis_qp --project_id 3137 --time_range '{"mode":"previous","unit":"day","value":7}' --distribution_metrics '[{"event":"login","aggregation":"A200"}]'

ae-cli analysis +build_distribution_analysis_qp --project_id 3137 --time_range '{"mode":"previous","unit":"day","value":7}' --distribution_metrics '[{"event":"purchase","aggregation":"A103","property":"amount"}]'
```

## Decision Rules
- Use `--authenticated_only true` only when the user explicitly wants authenticated assets; do not add this flag to `+query_adhoc`.
- After successful build (`status=generated`), call `+query_adhoc --model_type distribution --qp '<response.qp>'`.
- If non-generated status, stop and ask user to clarify.

## Recommended Chain
- `+build_distribution_analysis_qp` -> if `status=generated` -> `+query_adhoc --model_type distribution --qp '<response.qp>'`
