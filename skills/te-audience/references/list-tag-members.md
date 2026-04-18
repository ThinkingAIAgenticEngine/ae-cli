# analysis_audience +list_tag_members (View Tag Members)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Tag Management**

## Use Cases
- List members in the specified tag. Returns member information such as user property values and total user count for the selected snapshot date.

## Commands
```bash
ae-cli analysis_audience +list_tag_members --project_id 1 --tag_name demo
ae-cli analysis_audience +list_tag_members --project_id 1 --tag_name demo --snapshot_date 2026-04-01 --property_names '["#user_id","name"]' --use_cache false
ae-cli analysis_audience +list_tag_members --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--tag_name` | Yes | Tag name |
| `--snapshot_date` | No | Optional tag snapshot date. Format: YYYY-MM-DD |
| `--property_names` | No | Optional list of user property names (JSON array) |
| `--use_cache` | No | Whether to use cache. Default: true |

## Decision Rules
- For the first execution, it is recommended to pass only the required parameters (`--project_id`, `--tag_name`) and add optional parameters after confirming the path works.
- `--property_names` must be passed as a JSON array (e.g. `--property_names '["#user_id"]'`).
- When troubleshooting across projects, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill the gap (focus on `--project_id`, `--tag_name`).
- If the result is empty, first confirm the project ID/keyword, then try broadening the filter conditions.

## Recommended Chain
- +list_tags -> +get_tags_by_name -> +update_tag
