# analysis_meta +list_project_mark_times (List Project Mark Times)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Project Configuration**

## Use Cases
- List project date markers. Returns marker IDs, timestamps, content, and visibility status.
- Supports pagination with fields/limit/offset for payload governance.
- Query performs fuzzy matching on markContent.
- Do not use it for report time ranges or event timestamps; this command only lists project date markers.

## Commands
```bash
ae-cli analysis_meta +list_project_mark_times --project_id <project_id>
ae-cli analysis_meta +list_project_mark_times --project_id <project_id> --zone_offset 8
ae-cli analysis_meta +list_project_mark_times --project_id <project_id> --query demo --fields '["id","markTime","markContent"]' --limit 10 --offset 0
ae-cli analysis_meta +list_project_mark_times --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--zone_offset` | No | Marker time zone offset |
| `--query` / `-q` | No | Optional keyword filter. Fuzzy match on markContent. |
| `--fields` | No | Optional fields to return. Supported: id, projectId, markTime, userZoneTime, zoneOffset, markContent, isShow, creatorName, creatorId, lastModifierName, lastModifierId, createTime, updateTime. Invalid fields cause INVALID_FIELDS error. |
| `--limit` | No | Optional limit. Default: 50, maximum: 200. |
| `--offset` | No | Optional offset. Default: 0. |

## Decision Rules
- For the first run, pass only the required parameter (`--project_id`) to confirm the path works, then add optional parameters.
- For pagination, use `--limit` and `--offset` together. Default limit is 20.
- Use `--fields` to select specific columns for lighter response payloads.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id`).
- If the result is empty, first confirm the project ID/keyword, then try loosening the filter conditions.
- If INVALID_FIELDS error appears, check that all field names in `--fields` match the supported list.

## Recommended Chaining
- +get_project_config -> +list_project_mark_times
