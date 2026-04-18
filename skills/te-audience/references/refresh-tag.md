# analysis_audience +refresh_tag (Trigger Tag Recompute)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Tag Management**

## Use Cases
- Trigger tag recomputation and submit an asynchronous refresh task.

## Commands
```bash
ae-cli analysis_audience +refresh_tag --project_id 1 --tag_name demo
ae-cli analysis_audience +refresh_tag --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--tag_name` | Yes | Tag name |

## Decision Rules
- For the first execution, it is recommended to pass only the required parameters (`--project_id`, `--tag_name`) and add optional parameters after confirming the path works.
- When troubleshooting across projects, first confirm whether `--project_id` matches the current permissions and target environment.
- Write operations keep confirmation prompts by default; for automation scenarios, reevaluate whether to use `--yes`.

## Next Step on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill the gap (focus on `--project_id`, `--tag_name`).

## Recommended Chain
- +list_tags -> +get_tags_by_name -> +update_tag
