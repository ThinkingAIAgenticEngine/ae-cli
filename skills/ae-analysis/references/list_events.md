# analysis_meta +list_events (Event Metadata Discovery)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Metadata Query**

## Use Cases
- Read-only query for SYSTEM METADATA already effective in the project. Use for super events in production metadata. Do NOT use for tracking-plan metadata (bury/track program); that belongs to BuryProgramTool.
- Read-only query for SYSTEM METADATA already effective in the project.

## Commands
```bash
ae-cli analysis_meta +list_events --project_id <project_id>
ae-cli analysis_meta +list_events --project_id <project_id> --query demo
ae-cli analysis_meta +list_events --project_id <project_id> --query demo --fields '["eventName", "eventDesc"]' --limit 20 --offset 0
ae-cli analysis_meta +list_events --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--query` / `-q` | No | Optional keyword filter. Performs fuzzy matching against eventName, eventDesc, and aiRemark; if omitted, all events are returned. |
| `--fields` / `-f` | No | Optional fields to return (JSON array). Supported fields: `eventName`, `eventDesc`, `aiRemark`, `eventTag`, `remark`. |
| `--limit` / `-l` | No | Optional page size. Default: 20, maximum: 50. |
| `--offset` / `-o` | No | Optional page offset. Default: 0. |
## Decision Rules
- For the first run, pass only the required parameter (`--project_id`) to confirm the path works, then add optional parameters.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id`).
- If the result is empty, first confirm the project ID/keyword, then try loosening the filter conditions.

## Recommended Chaining
- +list_events -> +create_virtual_event
