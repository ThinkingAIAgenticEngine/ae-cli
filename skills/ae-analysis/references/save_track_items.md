# analysis_meta +save_track_items (Save Track Program Items)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Project Configuration**

## Use Cases
- Create/update TRACKING-PLAN metadata only (planned bury items). Do not use this tool to create or edit effective system metadata. If the user intent is production metadata changes, route to MetaPowerTool instead.
- Create/update TRACKING-PLAN metadata only (planned bury items).

## Output
The response reports persistence of the submitted tracking-plan items. Read the plan back with `+get_track_program` before claiming the saved structure is effective.

## Command
```bash
ae-cli analysis_meta +save_track_items --project_id <project_id> --track_data '{}'
ae-cli analysis_meta +save_track_items --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--track_data` | Yes | Track program JSON object. Example: {"events":[{"eventName":"purchase","displayName":"Purchase","eventDesc":"User purchases a product","eventTag":"eCommerce","dataOrigin":"APP","props":["item_id","price"]}],"eventProps":[{"name":"price","displayName":"Price","type":"number","desc":"Product price"}],"userProps":[{"name":"vip_level","displayName":"Membership Level","type":"string","updateType":"user_set","propTag":"Membership","desc":"User membership level"}],"commonEventProps":[{"name":"platform","displayName":"Platform","type":"string","desc":"Application platform"}]}. Required fields: eventName/name and type. type values: string, number, datetime, bool, array_string, row, array_row. updateType values: user_setOnce, user_set, user_add, user_append. Constraints: eventName/name max 64 chars (letters, digits, underscore), displayName max 60 chars, desc/eventDesc max 200 chars. |

## Decision Rules
- First run should only pass the required parameters (`--project_id`, `--track_data`), and add optional parameters only after the path is confirmed to work.
- Wrap JSON arguments in single quotes (for example `--track_data '{}'`) to avoid shell escaping issues.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.
- This is an ordinary `write` operation and does not require CLI confirmation.

## Next Steps After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id` and `--track_data`).
- If `Invalid JSON` occurs, validate with the smallest JSON structure first (for example `{}` or `[]`), then add fields step by step.

## Recommended Chaining
- +get_track_program -> +save_track_items -> +get_track_program
