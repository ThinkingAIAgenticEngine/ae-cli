# te_analysis +update_public_access_link (Update Public Access Link)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Dashboard management**

## Use Cases
- Update the access controls, remark, and effective time range of a public access link. Returns the updated link information.
- Update the access controls, remark, and effective time range of a public access link.

## Command
```bash
ae-cli te_analysis +update_public_access_link --project_id 1 --link_id 1 --access_controls '{}' --effective_at "2026-04-09 10:00:00" --expires_at "2026-04-10 10:00:00"
ae-cli te_analysis +update_public_access_link --project_id 1 --company_id 1 --link_id 1 --access_controls '{}' --remark demo --effective_at "2026-04-09 10:00:00" --expires_at "2026-04-10 10:00:00"
ae-cli te_analysis +update_public_access_link --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--company_id` | No | Optional company ID. If omitted, the company ID of the project is used. |
| `--link_id` | Yes | Link ID |
| `--access_controls` | Yes | Public access control JSON |
| `--remark` | No | Optional remark. Maximum length: 200 characters |
| `--effective_at` | Yes | Effective time. Format: yyyy-MM-dd HH:mm:ss |
| `--expires_at` | Yes | Expiration time. Format: yyyy-MM-dd HH:mm:ss |

## Decision Rules
- On the first run, start with only the required parameters (`--project_id`,`--link_id`,`--access_controls`), and add optional parameters after confirming the path works.
- Wrap JSON parameters in single quotes (for example `--access_controls '{}'`) to avoid shell escaping issues.
- When dates/time ranges are involved, first verify with a short range, then gradually expand the range.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id`, `--link_id`, `--access_controls`).
- If `Invalid JSON` appears, first verify with the smallest JSON structure (for example `{}` or `[]`), then add fields incrementally.
- If the result after writing does not match expectations, immediately read back the corresponding list/get interface to compare before and after.

## Recommended chaining
- +list_public_access_links -> +update_public_access_link
