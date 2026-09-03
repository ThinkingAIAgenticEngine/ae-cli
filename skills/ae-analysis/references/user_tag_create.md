# analysis user-tag create

Create a user tag directly from an AI-facing definition request.

Do not use it for uploaded-ID tags; use `user-tag create-id`. A successful create automatically starts the initial computation; it does not mean the result is already complete. Do not call `user-tag refresh` afterward. Poll `user-tag get` until `progress=100` and `refresh_time` is present before using `users_num` or querying members.

The response reports this directly: `computation.triggered_automatically=true`, `computation.status=submitted`, and `result_freshness.is_stale=true`. Follow `next_action`; when it is `poll_get`, invoke `next_capability_id` with the exact `next_input` returned by the command.

Flags: `--project-id`, `--tag-name`, `--display-name`, `--definition-request` required. Optional: `--authenticated-only`, `--zone-offset`, `--entity-id`. The tag type comes from `definition_request.type`.

`tag_name` is a machine identifier: 1-80 characters, starts with a letter, and contains only letters, digits, or underscores. `display_name` is 1-80 characters. The CLI rejects violations before dispatch.

Read `user_tag_models.md` before constructing `--definition-request`. Dynamic first/last ranges use semantic `time_range` values such as `{"mode":"recent","unit":"month","value":1}` for this month or `{"mode":"start_to_today","start_time":"2026-07-01"}` for a fixed start date through today. Create does not accept `--remark`; set it later with `user-tag update` when needed.

The backend validates and compiles the definition inside the create operation; if metadata is ambiguous or missing, creation fails without creating the tag.

```bash
ae-cli analysis user-tag create --project-id <project_id> --tag-name high_value --display-name "High Value" --definition-request '{"type":"condition","condition_values":[{"value":"high","events":[{"event":"pay","operator":"gte","value":3,"aggregation":"count","time_range":{"mode":"recent","unit":"day","value":30}}]}]}'
```

First/last tag for this month:

```bash
ae-cli analysis user-tag create --project-id <project_id> --tag-name latest_platform_this_month --display-name "Latest Platform This Month" --definition-request '{"type":"first_last","first_last":{"event":"login","occurrence":"last","property":"platform","time_range":{"mode":"recent","unit":"month","value":1}}}'
```
