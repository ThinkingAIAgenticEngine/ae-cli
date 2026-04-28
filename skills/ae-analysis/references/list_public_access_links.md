# analysis +list_public_access_links (public link search)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Dashboard Management**

## Use Cases
- List public access links in the project. Returns link IDs, short codes, access targets, status, effective time, expiration time, and related metadata.
- Supports pagination with fields/limit/offset for payload governance.
- Query performs fuzzy matching on shorter and remarks.

## Commands
```bash
ae-cli analysis +list_public_access_links --project_id <project_id>
ae-cli analysis +list_public_access_links --project_id <project_id> --query demo
ae-cli analysis +list_public_access_links --project_id <project_id> --query demo --fields '["id","shorter","accessStatus"]' --limit 10 --offset 0
ae-cli analysis +list_public_access_links --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--query` / `-q` | No | Optional keyword filter. Fuzzy match on shorter and remarks. |
| `--fields` | No | Optional fields to return. Supported: id, shorter, creator, projectIdAndName, source, accessId, target, options, remarks, accessStatus, effectTime, expireTime, createTime, updateTime. Invalid fields cause INVALID_FIELDS error. |
| `--limit` | No | Optional limit. Default: 20, maximum: 50. |
| `--offset` | No | Optional offset. Default: 0. |

## Decision Rules
- For the first run, it is recommended to pass only the required parameters (`--project_id`) and add optional parameters after confirming the chain works.
- For pagination, use `--limit` and `--offset` together. Default limit is 20.
- Use `--fields` to select specific columns for lighter response payloads.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id`).
- If the result is empty, first confirm the project ID/keyword, then try broadening the filter conditions.
- If INVALID_FIELDS error appears, check that all field names in `--fields` match the supported list.

## Recommended Chaining
- +list_public_access_links -> +update_public_access_link
