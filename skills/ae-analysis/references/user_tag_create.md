# analysis user-tag create

For non-SQL tag definitions, explicit time-range dates must not be later than today in the effective tag timezone. Follow the [date limits and timezone rules](user_tag_models.md#date-limits-for-non-sql-tags) before sending a create or definition update; future dates are rejected by the backend.

Create a user tag directly from an AI-facing definition request.

Do not use it for uploaded-ID tags; use `user-tag create-id`. A successful create automatically starts the initial computation; it does not mean the result is already complete. Do not call `user-tag refresh` afterward. Poll `user-tag get` until `progress=100` and `refresh_time` is present before using `users_num` or querying members.

The response reports this directly: `computation.triggered_automatically=true`, `computation.status=submitted`, and `result_freshness.is_stale=true`. Follow `next_action`; when it is `poll_get`, invoke `next_capability_id` with the exact `next_input` returned by the command.

Flags: `--project-id`, `--tag-name`, `--display-name`, `--definition-request` required. Optional: `--authenticated-only`, `--zone-offset`, `--entity-id`, `--enable-auto-refresh`, `--enable-history-tag-backup`, `--auto-refresh-schedule`. The tag type comes from `definition_request.type`. For a SQL tag, explicitly pass the project entity whose IDs the first result column represents. Follow the [SQL tag subject selection rules](user_tag_models.md#sql-tag) before creating it.

`tag_name` is a machine identifier: 1-80 characters, starts with a letter, and contains only letters, digits, or underscores. `display_name` is 1-80 characters. The CLI rejects violations before dispatch.

Read `user_tag_models.md` before constructing `--definition-request`. Every metric tag requires `metric.time_range`; never omit it. Dynamic first/last ranges use semantic `time_range` values such as `{"mode":"recent","unit":"month","value":1}` for this month or `{"mode":"start_to_today","start_time":"2026-07-01"}` for a fixed start date through today. Create does not accept `--remark`; set it later with `user-tag update` when needed.

The backend validates and compiles the definition inside the create operation; if metadata is ambiguous or missing, creation fails without creating the tag.

```bash
ae-cli analysis user-tag create --project-id <project_id> --tag-name high_value --display-name "High Value" --definition-request '{"type":"condition","condition_values":[{"value":"high","events":[{"event":"pay","operator":"gte","value":3,"aggregation":"count","time_range":{"mode":"recent","unit":"day","value":30}}]}]}'
```

Median metric tag for the previous 30 days:

```bash
ae-cli analysis user-tag create --project-id <project_id> --tag-name median_payment --display-name "Median Payment" --definition-request '{"type":"metric","metric":{"event":"pay","aggregation":"median","property":"amount","time_range":{"mode":"previous","unit":"day","value":30}}}'
```

First/last tag for this month:

```bash
ae-cli analysis user-tag create --project-id <project_id> --tag-name latest_platform_this_month --display-name "Latest Platform This Month" --definition-request '{"type":"first_last","first_last":{"event":"login","occurrence":"last","property":"platform","time_range":{"mode":"recent","unit":"month","value":1}}}'
```

Periodic refresh uses the same [structured schedule contract as user clusters](audience_scheduling.md). Use `--auto-refresh-schedule` with daily, daily_multiple, weekly, or monthly frequency and `--enable-auto-refresh` for the switch. A supplied schedule enables refresh. Omission on create leaves it disabled. `daily_multiple` accepts selected hours and page minute slots 0, 15, 30, 45; it saves an editable DAYS configuration. Never construct raw cron for a new call.

To retain historical tag values after scheduled refreshes, pass `--enable-history-tag-backup true` together with a schedule, for example `--auto-refresh-schedule '{"frequency":"daily","time":"02:30"}'`. Backup defaults to off.
Read the tag with `user-tag get`: `enable_history_tag_backup=1` means enabled; the native read may omit the field or return null when disabled. Use `history-tag list` to check for a completed historical version after a scheduled refresh.
