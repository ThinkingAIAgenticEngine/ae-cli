# analysis +update_report (Update Report)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Report Management**

## Use Cases
- Update an existing report's name, description, or QP (query parameter JSON).
- At least one of `--report_name`, `--report_desc`, or `--qp` must be provided.
- When updating `--qp`, also provide `--report_model` for QP validation.

## Commands
```bash
ae-cli analysis +update_report --project_id <project_id> --report_id <report_id> --version <version> --report_name "New Name"
ae-cli analysis +update_report --project_id <project_id> --report_id <report_id> --version <version> --qp '<qp_json>' --report_model 1
ae-cli analysis +update_report --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--report_id` | Yes | Report ID to update |
| `--version` | Yes | Current report version number. Retrieve via `+get_report_definition`. |
| `--report_name` | No | New report name. Omit to keep existing. |
| `--report_desc` | No | New report description. Omit to keep existing. |
| `--qp` | No | New QP JSON string. Omit to keep existing. When provided, also supply `--report_model`. |
| `--report_model` | No | Analysis model type integer (e.g. 1=event, 2=retention). Required when `--qp` is provided. |

## Decision Rules
- Always call `+get_report_definition` first to retrieve the current `version` number before updating.
- Omitting all of `report_name`, `report_desc`, and `qp` will cause an error.

## Recommended Chain
- `+list_reports` -> `+get_report_definition` (to get version) -> `+update_report`
