# analysis capability-gateway asset commands

> Prerequisite: follow [`../SKILL.md`](../SKILL.md), especially `PROJECT_ID_GATE`.

These commands use the capability gateway instead of MCP tool names. The CLI command shape is:

```bash
ae-cli analysis <resource> <action> [options]
```

Flags use kebab-case. The gateway input JSON uses snake_case. Do not pass camelCase flags or payload keys unless a nested backend DTO explicitly requires them inside `--payload`.

This file is an overview only. Before running an L2 command, read the dedicated command reference named `references/<resource>_<action>.md` with hyphens converted to underscores, for example `dashboard_report_data_export.md`. L3 capabilities without a dedicated reference use dynamic discovery per [`ae-capability`](../../ae-capability/SKILL.md) and the L3 section below.

## When to use

Use these commands for dashboard, BI panel, BI panel version, project-space, folder, favorite, public-link, dashboard-definition, dashboard-daily-report, and dashboard/BI page data workflows.

Prefer export commands for long-running or large data:

```bash
ae-cli analysis dashboard-report-data export --project-id 1 --dashboard-id 1001
ae-cli analysis run inspect --run-id run_0123456789abcdef0123456789abcdef
ae-cli analysis artifact download --run-id run_0123456789abcdef0123456789abcdef --artifact-id artifact_0123456789abcdef0123456789abcdef --output /tmp/dashboard.jsonl.gz
ae-cli analysis bi-panel-page-data export --project-id 1 --panel-id 2001 --page-key main --result-type charts
ae-cli analysis query cancel --run-id run_0123456789abcdef0123456789abcdef
```

## When not to use

Do not use these commands for ad-hoc model analysis, report definition, report data, drilldown, schema helpers, alerts, audience clusters/tags, project lookup, metadata governance, dashboard locks, BI panel lock, dashboard filters, UI reorder/tree/move operations, daily report retry/download/get-config, or public-link logs/source-list/get. Use the existing `+<tool_name>` references for those.

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

Export commands return `run_id`, `artifact_id`, `status`, `artifact_status`, `expires_at`, and `expires_at_iso`. They do not expose raw inspect/download API paths.

Artifact workflow:

1. Submit an export command and keep `data.run_id` and `data.artifact_id`.
2. Poll `ae-cli analysis run inspect --run-id <run_id>` every few seconds until `data.status` is terminal and `data.artifact_status` is complete.
3. Terminal success is `COMPLETED` or `SUCCEEDED`; terminal failure is `FAILED`, `CANCELED`, or `CANCELLED`. On failure, report the returned error fields instead of downloading.
4. Download with `ae-cli analysis artifact download --run-id <run_id> --artifact-id <artifact_id> --output <file>`.
5. Cancel long or abandoned exports with `ae-cli analysis query cancel --run-id <run_id>`.

Prefer the run/artifact commands over hand-written HTTP, Python, or curl. The descriptor paths are informational and may be internal `/api/cli/v1/...` paths behind a domain-routed CLI host.

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
| `dashboard copy` | `analysis.dashboard.copy` | Copy a dashboard; omitted target IDs copy to the source location | `--dashboard-id`, `--dashboard-name`, optional target IDs | Copied dashboard |
| `dashboard freeze` | `analysis.dashboard.freeze` | Freeze/unfreeze dashboards | `--dashboard-ids`, optional `--freeze false` | Freeze status |
| `dashboard abnormal-get` | `analysis.dashboard.abnormal_get` | Inspect abnormal dependencies | `--dashboard-id` | Abnormal info |
| `dashboard task-status` | `analysis.dashboard.task_status` | Inspect scheduled task status | `--dashboard-id` | Task status |
| `dashboard-report-data run` | `analysis.dashboard_report_data.run` | Bounded inline dashboard report data; `--filters` is analysis Filter JSON from `+get_filter_schema` | `--dashboard-id`, optional `--report-ids`, `--filters`, `--start-time`, `--end-time`, `--limit` | Inline data |
| `dashboard-report-data export` | `analysis.dashboard_report_data.export` | Large/long dashboard report data | same as run, plus optional `--artifact-format jsonl` | Async artifact descriptor |
| `run inspect` | `analysis.run.inspect` | Poll async export status | `--run-id` | Run and artifact status |
| `artifact download` | `analysis.artifact.download` | Download run-bound export artifact | `--run-id`, `--artifact-id`, `--output` | Local output file info |
| `query cancel` | `analysis.query.cancel` | Cancel gateway run/export | `--run-id`, optional `--reason` | Cancellation result |
| `dashboard-definition export` | `analysis.dashboard_definition.export` | Export dashboard definition JSON | `--dashboard-id`, `--dashboard-ids`, `--dashboard-folder-ids`, `--shared-spaces`, or `--payload` | Definition JSON |
| `dashboard-definition import` | `analysis.dashboard_definition.import` | Validate/import dashboard definition | `--definition`, optional `--validate-only true` | Validation or import result |
| `dashboard-daily-report update` | `analysis.dashboard_daily_report.update` | Update daily report config; defaults are sent when `--payload` is absent | `--dashboard-id`, optional config flags or `--payload` | Config result |
| `dashboard-daily-report send` | `analysis.dashboard_daily_report.send` | Send daily report immediately; no config flags means use saved config, missing saved config fails | `--dashboard-id`, optional config flags or `--payload` | Async send result |
| `bi-panel list` | `analysis.bi_panel.list` | Find accessible BI panels | `--project-id`, optional list filters | Paginated BI panel summaries |
| `bi-panel get` | `analysis.bi_panel.get` | Inspect released BI panel page structure only | `--panel-id`, optional `--fields` | Panel structure |
| `bi-panel create` | `analysis.bi_panel.create` | Create a BI panel | optional `--panel-name`, `--payload` | Created panel |
| `bi-panel update` | `analysis.bi_panel.update` | Update BI panel content/metadata | optional `--payload` | Update result |
| `bi-panel delete` | `analysis.bi_panel.delete` | Delete BI panels | `--panel-ids '[...]'` | Delete result |
| `bi-panel share` | `analysis.bi_panel.share` | Modify BI panel sharing | `--panel-id`, `--payload` | Share update result |
| `bi-panel copy` | `analysis.bi_panel.copy` | Copy a BI panel | optional source/target flags and `--payload` | Copied panel |
| `bi-panel-version get` | `analysis.bi_panel_version.get` | Inspect BI panel released or draft version | `--panel-id` or `--panel-uuid`, optional `--version-type release|draft` | Version detail |
| `bi-panel-version publish` | `analysis.bi_panel_version.publish` | Publish current BI panel draft after source version matches | `--panel-id` or `--panel-uuid`, `--source-version` | Published version |
| `bi-panel-page-data run` | `analysis.bi_panel_page_data.run` | Bounded inline BI page data | `--panel-id`, `--page-key`, `--result-type charts|summary` | Inline page data |
| `bi-panel-page-data export` | `analysis.bi_panel_page_data.export` | Large/long BI page data | same as run, optional `--artifact-format jsonl` | Async artifact descriptor |
| `project-space list` | `analysis.project_space.list` | Find accessible project spaces | `--project-id`, optional list filters | Paginated project spaces |
| `project-space get` | `analysis.project_space.get` | Inspect one project space | `--project-id`, `--space-id` | Project space detail |
| `favorite add` | `analysis.favorite.add` | Favorite dashboard/BI/folder | `--asset-id`, `--asset-type`, optional `--payload` | Favorite result |
| `favorite remove` | `analysis.favorite.remove` | Remove favorite | same as add | Remove result |
| `public-link create` | `analysis.public_link.create` | Generate public link | `--resource-type`, `--resource-id`, `--effective-at`, `--expires-at` | Link result |
| `public-link list` | `analysis.public_link.list` | List public links | `--project-id`, optional list filters | Paginated links |
| `public-link update` | `analysis.public_link.update` | Edit public link | `--link-id`, `--effective-at`, `--expires-at` | Update result |
| `public-link offline` | `analysis.public_link.offline` | Take links offline | `--link-id` or `--link-ids` | Offline result |
| `public-link delete` | `analysis.public_link.delete` | Delete public links | `--link-id` or `--link-ids` | Delete result |

