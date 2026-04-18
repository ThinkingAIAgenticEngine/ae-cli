# te_meta +update_metric (Update Metric)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Metadata Query**

## Use Cases
- Before updating `events` / `params`, you must first obtain the corresponding model schema and supplement the project with real event/property metadata.
- Update a metric definition. Currently only the event and retention models are supported. Returns the updated metric information without executing metric calculation.
- Update a metric definition.

## MUST Prerequisites
- Before updating `--events` / `--params`, you must first read and follow these reference documents:
  - [`../../te-analysis/references/get-analysis-query-schema.md`](../../te-analysis/references/get-analysis-query-schema.md)
  - [`./list-events.md`](./list-events.md)
  - [`./list-properties.md`](./list-properties.md)
- Do not submit new `events` / `params` until the document review and prerequisite command calls above are complete.

## Prerequisite Call Chain (Required for Updating events/params)
1. Determine `--model_type` first (`event` / `retention`).
2. Read `get-analysis-query-schema.md`, then call `te-cli te_analysis +get_analysis_query_schema --model_type <event|retention>` to get the structure.
3. Read `list-events.md`, then call `te-cli te_meta +list_events --project_id 1`.
4. Read `list-properties.md`, then call `te-cli te_meta +list_properties --project_id 1`.
5. Build the new `events` / `params` from the schema + metadata, then execute `+update_metric`.

## Commands
```bash
te-cli te_meta +update_metric --project_id 1 --metric_id 1 --name demo --display_name demo --model_type event --events '[]'
te-cli te_meta +update_metric --project_id 1 --metric_id 1 --name demo --display_name demo --remark demo --model_type event --events '[]' --params '{}'
te-cli te_meta +update_metric --dry-run
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
| `--events` | Yes | Metric event JSON. MUST follow `+get_analysis_query_schema` for the selected `model_type`, and use fields validated by `te_meta +list_events` / `te_meta +list_properties` in the same `project_id`. |
| `--params` | No | Metric params JSON. If provided, MUST follow the schema from `+get_analysis_query_schema` and use project metadata from `te_meta +list_events` / `te_meta +list_properties`. |

## Decision Rules
- `events` / `params` must not be handwritten by intuition alone: they must satisfy both the schema structure and the project's real metadata constraints.
- Set `--model_type` first, then use the matching schema; do not mix event/retention structures.
- Before calling `list_events` / `list_properties`, you must first study the corresponding reference documents.
- For the first run, pass only the required parameters (`--project_id`, `--metric_id`, `--name`) to confirm the path works, then add optional parameters.
- Wrap JSON parameters in single quotes (for example `--events '{}'` and `--params '{}'`) to avoid shell escaping issues.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.
- Write operations keep confirmation prompts by default; evaluate whether to use `--yes` only for automation scenarios.

## Next Steps After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id`, `--metric_id`, and `--name`).
- If `Invalid JSON` appears, first check the schema's required fields, then verify whether the event and property names come from metadata query results in the same `project_id`.
- If the result after writing does not match expectations, immediately reread the corresponding list/get interfaces for before-and-after comparison.

## Recommended Chaining
- +get_analysis_query_schema -> te_meta +list_events -> te_meta +list_properties -> +update_metric
- +list_metrics -> +get_metric -> +update_metric
