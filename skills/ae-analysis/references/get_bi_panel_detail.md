# analysis +get_bi_panel_detail (read BI panel structure)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **BI panel management**

## Use Cases
- Read a BI panel's released structure without querying data.
- Inspect pages, queryable charts, summary page metadata, dashboard-level parameter controls, dashboard-level permission controls, and page chart filter controls.
- Get `pageKey`, `chartId`, `defaultColumns`, and control schemas needed by `+query_bi_panel_data`.

## Command
```bash
ae-cli analysis +get_bi_panel_detail --project_id <project_id> --panel_id <panel_id>
ae-cli analysis +get_bi_panel_detail --project_id <project_id> --panel_id <panel_id> --fields '["basic","pages","charts","parameterControls","permissionControls","chartFilterControls","summary"]'
ae-cli analysis +get_bi_panel_detail --project_id <project_id> --panel_id <panel_id> --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--panel_id` | Yes | BI panel ID returned by `+list_bi_panels` |
| `--fields` / `-f` | No | Optional detail sections. Supported values: `basic`, `pages`, `charts`, `parameterControls`, `permissionControls`, `chartFilterControls`, `summary`. |

## Decision Rules
- This command reads the released BI panel version only. It does not expose version selection.
- Use `charts` and the three control sections when preparing `+query_bi_panel_data`.
- `parameterControls` are dashboard-level parameter controls and keep single-value semantics.
- `permissionControls` are dashboard-level permission control values. Their `allowedValues` are hints, not an MCP-side whitelist.
- `chartFilterControls` are page-level filter controls and apply only to their `boundChartIds`. Some filters are stored as `pageCharts` components and are returned as non-queryable filter controls.
- Do not infer internal fields such as `paramList`, `permissionFilters`, `visualCfg`, `whereList`, `field`, `columnName`, `userId`, or `openId`.

## Recommended Chaining
- `+list_bi_panels` -> `+get_bi_panel_detail` -> `+query_bi_panel_data`
