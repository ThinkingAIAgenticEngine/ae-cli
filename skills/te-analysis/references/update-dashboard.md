# analysis +update_dashboard (update dashboard)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Dashboard Management**

## Use Cases
- Update dashboard metadata. Supports three operations (all optional):
- (1) Rename dashboard
- (2) Add associated reports (append mode)
- (3) Replace share members (full replacement mode)
- Important constraints:
- Before replacing share members: call query_dashboard_detail first
- When managing members: call list_project_users to get valid userId mappings
- Update dashboard metadata.

## Commands
```bash
ae-cli analysis +update_dashboard --project_id 1 --dashboard_id 1
ae-cli analysis +update_dashboard --project_id 1 --dashboard_id 1 --dashboard_name demo --report_ids '[1001]' --member_authorities '{"1001":"READ"}'
ae-cli analysis +update_dashboard --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--dashboard_id` / `-d` | Yes | Dashboard ID |
| `--dashboard_name` | No | New dashboard name. If provided, updates the dashboard name. |
| `--report_ids` | No | List of report IDs to associate with the dashboard. Reports not already associated will be added (append mode, not a full replacement). |
| `--member_authorities` | No | Map of member userId to permissions (READ, EDIT, MAINTAIN). Full replacement mode — existing members not in this map will be removed. |

## Decision Rules
- For the first run, it is recommended to pass only the required parameters (`--project_id`, `--dashboard_id`) and add optional parameters after confirming the chain works.
- Wrap JSON parameters in single quotes (for example `--report_ids '{}'`, `--member_authorities '{}'`) to avoid shell escaping issues.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.
- Write operations keep the confirmation prompt by default; evaluate whether to use `--yes` only for automation scenarios.

## Next Step After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id`, `--dashboard_id`).
- If `Invalid JSON` appears, first validate with the smallest JSON structure (for example `{}` or `[]`), then add fields gradually.
- If the result after writing is not as expected, immediately reread the corresponding list/get interface and compare before and after.

## Recommended Chaining
- +list_dashboards -> +query_dashboard_detail -> +query_dashboard_report_data
