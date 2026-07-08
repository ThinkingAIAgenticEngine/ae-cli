# analysis +build_rank_list_analysis_qp (Build Rank List Analysis QP)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Model Analysis**

## Use Cases
- Build a validated rank-list-analysis QP from structured rank list intent.
- Rank list analysis ranks entities (users, items, etc.) by a metric value.
- Use in the mandatory builder flow before `+query_adhoc --model_type rank_list`.
- This command builds QP only and does not execute the analysis query.

## JSON Rules
- CLI flags use snake_case, but JSON object keys use camelCase.
- `--rank_list` is a JSON object. Required fields: `rankDimension` (with `field`), `rankEvent`, `rankAggregation`.
- `rankType` values: `rank`=standard (1,2,2,4), `dense_rank`=dense (1,2,2,3), `row_rank`=unique (1,2,3,4). Defaults to `row_rank`.
- `orderBy`: `DESC`=highest first (default), `ASC`=lowest first.
- Wrap JSON in single quotes in shell commands.

## Command Syntax
```bash
ae-cli analysis +build_rank_list_analysis_qp --project_id <project_id> --time_range '<time_range_json>' --rank_list '<rank_list_json>'
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--authenticated_only` | No | Resolve only authenticated assets while building the QP. Do not pass this flag to `+query_adhoc`. |
| `--time_range` | Yes | Time range JSON |
| `--rank_list` | Yes | Rank list intent JSON |

## JSON Shape
`--rank_list` object:
```json
{
  "rankDimension": {"field": {"name": "#account_id", "type": "user_property"}},
  "rankEvent": "purchase",
  "rankAggregation": "A103",
  "rankProperty": "amount",
  "orderBy": "DESC"
}
```

Optional fields in `--rank_list`:
- `rankProperty`: required when rankAggregation is property-based (A103/A104/A106/A107/A108 etc.)
- `rankType`: rank / dense_rank / row_rank (default)
- `orderBy`: DESC (default) / ASC
- `filters`: global filters array
- `relation`: filter relation (and / or)

## Examples
```bash
ae-cli analysis +build_rank_list_analysis_qp --project_id 3137 --time_range '{"mode":"previous","unit":"day","value":7}' --rank_list '{"rankDimension":{"field":{"name":"#account_id","type":"user_property"}},"rankEvent":"purchase","rankAggregation":"A101","orderBy":"DESC"}'
```

## Decision Rules
- Use `--authenticated_only true` only when the user explicitly wants authenticated assets; do not add this flag to `+query_adhoc`.
- After successful build (`status=generated`), call `+query_adhoc --model_type rank_list --qp '<response.qp>'`.
- If non-generated status, stop and ask user to clarify.

## Recommended Chain
- `+build_rank_list_analysis_qp` -> if `status=generated` -> `+query_adhoc --model_type rank_list --qp '<response.qp>'`
