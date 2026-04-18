# analysis +create_alert (Create Alert)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Metadata queries**

## Use Cases
- Precondition helper: call `+get_alert_definition_schema` to get the structure before using this tool.
- Create a new alert. After creation, use list_alerts or get_alert to retrieve the created alert. See get_alert_definition_schema for the parameter structure.
- Create a new alert.

## Mandatory prerequisites (MUST)
- Before constructing `--definition`, you must first read and follow:
  - [`./get-alert-definition-schema.md`](./get-alert-definition-schema.md)
- Do not generate the final `definition` until the documentation review and schema call are complete.

## Prerequisite call chain (required for constructing definition)
1. Read `get-alert-definition-schema.md` to understand the return structure of `+get_alert_definition_schema`.
2. Call `ae-cli analysis +get_alert_definition_schema` to get the schema.
3. Build `definition` from the schema, then call `+create_alert`.

## Command
```bash
ae-cli analysis +create_alert --project_id 1 --definition '{}'
ae-cli analysis +create_alert --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--definition` | Yes | Alert definition JSON. MUST call `+get_alert_definition_schema` first and strictly follow the returned structure. |

## Decision Rules
- `definition` cannot be written from experience alone: it must satisfy the alert schema structure constraints.
- On the first run, start with only the required parameters (`--project_id`, `--definition`) and add optional parameters after confirming the path works.
- Wrap JSON parameters in single quotes (for example `--definition '{}'`) to avoid shell escaping issues.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.
- Write operations keep the confirmation prompt by default; evaluate whether to use `--yes` for automated scenarios.

## Next Steps on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id` and `--definition`).
- If `Invalid JSON` appears, first check the schema required fields and enumeration values, then add fields incrementally.
- If the result after writing does not match expectations, immediately read back the corresponding list/get interface to compare before and after.

## Recommended chaining
- +get_alert_definition_schema -> +create_alert
