# analysis capability-gateway asset commands

> Prerequisite: follow [`../SKILL.md`](../SKILL.md), especially `PROJECT_ID_GATE`.

These commands use the capability gateway instead of MCP tool names. The CLI command shape is:

```bash
ae-cli analysis <resource> <action> [options]
```

Flags use kebab-case. The gateway input JSON uses snake_case. Do not pass camelCase flags or payload keys unless a nested backend DTO explicitly requires them inside `--payload`.

This file is an overview only. Before running one command, read the dedicated command reference named `references/<resource>_<action>.md` with hyphens converted to underscores, for example `dashboard_report_data_export.md`.

## When to use

Use these commands for dashboard, BI panel, project-space, folder, favorite, public-link, dashboard-definition, dashboard-daily-report, and dashboard/BI page data workflows.

Prefer export commands for long-running or large data:

```bash
ae-cli analysis dashboard-report-data export --project-id 1 --dashboard-id 1001
ae-cli analysis bi-panel-page-data export --project-id 1 --panel-id 2001 --page-key main --result-type charts
ae-cli analysis query cancel --run-id run_0123456789abcdef0123456789abcdef
```

## When not to use

Do not use these commands for ad-hoc model analysis, report definition, report data, drilldown, schema helpers, alerts, audience clusters/tags, project lookup, metadata governance, dashboard locks, BI panel version/lock, dashboard filters, UI reorder/tree/move operations, daily report retry/download/get-config, or public-link logs/source-list/get. Use the existing `+<tool_name>` references for those.

## Output

All commands return the gateway envelope:

```json
{
  "ok": true,
  "data": {},
  "meta": {}
}
```

