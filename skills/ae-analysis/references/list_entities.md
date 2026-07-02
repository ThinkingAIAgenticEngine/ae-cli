# analysis_meta +list_entities (Entity Search)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Entity Query**

## Use Cases
- List entities in the project. Returns entity details such as entity ID, name, column name, column description, and type. Can be filtered by event name.
- List entities in the project.

## Command
```bash
ae-cli analysis_meta +list_entities --project_id <project_id>
ae-cli analysis_meta +list_entities --project_id <project_id> --query demo
ae-cli analysis_meta +list_entities --project_id <project_id> --event_name demo
ae-cli analysis_meta +list_entities --project_id <project_id> --fields '["entityId", "entityName", "columnName", "columnDesc", "selectType"]' --limit 20 --offset 0
ae-cli analysis_meta +list_entities --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--event_name` | No | Optional event name filter |
| `--query` / `-q` | No | Optional keyword filter. Fuzzy match is applied to entityName, columnName, and columnDesc; if omitted, all accessible dashboards are returned. |
| `--fields` / `-f` | No | Optional fields to return (JSON array). Supported fields: `entityId`, `entityName`, `columnName`, `columnDesc`, `selectType`, `tableType`, `entityType`. Default fields when omitted: `entityId`, `entityName`, `columnName`, `columnDesc`, `selectType`. Entity metadata exposes `columnDesc` as the description field; no remark field is available in this list response. |
| `--limit` / `-l` | No | Optional page size. Default: 20, maximum: 10000. |
| `--offset` / `-o` | No | Optional page offset. Default: 0. |


## Decision Rules
- First run should only pass the required parameter (`--project_id`), and add optional parameters only after the path is confirmed to work.
- `--event_name` is used to filter entities by event name, not for keyword search.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps After Failure
- If the required parameter is missing, fall back to the smallest runnable command and fill it in (focus on `--project_id`).
- If the result is empty, first confirm the project ID/keyword, then try loosening the filter conditions.

## Recommended Chaining
- +list_entities -> +create_virtual_property / +create_virtual_event
