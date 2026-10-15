# analysis dashboard-report add

Use when the user explicitly wants to add existing saved reports to a dashboard.

Do not use for creating reports or dashboards. Create those assets first, then call this command with exact IDs.

Command:

```bash
ae-cli analysis dashboard-report add --project-id <project_id> --dashboard-id <dashboard_id> --report-ids '[1001,1002]'
```

Input sends `project_id`, `dashboard_id`, and `report_ids`.

Output is the gateway envelope. `data` contains `dashboard_id`, requested `report_ids`, and `added_count`.

Adding a report does not choose a table-card display. For an event table card, keep the exact created report ID and dashboard ID, then use [`dashboard-report update`](dashboard_report_update.md) with `--chart-type table`. Read that card's display through [`dashboard-report get`](dashboard_report_get.md), not `report get`.