Failures return:

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_QUERY_REQUEST",
    "message": "..."
  }
}
```

Export commands return `run_id`, `artifact_id`, `status`, `artifact_status`, `inspect_path`, `download_path`, `expires_at`, and `expires_at_iso`. Download the artifact through the returned path; cancel by `run_id`.

## Command matrix

| Command | Capability ID | Use for | Key input | Output |
| --- | --- | --- | --- | --- |
| `dashboard list` | `analysis.dashboard.list` | Find accessible dashboards | `--project-id`, optional `--query`, `--fields`, `--limit`, `--offset` | Paginated dashboard summaries |
| `dashboard create` | `analysis.dashboard.create` | Create a dashboard | `--project-id`, `--dashboard-name`, optional `--space-id`, `--folder-id` | Created dashboard |
| `dashboard get` | `analysis.dashboard.get` | Inspect one dashboard definition/share/report structure, including creator and creation/update time | `--project-id`, `--dashboard-id` | Dashboard detail |
| `dashboard update` | `analysis.dashboard.update` | Update settings or upsert a note | `--operation settings|note-upsert`, IDs, optional `--payload` | Update result |
| `dashboard share-info` | `analysis.dashboard.share_info` | Read dashboard sharing info | `--project-id`, `--dashboard-id` | Share info |
| `dashboard share` | `analysis.dashboard.share` | Modify dashboard sharing | `--project-id`, `--dashboard-id`, `--payload` or `--member-authorities` | Share update result |
| `dashboard delete` | `analysis.dashboard.delete` | Delete dashboards | `--project-id`, `--dashboard-ids '[...]'` | Delete result |
| `dashboard handover` | `analysis.dashboard.handover` | Transfer dashboards | `--dashboard-ids`, `--to-user-id` | Handover result |
| `dashboard copy` | `analysis.dashboard.copy` | Copy a dashboard | `--dashboard-id`, `--dashboard-name`, optional target IDs | Copied dashboard |
| `dashboard freeze` | `analysis.dashboard.freeze` | Freeze/unfreeze dashboards | `--dashboard-ids`, optional `--freeze false` | Freeze status |
| `dashboard abnormal-get` | `analysis.dashboard.abnormal_get` | Inspect abnormal dependencies | `--dashboard-id` | Abnormal info |
| `dashboard task-status` | `analysis.dashboard.task_status` | Inspect scheduled task status | `--dashboard-id` | Task status |
| `dashboard-report-data run` | `analysis.dashboard_report_data.run` | Bounded inline dashboard report data | `--dashboard-id`, optional `--report-ids`, `--start-time`, `--end-time`, `--limit` | Inline data |
| `dashboard-report-data export` | `analysis.dashboard_report_data.export` | Large/long dashboard report data | same as run, plus optional `--artifact-format jsonl` | Async artifact descriptor |
| `query cancel` | `analysis.query.cancel` | Cancel gateway run/export | `--run-id`, optional `--reason` | Cancellation result |
| `dashboard-definition export` | `analysis.dashboard_definition.export` | Export dashboard definition JSON | `--dashboard-folder-ids`, `--shared-spaces`, or `--payload` | Definition JSON |
| `dashboard-definition import` | `analysis.dashboard_definition.import` | Validate/import dashboard definition | `--definition`, optional `--validate-only true` | Validation or import result |
| `dashboard-daily-report update` | `analysis.dashboard_daily_report.update` | Update daily report config | `--dashboard-id`, optional config flags or `--payload` | Config result |
| `dashboard-daily-report send` | `analysis.dashboard_daily_report.send` | Send daily report immediately | `--dashboard-id`, optional `--payload` | Async send result |
| `bi-panel list` | `analysis.bi_panel.list` | Find accessible BI panels | `--project-id`, optional list filters | Paginated BI panel summaries |
| `bi-panel get` | `analysis.bi_panel.get` | Inspect released BI panel page structure | `--panel-id`, optional `--fields` | Panel structure |
| `bi-panel create` | `analysis.bi_panel.create` | Create a BI panel | optional `--panel-name`, `--payload` | Created panel |
| `bi-panel update` | `analysis.bi_panel.update` | Update BI panel content/metadata | optional `--payload` | Update result |
| `bi-panel delete` | `analysis.bi_panel.delete` | Delete BI panels | `--panel-ids '[...]'` | Delete result |
| `bi-panel share` | `analysis.bi_panel.share` | Modify BI panel sharing | `--panel-id`, `--payload` | Share update result |
| `bi-panel copy` | `analysis.bi_panel.copy` | Copy a BI panel | optional source/target flags and `--payload` | Copied panel |
| `bi-panel-page-data run` | `analysis.bi_panel_page_data.run` | Bounded inline BI page data | `--panel-id`, `--page-key`, `--result-type charts|summary` | Inline page data |
| `bi-panel-page-data export` | `analysis.bi_panel_page_data.export` | Large/long BI page data | same as run, optional `--artifact-format jsonl` | Async artifact descriptor |
| `project-space list` | `analysis.project_space.list` | Find accessible project spaces | `--project-id`, optional list filters | Paginated project spaces |
| `project-space get` | `analysis.project_space.get` | Inspect one project space | `--project-id`, `--space-id` | Project space detail |
| `project-space create` | `analysis.project_space.create` | Create a project space | `--space-name` or `--payload` | Created space |
| `project-space delete` | `analysis.project_space.delete` | Delete project spaces | `--space-id` or `--space-ids` | Delete result |
| `project-space share` | `analysis.project_space.share` | Modify project-space members | `--space-id`, `--payload` | Share update result |
| `project-space members` | `analysis.project_space.members` | Read project-space members | `--space-id` | Members |
| `folder create` | `analysis.folder.create` | Create personal/project-space folder | `--folder-name`, optional `--space-id`, `--parent-folder-id` | Created folder |
| `folder delete` | `analysis.folder.delete` | Delete folders | `--folder-id` or `--folder-ids`, optional `--space-id` | Delete result |
| `folder share` | `analysis.folder.share` | Modify folder members | `--folder-id`, `--payload` | Share update result |
| `folder members` | `analysis.folder.members` | Read folder members | `--folder-id` | Members |
| `favorite add` | `analysis.favorite.add` | Favorite dashboard/BI/folder | `--asset-id`, `--asset-type`, optional `--payload` | Favorite result |
| `favorite remove` | `analysis.favorite.remove` | Remove favorite | same as add | Remove result |
| `public-link create` | `analysis.public_link.create` | Generate public link | `--resource-type`, `--resource-id`, `--effective-at`, `--expires-at` | Link result |
| `public-link list` | `analysis.public_link.list` | List public links | `--project-id`, optional list filters | Paginated links |
| `public-link update` | `analysis.public_link.update` | Edit public link | `--link-id`, `--effective-at`, `--expires-at` | Update result |
| `public-link offline` | `analysis.public_link.offline` | Take links offline | `--link-id` or `--link-ids` | Offline result |
| `public-link delete` | `analysis.public_link.delete` | Delete public links | `--link-id` or `--link-ids` | Delete result |

## Examples

```bash
ae-cli analysis dashboard list --project-id 1 --query retention --limit 20
ae-cli analysis dashboard update --project-id 1 --operation note-upsert --dashboard-id 1001 --note-title "Summary" --description "Weekly note" --yes
ae-cli analysis dashboard-definition import --project-id 1 --definition '{"dashboard_folders":[],"shared_spaces":[]}' --validate-only true
ae-cli analysis public-link create --project-id 1 --resource-type dashboard --resource-id 1001 --effective-at "2026-07-08 00:00:00" --expires-at "2026-08-08 00:00:00" --yes
```
