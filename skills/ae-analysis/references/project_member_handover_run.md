# project member-handover run

Use when the user needs to run project member asset handover.

Do not use it for unrelated project-management actions or for fields not present in the common-service capability schema. Do not send camelCase aliases.

Command:

```bash
ae-cli project member-handover run --project-id <project_id> --payload '{"to_user_id":<user_id>,"single_submit":true,"asset_list":[{"asset_id":<asset_id>,"asset_type":"report","asset_name":"<asset_name>"}]}'
```

Capability id: `project.member_handover.run`.

Input sends `project_id`, `payload`. Payload keys, JSON arrays, and projection fields must follow the common-service snake_case input schema.

Output uses the gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`. Preserve `request_id` and `invocation_id` when present.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--payload` | Yes | JSON object with `to_user_id`, `single_submit`, and `asset_list`. `single_submit=true` requires exactly one asset; false allows a non-empty batch. Each asset uses `asset_id`, `asset_type`, and `asset_name` from the selected asset. Types: `report`, `dashboard`, `space`, `folder`, `bi_panel`, `thirdparty`. |
