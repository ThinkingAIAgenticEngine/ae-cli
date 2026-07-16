# analysis_meta +create_metric (Create Metric)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Metadata Query**

## Use Cases
- When constructing real `events` / `params`, you must supplement project-native metadata; first call `analysis_meta +list_events` and `analysis_meta +list_properties`.
- Create a metric from analysis configuration.
- Creates a new metric based on event or retention analysis.

## MUST Prerequisites
- Before constructing `--events` / `--params`, you must first read and follow these reference documents:
  - [`./list_events.md`](./list_events.md)
  - [`./list_properties.md`](./list_properties.md)
- Do not generate the final `events` / `params` until the document review and prerequisite command calls above are complete.

## Prerequisite Call Chain (Required for Constructing events/params)
1. Determine `--model_type` first (`event` / `retention`).
2. Read `list_events.md`, then call `ae-cli analysis_meta +list_events --project_id <project_id>` to get available events.
3. Read `list_properties.md`, then call `ae-cli analysis_meta +list_properties --project_id <project_id>` to get available properties.
4. Build `events` / `params` from the metric API payload shape and verified metadata, then call `+create_metric`.
5. If an accessible URL must be returned, apply resource-link completion according to the unified skill constraints (call `analysis_common +get_resource_url`).

## Commands
```bash
ae-cli analysis_meta +create_metric --project_id <project_id> --name demo --display_name demo --model_type event --events '[]' --params '{}'
ae-cli analysis_meta +create_metric --project_id <project_id> --name demo --display_name demo --remark demo --model_type event --events '[]' --params '{}'
ae-cli analysis_meta +create_metric --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--name` | Yes | Metric name. Must start with a lowercase letter and contain only lowercase letters, digits, and underscores. Maximum length: 80. |
| `--display_name` | Yes | Metric display name |
| `--remark` | No | Optional metric remark |
| `--model_type` | Yes | Metric model type. Supported values: event and retention |
| `--events` | Yes | Metric events JSON. Fill event/property fields using metadata from `analysis_meta +list_events` / `analysis_meta +list_properties` in the same `project_id`. |
| `--params` | Yes | Metric params JSON. Use project metadata from `analysis_meta +list_events` / `analysis_meta +list_properties` when filling referenced fields. |

## Decision Rules
- `events` / `params` must not be handwritten by intuition alone: they must satisfy the metric API payload shape and the project's real metadata constraints.
- Set `--model_type` first, then use the matching schema; do not mix event/retention structures.
- Before calling `list_events` / `list_properties`, you must first study the corresponding reference documents.
- The smallest valid request still requires `--project_id`, `--name`, `--display_name`, `--model_type`, `--events`, and `--params`; do not omit the model definition to “test the path.” Use `--dry-run` with the complete request for preflight.
- Wrap JSON parameters in single quotes (for example `--events '{}'` and `--params '{}'`) to avoid shell escaping issues.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.
- This is an ordinary `write` operation and does not require CLI confirmation.

## Next Steps After Failure
- If required parameters are missing, complete all required fields listed above before retrying.
- If `Invalid JSON` appears, first check required fields, then verify whether the event and property names come from metadata query results in the same `project_id`.
- If the result after writing does not match expectations, immediately reread the corresponding list/get interfaces for before-and-after comparison.

## Recommended Chaining
- +list_metrics -> +create_metric -> +get_metric
