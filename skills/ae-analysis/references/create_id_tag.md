# analysis_audience +create_id_tag (Create ID Tag)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Tag Management**

## Use Cases
- Create a new ID tag by uploading a CSV of user IDs and tag values as plain text.
- The CSV should contain two columns: user ID and tag value (tag value is optional).
- The operation is asynchronous — the tag enters computing state after creation.

## Commands
```bash
ae-cli analysis_audience +create_id_tag --project_id <project_id> --display_name "VIP Tag" --file_content "user_001,gold
user_002,silver" --entity_id <entity_id>
ae-cli analysis_audience +create_id_tag --project_id <project_id> --display_name "VIP Tag" --file_content "user_001,gold" --entity_id <entity_id> --tag_name vip_tag --remarks "ID-based tag"
ae-cli analysis_audience +create_id_tag --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--display_name` | Yes | Tag display name (1-80 characters) |
| `--file_content` | Yes | CSV file content as plain text. No header row, UTF-8 encoding. Column 1: user ID. Column 2: tag value (optional). Example: user_001,gold_member. Max 100MB. |
| `--entity_id` | Yes | Entity ID to associate the tag with. Use `analysis_meta +list_entities` to query. |
| `--tag_name` | No | Tag name (letters/digits/underscores, starts with a letter, max 80 chars). Auto-generated if omitted. |
| `--remarks` | No | Optional remarks (max 200 characters) |
| `--main_column_name` | No | Optional main column name for ID matching |

## Return Value
Returns `clusterId`, `uploadNum` (rows uploaded), `userNum` (matched users), `unmatchedNum` (unmatched rows), and `clusterName` (tag name).

## Decision Rules
- Call `analysis_meta +list_entities` to resolve `entity_id` before creating.
- If file size exceeds 100MB, inform the user to upload directly via the web interface.

## Recommended Chain
- `analysis_meta +list_entities` -> `+create_id_tag` -> `+refresh_tag`
