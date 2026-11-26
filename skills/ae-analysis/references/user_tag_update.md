# analysis user-tag update

For non-SQL tag definitions, explicit time-range dates must not be later than today in the effective tag timezone. Follow the [date limits and timezone rules](user_tag_models.md#date-limits-for-non-sql-tags) before sending a create or definition update; future dates are rejected by the backend.

Update a user tag. Discover the exact `tag_name` first.

Do not use it for ID-file value replacement or to create a missing tag. A changed `--definition-request` automatically starts recomputation; the native service skips recomputation when the normalized definition and timezone are unchanged. Follow the returned `computation.triggered_automatically` and `next_action`; do not call `user-tag refresh` afterward. Updating only `--display-name` or `--remark` does not recompute. A schedule-only update changes periodic refresh without starting immediate recomputation. `--auto-refresh-schedule` can enable periodic refresh directly, including on a previously disabled tag. A successful update means the definition was saved, not that a triggered computation is complete. When computation was triggered, poll `user-tag get` until `progress=100` and `refresh_time` advances from the value recorded before the update. An unchanged definition returns `not_triggered` and `next_action=none`; do not wait for its refresh timestamp to change.

The response distinguishes both paths. An update that triggers recomputation returns `computation.triggered_automatically=true`, `result_freshness.is_stale=true`, and `next_action=poll_get` with an exact capability/input pair. An unchanged definition or display-name/remark-only update returns `computation.status=not_triggered`, `result_freshness.status=fresh`, and `next_action=none`.

Flags: `--project-id`, `--tag-name` required. Optional: `--display-name`, `--definition-request`, `--authenticated-only`, `--remark`, `--zone-offset`, `--enable-auto-refresh`, `--enable-history-tag-backup`, `--auto-refresh-schedule`. The tag type comes from `definition_request.type` when the definition changes.

`display_name` is at most 80 characters and `remark` is at most 400 characters. The CLI rejects violations before dispatch. `tag_name` is an existing exact identifier and cannot be renamed by update.

Read `user_tag_models.md` before changing the definition. For SQL, check the replacement query against the existing tag's entity using the [SQL tag subject selection rules](user_tag_models.md#sql-tag). The backend validates and compiles `definition_request` inside update and refuses to modify the tag if clarification is required.

Use the [shared structured schedule contract](audience_scheduling.md) for daily, daily_multiple, weekly, or monthly refresh. Omit scheduling flags to preserve the saved switch and plan; false disables refresh, true can reuse a valid saved plan. A supplied schedule enables refresh. Never construct raw cron for a new call.

```bash
ae-cli analysis user-tag update --project-id <project_id> --tag-name user_level --auto-refresh-schedule '{"frequency":"daily_multiple","hours":[8,12,18],"minutes":[0,30]}'
```

Read `user-tag get` after updating to verify `enable_auto_refresh` (1=enabled, 0=disabled), `scheduler_ui_config`, and `cluster_zone_offset`. Schedule-only updates return `computation.status=not_triggered` and `next_action=none`.

Use `--enable-history-tag-backup true|false` to switch historical backups independently. Enabling requires periodic refresh already active or a schedule in the same update. Omitting the flag preserves the saved switch. A backup-only update keeps the schedule and does not start a calculation.
Read the tag with `user-tag get`: `enable_history_tag_backup=1` means enabled; the native read may omit the field or return null when disabled. Use `history-tag list` to check for a completed historical version after a scheduled refresh.
