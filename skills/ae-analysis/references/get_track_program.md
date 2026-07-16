# analysis_meta +get_track_program (Read Tracking Plan Baseline)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Project Configuration**

## Use Cases
- Query TRACKING-PLAN metadata (bury program), including planned events/properties/common properties. This is NOT system metadata. Do NOT use MetaTool/MetaPowerTool for these plan objects.
- Query TRACKING-PLAN metadata (bury program), including planned events/properties/common properties.

## Output
Returns the current plan content. An empty plan permits first-time generation; a non-empty result must be reviewed before any merge-generating operation.

## Commands
```bash
ae-cli analysis_meta +get_track_program --project_id <project_id>
ae-cli analysis_meta +get_track_program --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |

## Decision Rules
- For the first run, pass only the required parameter (`--project_id`) to confirm the path works, then add optional parameters.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id`).
- If reading fails, first verify that the object ID exists and belongs to the current project.

## Recommended Chaining
- +get_project_config -> +get_track_program
