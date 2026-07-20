# engage-setting client-param

> Capability ids: `engage-setting.client-param.{update,delete,list}` · Domain: `engage`. (`create` temporarily disabled in CLI.)

## Commands

```bash
# Update a custom client param
ae-cli engage-setting client-param update \
  --project-id <project_id> --column-name <name> --column-type <type> --select-type <select> \
  [--column-desc <desc>]

# Delete a custom client param (high-risk)
ae-cli engage-setting client-param delete --project-id <project_id> --column-name <name> --yes

# List custom client params
ae-cli engage-setting client-param list --project-id <project_id>
```

## Parameters

### update

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--column-name` | Yes | Client param column name. |
| `--column-type` | Yes | Column type (see ColumnTypeEnum). |
| `--select-type` | Yes | Select type (see SelectTypeEnum). |
| `--column-source` | No | Param source: preset or custom. |
| `--column-desc` | No | Display name of the param. Defaults to an empty string. |
| `--column-remark` | No | Description/remark for the param. |
| `--alternative-val` | No | JSON array of alternative values. |
| `--system-id-param` | No | Whether this is a system identifier param. |

### delete

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--column-name` | Yes | Client param column name to delete. |

### list

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |

## Output

- `update`: `data.success` — whether the operation succeeded.
- `delete`: `data.success` and `data.task_list` (tasks still referencing the param, which block deletion; each item has `task_id`, `task_name`).
- `list`: `data.items` (each with `column_name`, `column_type`, `select_type`, `column_source`, `column_desc`, `column_remark`, `alternative_val`, `system_id_param`) and `data.total`.

## Decision Rules

- Use these commands when the user asks to manage custom client params (客户端参数).
- `delete` is `high-risk-write` and requires `--yes` (or interactive confirmation). When `data.success` is false, `data.task_list` lists tasks that still reference the param — report them instead of forcing deletion.
