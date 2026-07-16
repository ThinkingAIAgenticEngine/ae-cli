# analysis_meta +update_metric (Update Metric)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Metadata Query**

## Use Cases
- Before updating `events` / `params`, you must supplement the payload with real event/property metadata.
- Update a metric definition. Currently only the event and retention models are supported. Returns the updated metric information without executing metric calculation.
- Update a metric definition.

## MUST Prerequisites
- Before updating `--events` / `--params`, you must first read and follow these reference documents:
  - [`./list_events.md`](./list_events.md)
  - [`./list_properties.md`](./list_properties.md)
- Do not submit new `events` / `params` until the document review and prerequisite command calls above are complete.

## Prerequisite Call Chain (Required for Updating events/params)
1. Determine `--model_type` first (`event` / `retention`).
2. Read `list_events.md`, then call `ae-cli analysis_meta +list_events --project_id <project_id>`.
3. Read `list_properties.md`, then call `ae-cli analysis_meta +list_properties --project_id <project_id>`.
4. Build the new `events` / `params` from the metric API payload shape and verified metadata, then execute `+update_metric`.

## Commands
```bash
ae-cli analysis_meta +update_metric --project_id <project_id> --metric_id 1 --name demo --display_name demo --model_type event --events '[]'
ae-cli analysis_meta +update_metric --project_id <project_id> --metric_id 1 --name demo --display_name demo --remark demo --model_type event --events '[]' --params '{}'
ae-cli analysis_meta +update_metric --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--metric_id` / `-m` | Yes | Metric ID |
| `--name` | Yes | Metric name. Must start with a lowercase letter and contain only lowercase letters, digits, and underscores. Maximum length: 80. |
| `--display_name` | Yes | Metric display name |
| `--remark` | No | Optional metric remark |
| `--model_type` | Yes | Metric model type. Currently supports event and retention. |
| `--events` | Yes | Metric event JSON. Use fields validated by `analysis_meta +list_events` / `analysis_meta +list_properties` in the same `project_id`. |
| `--params` | No | Metric params JSON. If provided, use project metadata from `analysis_meta +list_events` / `analysis_meta +list_properties`. |

## Decision Rules
- `events` / `params` must not be handwritten by intuition alone: they must satisfy the metric API payload shape and the project's real metadata constraints.
- Set `--model_type` first, then use the matching schema; do not mix event/retention structures.
- Before calling `list_events` / `list_properties`, you must first study the corresponding reference documents.
- The smallest valid request still requires `--project_id`, `--metric_id`, `--name`, `--display_name`, `--model_type`, and `--events`; do not omit the new definition to “test the path.” Use `--dry-run` with the complete request for preflight.
- Wrap JSON parameters in single quotes (for example `--events '{}'` and `--params '{}'`) to avoid shell escaping issues.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.
- This is an ordinary `write` operation and does not require CLI confirmation.

## Next Steps After Failure
- If required parameters are missing, complete all required fields listed above before retrying.
- If `Invalid JSON` appears, first check required fields, then verify whether the event and property names come from metadata query results in the same `project_id`.
- If the result after writing does not match expectations, immediately reread the corresponding list/get interfaces for before-and-after comparison.

## Recommended Chaining
- +list_metrics -> +get_metric -> +update_metric
