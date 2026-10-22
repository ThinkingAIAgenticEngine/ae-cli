# analysis dashboard-report get

Capability id: `analysis.dashboard_report.get`

Use when the user needs the frame size, saved grid position, or event presentation of one report card on an analysis board (`看板`). This L2 command uses typed IDs to distinguish the card from the source report and other boards.

Do not use it to read a report definition or execute data. Use [`report get`](report_get.md) for the source definition, or `dashboard-report-data run/export` for the card's data. Frame geometry applies to saved report cards; chart/table presentation is available only for event cards. Tag and note cards are not `report_id` targets.

```bash
ae-cli analysis dashboard-report get --project-id <project_id> --dashboard-id <dashboard_id> --report-id <report_id>
```

Input sends `project_id`, `dashboard_id`, and `report_id`. The report must already belong to that dashboard; use [`dashboard-report add`](dashboard_report_add.md) only when the user requests adding it.

Output is the gateway envelope. `data` contains `project_id`, `dashboard_id`, `report_id`, `model_type`, and semantic `presentation`: effective `chart_type`, plus `table_layout` and `date_outside` when persisted and readable. Historical layouts/settings that inherit browser configuration omit these fields; absence means inherited/unknown, not `table_layout=date` or `date_outside=false`. Read the selected card's presentation, not the source report's chart. A table card can coexist with the source report's line chart (internal code `L0`); this is expected and does not establish missing conditions or corrupted definitions.

For an authorized display change, use [`dashboard-report update`](dashboard_report_update.md). Get is read-only and does not alter the source definition, card, or other dashboards.

The response also includes `reports_version`, the dashboard's layout version, and `frame_size` when readable. Historical small cards can return `small`; updates currently accept only `medium` or `large`. A valid saved layout adds `position: {x,y}` and `layout_size: {w,h}`. Coordinates and dimensions are grid units on a 20-column board, not pixels; x/y are zero-based. Missing geometry means the saved layout is uninitialized or unreadable, not position `(0,0)`. Preserve that uncertainty. Non-event cards omit event `presentation`.

Use the fresh `reports_version` for size or position writes; this is not the source report's `version`. Conflicts require a new read and a deliberate update, not an automatic retry. Read-only permission does not authorize layout edits.

For an effective card trend/combination chart, `presentation.series_scope=report` and `series` describe inherited source-report styles/axes, not card-local configuration. The board's trend button can render a source combo; use returned `chart_type=combo` and the series as evidence. Read [event-report presentation](event_report_presentation.md) before a source-series edit because it affects other trend cards too.
