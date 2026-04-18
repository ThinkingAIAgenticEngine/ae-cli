# te_analysis +get_alert (view alert definition)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Metadata Lookup**

## Use Cases
- Get detailed information about a specific alert by alertId.

## Commands
```bash
te-cli te_analysis +get_alert --project_id 1 --alert_id 1
te-cli te_analysis +get_alert --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--alert_id` / `-a` | Yes | Alert ID |

## Decision Rules
- For the first run, it is recommended to pass only the required parameters (`--project_id`, `--alert_id`) and add optional parameters after confirming the chain works.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id`, `--alert_id`).
- If reading fails, first verify whether the object ID exists and belongs to the current project.

## Recommended Chaining
- +get_alert
