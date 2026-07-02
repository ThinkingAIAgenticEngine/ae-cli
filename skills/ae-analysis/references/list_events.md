# analysis_meta +list_events (Event Metadata Discovery)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Metadata Query**

## Constraints

**Fuzzy Search Fallback:** If `--query` returns no results, retry with broader keywords (max 3 attempts), then fall back to full list. See [SKILL.md § C. FUZZY_SEARCH_FALLBACK](../SKILL.md#c-fuzzy_search_fallback).

**Not a builder pre-step:** Do not call `+list_events` before builder-supported ad-hoc analysis (`event`, `retention`, `funnel`, `prop_analysis`). The matching QP builder resolves event names internally. If the builder returns MCP failure, stop and ask for clarification instead of using this command as a fallback.

## Use Cases
- Read-only query for SYSTEM METADATA already effective in the project. Use for super events in production metadata. Do NOT use for tracking-plan metadata (bury/track program); that belongs to BuryProgramTool.
- Read-only query for SYSTEM METADATA already effective in the project. Use when the user explicitly asks to inspect event metadata, not as a required preparation step for QP builder.

## Commands
```bash
ae-cli analysis_meta +list_events --project_id <project_id>
ae-cli analysis_meta +list_events --project_id <project_id> --query demo
ae-cli analysis_meta +list_events --project_id <project_id> --query demo --fields '["eventId", "eventName", "eventDesc", "remark"]' --limit 20 --offset 0
ae-cli analysis_meta +list_events --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--query` / `-q` | No | Optional keyword filter. Performs fuzzy matching against eventName, eventDesc, and remark; if omitted, all events are returned. |
| `--fields` / `-f` | No | Optional fields to return (JSON array). Supported fields: `eventId`, `eventName`, `eventDesc`, `remark`, `eventTag`. Default fields when omitted: `eventId`, `eventName`, `eventDesc`, `remark`. |
| `--limit` / `-l` | No | Optional page size. Default: 20, maximum: 10000. |
| `--offset` / `-o` | No | Optional page offset. Default: 0. |
## Decision Rules
- For the first run, pass only the required parameter (`--project_id`) to confirm the path works, then add optional parameters.
- For builder-supported ad-hoc analysis, pass the user's event wording to the builder instead of pre-querying event metadata.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id`).
- If the result is empty, first confirm the project ID/keyword, then try loosening the filter conditions.

## Recommended Chaining
- +list_events -> +create_virtual_event
