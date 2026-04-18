# te_analysis +create_public_access_link (create public access link)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Dashboard Management**

## Use Cases
- Create a public access link for the project.
- Creates a public link that allows unauthenticated users to access a specified dashboard or BI panel.
- Returns the created link ID and short-link identifier.

## Commands
```bash
te-cli te_analysis +create_public_access_link --project_id 1 --resource_type dashboard --resource_id 1 --access_controls '{}' --effective_at "2026-04-09 10:00:00" --expires_at "2026-04-10 10:00:00"
te-cli te_analysis +create_public_access_link --project_id 1 --company_id 1 --resource_type dashboard --resource_id 1 --access_controls '{}' --remark demo --effective_at "2026-04-09 10:00:00" --expires_at "2026-04-10 10:00:00"
te-cli te_analysis +create_public_access_link --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--company_id` | No | Optional company ID. If omitted, the company ID of the project is used. |
| `--resource_type` | Yes | Access target type. Supported values: dashboard (dashboard) and bi_panel (BI panel). |
| `--resource_id` | Yes | Access target ID. Use a dashboard ID when resourceType is dashboard, and a BI panel ID when resourceType is bi_panel. |
| `--access_controls` | Yes | Public access control JSON. Effective when resourceType is dashboard. DN controls whether the dashboard title is shown (1: shown, 2: hidden); GF controls whether filters are shown (1: shown and editable, 2: hidden, 3: shown but not editable); UA controls whether refresh is allowed (1: shown, 2: hidden). Pass JSON format. The default for dashboard is {"DN":"1","GF":"3","UA":"2"}; the default for bi_panel is {}. |
| `--remark` | No | Optional remark. Maximum length: 200 characters. |
| `--effective_at` | Yes | Effective time. Format: yyyy-MM-dd HH:mm:ss |
| `--expires_at` | Yes | Expiration time. Format: yyyy-MM-dd HH:mm:ss |

## Decision Rules
- For the first run, it is recommended to pass only the required parameters (`--project_id`, `--resource_type`, `--resource_id`) and add optional parameters after confirming the chain works.
- Wrap JSON parameters in single quotes (for example `--access_controls '{}'`) to avoid shell escaping issues.
- When dates/time ranges are involved, validate with a short range first and then expand gradually.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id`, `--resource_type`, `--resource_id`).
- If `Invalid JSON` appears, first validate with the smallest JSON structure (for example `{}` or `[]`), then add fields gradually.
- If the result after writing is not as expected, immediately reread the corresponding list/get interface and compare before and after.

## Recommended Chaining
- +create_public_access_link -> +list_public_access_links