## L3 project-space and folder capabilities

Per [`capability-command-admission` §10](../../../docs/capability-command-admission.md): new gateway capabilities default to **dynamic discovery** (`capability search` → `inspect` → `dry-run` → `run`); standalone skill references are **exceptions only** (L2 bar, confusion, high-risk delete, multi-step orchestration).

For **create / delete / share**, read the linked reference before `capability inspect/dry-run/run`. For **`*.members` read**, use this matrix only — no separate `references/*.md` (pilot).

| Capability ID | Use for | Reference / discovery |
| --- | --- | --- |
| `analysis.project_space.create` | Create a project space | [`project_space_create.md`](project_space_create.md) |
| `analysis.project_space.delete` | Delete project spaces | [`project_space_delete.md`](project_space_delete.md) |
| `analysis.project_space.share` | Modify project-space members | [`project_space_share.md`](project_space_share.md) |
| `analysis.project_space.members` | Read project-space members | Matrix only (see below) |
| `analysis.folder.create` | Create personal/project-space folder | [`folder_create.md`](folder_create.md) |
| `analysis.folder.delete` | Delete folders | [`folder_delete.md`](folder_delete.md) |
| `analysis.folder.share` | Modify folder members | [`folder_share.md`](folder_share.md) |
| `analysis.folder.members` | Read folder members | Matrix only (see below) |

### L3 members (matrix-only pilot)

Read-only member lists; `risk=read`. Do not use to modify members — use the matching `*.share` capability.

**When to use:** inspect who has access to a project space or folder.

**When not to use:** modify members → `analysis.project_space.share` or `analysis.folder.share`.

```bash
ae-cli capability inspect analysis.project_space.members
ae-cli capability run analysis.project_space.members --input '{"project_id":1,"space_id":10}'

ae-cli capability inspect analysis.folder.members
ae-cli capability run analysis.folder.members --input '{"project_id":1,"folder_id":1001}'
```

| field | type | required | capability |
| --- | --- | --- | --- |
| `project_id` | integer | yes | both |
| `space_id` | integer | yes | `project_space.members` |
| `folder_id` | integer | yes | `folder.members` |

Output is the gateway envelope; `data` contains members.

## Examples

```bash
ae-cli analysis dashboard list --project-id 1 --query retention --limit 20
ae-cli analysis dashboard update --project-id 1 --operation note-upsert --dashboard-id 1001 --note-title "Summary" --description "Weekly note" --yes
ae-cli analysis dashboard-definition export --project-id 1 --dashboard-id 1001 --export-file-name retention_dashboard
ae-cli analysis dashboard-definition import --project-id 1 --definition '{"dashboard_folders":[],"shared_spaces":[]}' --validate-only true
ae-cli analysis public-link create --project-id 1 --resource-type dashboard --resource-id 1001 --effective-at "2026-07-08 00:00:00" --expires-at "2026-08-08 00:00:00" --yes
```
