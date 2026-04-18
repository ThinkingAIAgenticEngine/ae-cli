# te_meta +create_metric (Create Metric)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Metadata Query**

## Use Cases
- Preliminary step: call `+get_analysis_query_schema` to get the structure, then call this tool.
- When constructing real `events` / `params`, you must supplement project-native metadata; first call `te_meta +list_events` and `te_meta +list_properties`.
- Create a metric from analysis configuration.
- Creates a new metric based on event or retention analysis.

## MUST Prerequisites
- Before constructing `--events` / `--params`, you must first read and follow these reference documents:
  - [`../../te-analysis/references/get-analysis-query-schema.md`](../../te-analysis/references/get-analysis-query-schema.md)
  - [`./list-events.md`](./list-events.md)
  - [`./list-properties.md`](./list-properties.md)
- Do not generate the final `events` / `params` until the document review and prerequisite command calls above are complete.

## Prerequisite Call Chain (Required for Constructing events/params)
1. Determine `--model_type` first (`event` / `retention`).
2. Read `get-analysis-query-schema.md`, then call `te-cli te_analysis +get_analysis_query_schema --model_type <event|retention>` to get the structure.
3. Read `list-events.md`, then call `te-cli te_meta +list_events --project_id 1` to get available events.
4. Read `list-properties.md`, then call `te-cli te_meta +list_properties --project_id 1` to get available properties.
5. Build `events` / `params` from the schema + metadata, then call `+create_metric`.
6. If an accessible URL must be returned, apply resource-link completion according to the unified `te-common` constraints (call `te_common +get_resource_url`).

## Commands
```bash
te-cli te_meta +create_metric --project_id 1 --name demo --display_name demo --model_type event --events '[]' --params '{}'
te-cli te_meta +create_metric --project_id 1 --name demo --display_name demo --remark demo --model_type event --events '[]' --params '{}'
te-cli te_meta +create_metric --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--name` | Yes | Metric name. Must start with a lowercase letter and contain only lowercase letters, digits, and underscores. Maximum length: 80. |
| `--display_name` | Yes | Metric display name |
| `--remark` | No | Optional metric remark |
| `--model_type` | Yes | Metric model type. Supported values: event and retention |
| `--events` | Yes | Metric events JSON. MUST call `+get_analysis_query_schema` first, then fill event/property fields using metadata from `te_meta +list_events` / `te_meta +list_properties` in the same `project_id`. |
| `--params` | Yes | Metric params JSON. MUST follow the schema from `+get_analysis_query_schema`; use project metadata from `te_meta +list_events` / `te_meta +list_properties` when filling referenced fields. |

## Decision Rules
- `events` / `params` must not be handwritten by intuition alone: they must satisfy both the schema structure and the project's real metadata constraints.
- Set `--model_type` first, then use the matching schema; do not mix event/retention structures.
- Before calling `list_events` / `list_properties`, you must first study the corresponding reference documents.
- For the first run, pass only the required parameters (`--project_id`, `--name`, `--display_name`) to confirm the path works, then add optional parameters.
- Wrap JSON parameters in single quotes (for example `--events '{}'` and `--params '{}'`) to avoid shell escaping issues.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.
- Write operations keep confirmation prompts by default; evaluate whether to use `--yes` only for automation scenarios.

## Next Steps After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id`, `--name`, and `--display_name`).
- If `Invalid JSON` appears, first check the schema's required fields, then verify whether the event and property names come from metadata query results in the same `project_id`.
- If the result after writing does not match expectations, immediately reread the corresponding list/get interfaces for before-and-after comparison.

## Recommended Chaining
- +get_analysis_query_schema -> te_meta +list_events -> te_meta +list_properties -> +create_metric
- +list_metrics -> +create_metric -> +get_metric
