# te_meta +list_entities (Entity Search)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Entity Query**

## Use Cases
- List entities in the project. Returns entity details such as entity ID, name, column name, column description, and type. Can be filtered by event name.
- List entities in the project.

## Command
```bash
ae-cli te_meta +list_entities --project_id 1
ae-cli te_meta +list_entities --project_id 1 --event_name demo
ae-cli te_meta +list_entities --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--event_name` | No | Optional event name filter |

## Decision Rules
- First run should only pass the required parameter (`--project_id`), and add optional parameters only after the path is confirmed to work.
- `--event_name` is used to filter entities by event name, not for keyword search.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps After Failure
- If the required parameter is missing, fall back to the smallest runnable command and fill it in (focus on `--project_id`).
- If the result is empty, first confirm the project ID/keyword, then try loosening the filter conditions.

## Recommended Chaining
- +list_entities -> +create_virtual_property / +create_virtual_event
