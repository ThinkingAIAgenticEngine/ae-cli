# analysis +list_public_access_links (public link search)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Dashboard Management**

## Use Cases
- List public access links in the project. Returns link IDs, short codes, access targets, status, effective time, expiration time, and related metadata.
- List public access links in the project.

## Commands
```bash
ae-cli analysis +list_public_access_links --project_id 1
ae-cli analysis +list_public_access_links --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |

## Decision Rules
- For the first run, it is recommended to pass only the required parameters (`--project_id`) and add optional parameters after confirming the chain works.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id`).
- If the result is empty, first confirm the project ID/keyword, then try broadening the filter conditions.

## Recommended Chaining
- +list_public_access_links -> +update_public_access_link
