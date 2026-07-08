# analysis_meta +list_properties (Property Metadata Discovery)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Metadata Query**

## Constraints

**Not a builder pre-step:** Do not call `+list_properties` before builder-supported ad-hoc analysis (`event`, `retention`, `funnel`, `prop_analysis`). The matching QP builder resolves property names internally. If the builder returns MCP failure, stop and ask for clarification instead of using this command as a fallback.

## Use Cases
- Read-only query for SYSTEM METADATA properties already effective in the project. Supports event/user scope. Do NOT use for tracking-plan metadata (bury/track program); that belongs to BuryProgramTool.
- Read-only query for SYSTEM METADATA properties already effective in the project. Use when the user explicitly asks to inspect property metadata, not as a required preparation step for QP builder.

## Commands
```bash
ae-cli analysis_meta +list_properties --project_id <project_id>
ae-cli analysis_meta +list_properties --project_id <project_id> --scope event --event_name purchase --query demo
ae-cli analysis_meta +list_properties --project_id <project_id> --query demo --fields '["propId", "propName", "propDesc", "remark", "selectType", "tableType"]' --limit 20 --offset 0
ae-cli analysis_meta +list_properties --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--scope` | No | Optional property scope. event means event properties, user means user properties. If omitted, all scopes are queried. |
| `--event_name` | No | Optional event name. If provided, only event properties available for that event are returned. |
| `--query` / `-q` | No | Optional keyword filter. Fuzzy match is applied to propName, propDesc, and remark; if omitted, all matched properties are returned. |
| `--fields` / `-f` | No | Optional fields to return (JSON array). Supported fields: `propId`, `propName`, `propDesc`, `remark`, `selectType`, `tableType`, `subTableType`, `authenticationStatus`. Default fields when omitted: `propId`, `propName`, `propDesc`, `remark`, `selectType`, `tableType`, `authenticationStatus`. |
| `--limit` / `-l` | No | Optional page size. Default: 20, maximum: 50. |
| `--offset` / `-o` | No | Optional page offset. Default: 0. |
| `--authenticated_only` | No | When true, return only authenticated properties. |


## Decision Rules
- Use `--authenticated_only true` only when the user explicitly asks for authenticated assets. `authenticationStatus` is `1` for authenticated and `0` for unauthenticated.
- For the first run, pass only the required parameter (`--project_id`) to confirm the path works, then add optional parameters.
- For builder-supported ad-hoc analysis, pass the user's property wording to the builder instead of pre-querying property metadata.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id`).
- If the result is empty, first confirm the project ID/keyword, then try loosening the filter conditions.

## Recommended Chaining
- +list_properties -> +create_virtual_property
