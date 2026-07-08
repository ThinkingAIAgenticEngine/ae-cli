# analysis +build_path_analysis_qp (Build Path Analysis QP)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Model Analysis**

## Use Cases
- Build a validated path-analysis QP from structured path intent.
- Path analysis visualizes user navigation flows between events within a session.
- Use in the mandatory builder flow before `+query_adhoc --model_type path`.
- This command builds QP only and does not execute the analysis query.

## JSON Rules
- CLI flags use snake_case, but JSON object keys use camelCase.
- `--path` is a JSON object. Required fields: `sourceEvent`, `eventNames` (array), `sessionInterval`, `sessionUnit`.
- `sessionUnit`: second / minute / hour.
- `sourceType`: 0=forward path (after source event, default), 1=backward path (before source event).
- Wrap JSON in single quotes in shell commands.

## Command Syntax
```bash
ae-cli analysis +build_path_analysis_qp --project_id <project_id> --time_range '<time_range_json>' --path '<path_json>'
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--authenticated_only` | No | Resolve only authenticated assets while building the QP. Do not pass this flag to `+query_adhoc`. |
| `--time_range` | Yes | Time range JSON |
| `--path` | Yes | Path intent JSON |

## JSON Shape
`--path` object:
```json
{"sourceEvent":"login","eventNames":["login","view_product","purchase"],"sessionInterval":30,"sessionUnit":"minute"}
```

Optional fields in `--path`:
- `sourceType`: 0=forward (default), 1=backward

## Examples
```bash
ae-cli analysis +build_path_analysis_qp --project_id 3137 --time_range '{"mode":"previous","unit":"day","value":7}' --path '{"sourceEvent":"login","eventNames":["login","view_product","purchase"],"sessionInterval":30,"sessionUnit":"minute"}'
```

## Decision Rules
- Use `--authenticated_only true` only when the user explicitly wants authenticated assets; do not add this flag to `+query_adhoc`.
- After successful build (`status=generated`), call `+query_adhoc --model_type path --qp '<response.qp>'`.
- If non-generated status, stop and ask user to clarify.

## Recommended Chain
- `+build_path_analysis_qp` -> if `status=generated` -> `+query_adhoc --model_type path --qp '<response.qp>'`
