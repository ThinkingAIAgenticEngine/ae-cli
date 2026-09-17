# tracking plan save-items

Use only when the user asks to save tracking plan items.

Command:

```bash
ae-cli tracking plan save-items --project-id <project_id> [--events '<json_array>'] [--event-props '<json_array>'] [--user-props '<json_array>'] [--common-event-props '<json_array>']
```

Capability id: `tracking.plan.save_items`

Input sends `project_id` and the provided `events`, `event_props`, `user_props`, and `common_event_props` arrays. At least one item array must be non-empty. Event/property objects use the existing tracking-plan snake_case contract; do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | Numeric project ID. | Yes |
| `--events` | Event objects with fields such as `event_name`, `display_name`, `event_desc`, `event_tag`, `data_origin`, and `props`. | No |
| `--event-props` | Event property objects with fields such as `name`, `display_name`, `type`, and `desc`. | No |
| `--user-props` | User property objects with fields such as `name`, `display_name`, `type`, `update_type`, `prop_tag`, and `desc`. | No |
| `--common-event-props` | Common event property objects. | No |
