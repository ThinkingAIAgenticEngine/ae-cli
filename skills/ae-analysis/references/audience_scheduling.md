# Tag and cluster automatic refresh

Use the same page-compatible `--enable-auto-refresh` and `--auto-refresh-schedule` flags for condition/SQL user-cluster and user-tag create/update. ID-file operations have their own contracts.

## Schedule shapes

```json
{"frequency":"daily","time":"02:30"}
{"frequency":"daily_multiple","hours":[8,12,18],"minutes":[0,30]}
{"frequency":"weekly","time":"02:30","weekdays":[1,5]}
{"frequency":"monthly","time":"02:30","month_days":[1,15,31]}
```

- `daily`, `weekly`, and `monthly` require one 24-hour `time` in `HH:mm` format. Weekly also requires a non-empty ISO weekday array (1=Monday, 7=Sunday); monthly requires a non-empty day array (1-31). Dates absent from a month are skipped.
- `daily_multiple` requires non-empty integer `hours` (0-23) and `minutes` (only 0, 15, 30, 45) arrays. It runs at every combination of the selected hours and minutes, exactly like the page. The example runs at 08:00, 08:30, 12:00, 12:30, 18:00, and 18:30. It cannot run more frequently than every 15 minutes.
- Do not mix fields from different frequencies. The backend sorts and deduplicates selections, saves the page's DAY/DAYS/WEEK/MONTH configuration, and preserves page editing.

## Create and update

A supplied schedule enables periodic refresh in the same write. On create, omitting the switch and schedule leaves periodic refresh disabled. `--enable-auto-refresh true` requires a schedule on create.

On update, omitting both flags preserves the saved switch and plan. `--enable-auto-refresh false` disables periodic refresh; do not supply a schedule with false. True can reuse a saved plan, but the backend checks that it meets the current page limits. If no valid plan exists, provide an explicit structured replacement. Unchanged legacy plans are not silently rewritten; metadata-only updates and disabling an unsafe plan remain possible.

Schedules use the asset timezone. Omit `--zone-offset` on update to preserve it; use a project-supported offset when changing it. Retain the selected timezone during schedule-only updates. Scheduled refresh is separate from the initial calculation: do not manually call refresh after create or a definition update. A schedule-only update does not request immediate recomputation.

Read `analysis user-tag get` or `analysis user-cluster get` after writing and verify the enable state, `scheduler_ui_config`, and saved timezone. Use `--validate` to check input or `--dry-run` for a no-write preview. Cluster update retains its existing high-risk-write confirmation flow.

## Historical tag values

Tags additionally support `--enable-history-tag-backup true|false`; clusters do not gain this tag-only option. Enabling requires periodic refresh. Omission preserves the saved switch on update. A backup-only update does not start an immediate calculation.
