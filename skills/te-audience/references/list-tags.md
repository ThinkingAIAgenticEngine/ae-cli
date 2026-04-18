# te_audience +list_tags (Tag Search)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Tag Management**

## Use Cases
- List tag metadata accessible to the current user in the project. Supports keyword filtering and returns tag names, display names, types, status, user counts, and related metadata, but not tag members.

## Commands
```bash
te-cli te_audience +list_tags --project_id 1
te-cli te_audience +list_tags --project_id 1 --query demo
te-cli te_audience +list_tags --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--query` / `-q` | No | Optional keyword filter. Performs fuzzy matching against tag names, display names, and remarks; if omitted, all tags are returned. |

## Decision Rules
- For the first execution, it is recommended to pass only the required parameters (`--project_id`) and add optional parameters after confirming the path works.
- When troubleshooting across projects, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill the gap (focus on `--project_id`).
- If the result is empty, first confirm the project ID/keyword, then try broadening the filter conditions.

## Recommended Chain
- +list_tags -> +get_tags_by_name -> +update_tag
