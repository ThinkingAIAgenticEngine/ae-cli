# analysis_audience +update_id_tag (Update ID Tag)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Tag Management**

## Use Cases
- Update an existing ID tag by re-uploading CSV file content as plain text.
- The tag is identified by `tag_name`. The operation is asynchronous.

## Commands
```bash
ae-cli analysis_audience +update_id_tag --project_id <project_id> --tag_name vip_tag --file_content "user_001,gold
user_002,silver"
ae-cli analysis_audience +update_id_tag --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--tag_name` | Yes | Tag name to update |
| `--file_content` | Yes | New CSV file content as plain text. No header row, UTF-8 encoding. Column 1: user ID. Column 2: tag value (optional). Example: user_001,gold_member. Max 100MB. |
| `--display_name` | No | Optional new display name |
| `--remarks` | No | Optional new remarks (max 200 characters) |
| `--entity_id` | No | Entity ID to associate the tag with |
| `--main_column_name` | No | Optional new main column name for ID matching |

## Return Value
Returns `clusterId`, `uploadNum`, `userNum`, `unmatchedNum`, and `clusterName` (tag name).

## Decision Rules
- Use `+list_tags` to confirm the tag name before updating.
- If file size exceeds 100MB, inform the user to upload directly via the web interface.

## Recommended Chain
- `+list_tags` -> `+update_id_tag`
