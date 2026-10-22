# analysis dashboard-report update

Capability id: `analysis.dashboard_report.update`

Use when the user explicitly requests changing one report card's frame size or grid position, or one event card's presentation, on an analysis board (`看板`). Typed display and geometry flags are the L2 value: they select the card scope without exposing raw QP/UI fields.

Do not use for the source report definition, BI dashboards (`仪表盘`), report creation, or adding a report to a board. Frame size/position apply to saved report cards, not tag or note targets; chart/table presentation supports event cards only. Use [`report update`](report_update.md) for source report metadata/definition/chart/result-table layout.

```bash
ae-cli analysis dashboard-report update --project-id <project_id> --dashboard-id <dashboard_id> --report-id <report_id> --chart-type table --table-layout event --date-outside false
```

Input sends typed `project_id`, `dashboard_id`, `report_id`, and optional top-level `presentation`, `frame_size`, `position`, and `reports_version`. At least one display or geometry change is required; a version alone is not a change. Only supplied chart/table flags form `presentation`:

- `--chart-type line|combo|bar|stacked|cumulative|pie|table`: the selected card's chart. `table` is supported here, not in source-report presentation. Gateway validates the choice against the saved event definition; pie always needs grouping without time comparison. Total-time cards support bar/table, or pie only when those grouping/comparison conditions hold.
- `--table-layout date|event|group`: the table layout. Omission preserves the saved layout.
- `--date-outside true|false`: dates displayed outside the table. True requires a table card with a non-date layout and grouping; when the persisted layout is unknown, also send `--table-layout event` or `group` in the same update. Explicit false clears this setting; omission preserves it. This is not a switch for showing/hiding the entire date column.

For a deterministic installed layout, explicitly choose both `--table-layout` and `--date-outside`. Historical inherited fields missing from get must not be treated as `date`/false defaults.

## Frame size and position

Read [`dashboard-report get`](dashboard_report_get.md) first for the current card geometry and `reports_version`, then send the requested patch:

```bash
ae-cli analysis dashboard-report update --project-id <project_id> --dashboard-id <dashboard_id> --report-id <report_id> --frame-size medium --reports-version <fresh_reports_version>
ae-cli analysis dashboard-report update --project-id <project_id> --dashboard-id <dashboard_id> --report-id <report_id> --position-x <grid_x> --position-y <grid_y> --reports-version <fresh_reports_version>
```

- `--frame-size medium|large`: medium is 10x10 grid units; large is 20 columns wide and preserves a valid large-card height. Omit to preserve size. This does not change the chart type.
- `--position-x` and `--position-y`: supply both as non-negative integers. x is 0..19 and x plus the card width must not exceed 20; y is 0..10000 as a CLI safety bound against excessive page compaction work. These are zero-based grid coordinates, not an ordinal report index or pixels. Medium cards fit x=0..10; large cards require x=0.
- `--reports-version`: required for any size/position change, including a combined presentation patch. Use the fresh dashboard version, not `--report-version`. Zero is a valid initial version, not a conflict-check bypass.

The gateway preserves all other report, note, and tag entries and unknown layout settings. It rejects occupied destinations rather than silently moving other cards; combine size and position to choose a fitting unoccupied destination. The native page vertically compacts gaps, so the saved coordinates are a grid placement intent, not a promise to keep empty vertical space. Layout changes never add/remove cards or modify the source report.

Position changes require an initialized, valid saved layout containing the target card. If unavailable, save the board layout in the analysis page first; do not invent missing card positions or overwrite the full dashboard definition. A size-only change can update an uninitialized board without inventing its layout. Existing malformed layouts still fail safely. Stale versions and invalid mixed updates cause no partial layout, size, or presentation writes; reread and explicitly choose a new update after a conflict. Legacy presentation-only requests do not require a layout version.

## Event chart and table presentation

`--chart-type combo` selects the trend family only when the source already has combo series; it does not author series. The card inherits source-report metric styles/axes, including when the board's button is labeled trend/line. To get a pure line, reset the source first; a card `--chart-type line` against source combo is rejected rather than misreporting success. Read [event-report presentation](event_report_presentation.md) for source-series edits and their cross-card impact. There is no card `--series` flag or card-local series override.

The report must already belong to the exact dashboard. For a new table card, create the event report, associate it through `report create --dashboard-ids` or [`dashboard-report add`](dashboard_report_add.md), then update with the exact returned report ID. Read existing presentation with [`dashboard-report get`](dashboard_report_get.md) when necessary; do not regenerate its definition for a display-only request.

Only the selected card's requested geometry/presentation changes. Omitted presentation fields, its source report definition/chart, and other dashboards remain unchanged. Never send `graphShape`, `reportGraphShape`, `tableFormat`, or `dateOutside` as CLI JSON fields. `--dry-run` previews the same targeted update when requested; ordinary writes do not require a delete confirmation.

Output is the gateway envelope. `data` contains the selected project/dashboard/report IDs, `model_type`, `updated`, readable `frame_size`, and `reports_version`; a valid initialized layout also returns `position` and `layout_size`. Event cards include `presentation` after the update; non-event cards omit it. Use these returned values as card-display evidence; a successful mutation is not proof that a report data query succeeded.
