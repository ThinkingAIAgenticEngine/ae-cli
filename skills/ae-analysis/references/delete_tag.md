# analysis_audience +delete_tag (Delete Tag)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Tag Management**

## Use Cases
- Permanently delete a tag by its name.

## Commands
```bash
ae-cli analysis_audience +delete_tag --project_id <project_id> --tag_name my_tag
ae-cli analysis_audience +delete_tag --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--tag_name` | Yes | Tag name to delete |

## Decision Rules
- Use `+list_tags` first to confirm the tag name before deleting.
- This is a destructive operation; keep the confirmation prompt unless automation is explicitly required.

## Recommended Chain
- `+list_tags` -> `+delete_tag`
