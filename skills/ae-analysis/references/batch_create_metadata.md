# analysis_meta +batch_create_metadata (Batch Create Metadata)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Metadata Query**

## Use Cases
- Batch create SYSTEM METADATA in one atomic request (events/eventProperties/userProperties) and apply name-based associations. This tool is only for effective production metadata, not tracking-plan metadata. For bury plan draft/review/publish data, use BuryProgramTool only.
- Do not use it to edit existing metadata; use `+batch_edit_metadata` after resolving the existing names.

## Output
The response reports the batch creation outcome. Treat any item-level validation error as a failed item; do not assume the whole requested batch was created from transport success alone.

## Commands
```bash
ae-cli analysis_meta +batch_create_metadata --project_id <project_id>
ae-cli analysis_meta +batch_create_metadata --project_id <project_id> --events '[{"eventName":"purchase"}]' --event_properties '[{"propName":"price","selectType":"number"}]' --user_properties '[{"propName":"vip_level","selectType":"string"}]'
ae-cli analysis_meta +batch_create_metadata --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--events` | No | Event creation list. Each item: eventName(required), eventDesc(optional), remark(optional), superEventPropNames(optional List<String>). |
| `--event_properties` | No | Event property creation list. Each item: propName(required), selectType(required canonical: number/string/date/bool/list; aliases like datetime/timestamp/time auto-normalize to date), propDesc(optional, defaults to propName when omitted), propRemark(optional), commonProp(optional boolean), superEventNames(optional List<String>). |
| `--user_properties` | No | User property creation list. Each item: propName(required), selectType(required canonical: number/string/date/bool/list; aliases like datetime/timestamp/time auto-normalize to date), propDesc(optional, defaults to propName when omitted), propRemark(optional). |

## Decision Rules
- For the first run, pass only the required parameter (`--project_id`) to confirm the path works, then add optional parameters.
- Wrap JSON parameters in single quotes (for example `--events '{}'` and `--event_properties '{}'`) to avoid shell escaping issues.
- At least one non-empty list among `--events`, `--event_properties`, and `--user_properties` must be provided.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.
- This is an ordinary `write` operation and does not require CLI confirmation.

## Next Steps After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id`).
- If `Invalid JSON` appears, first validate with the smallest JSON structure (such as `{}` or `[]`), then add fields step by step.

## Recommended Chaining
- +batch_create_metadata -> +batch_edit_metadata
