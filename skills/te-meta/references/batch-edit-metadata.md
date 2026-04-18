# analysis_meta +batch_edit_metadata (Batch Edit Metadata)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Metadata Query**

## Use Cases
- Batch edit SYSTEM METADATA already effective in project (super events / event properties / user properties). Do NOT use for tracking-plan metadata (bury/track program); tracking plan operations must use BuryProgramTool. Routing rule: if target is planned/unpublished bury metadata, never call this tool.
- Batch edit SYSTEM METADATA already effective in project (super events / event properties / user properties).

## Command
```bash
ae-cli analysis_meta +batch_edit_metadata --project_id 1 --type event --items '[{"eventName":"purchase","eventDesc":"Purchase"}]'
ae-cli analysis_meta +batch_edit_metadata --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--type` | Yes | Type of metadata to update: event, event_property, or user_property |
| `--items` | Yes | Batch update list. For event: eventName (required), eventDesc (optional), remark (optional). For properties: propName (required), propDesc (optional), remark (optional). |

## Decision Rules
- First run should only pass required parameters (`--project_id`, `--type`, `--items`), and add optional parameters only after the path is confirmed to work.
- Wrap JSON arguments in single quotes (for example `--items '{}'`) to avoid shell escaping issues.
- `--type` only accepts `event`, `event_property`, and `user_property`.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.
- Write operations keep the confirmation prompt by default; re-evaluate whether to use `--yes` in automation scenarios.

## Next Steps After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id`, `--type`, and `--items`).
- If `Invalid JSON` occurs, validate with the smallest JSON structure first (for example `{}` or `[]`), then add fields step by step.

## Recommended Chaining
- +batch_edit_metadata -> +batch_create_metadata
