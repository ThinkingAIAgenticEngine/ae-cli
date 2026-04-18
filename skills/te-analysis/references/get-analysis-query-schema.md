# analysis +get_analysis_query_schema (Get Analysis Query Schema)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Model schema queries**

- This is the documentation for the `+get_analysis_query_schema` command; read it before running `ae-cli analysis +get_analysis_query_schema`.
- Get the query schema for the specified analysis model type. Different model types use different schema structures. This tool returns field definitions and examples.

## Use Cases
- Helper tool positioning: this command provides structural definitions (schema) and should be used as a prerequisite step.
- Recommended order: first use the current schema tool to get the structure, then call the specific business tool.
- Typical follow-up tools: `+create_metric`, `+create_report`, `+drilldown_users`, `+get_cluster_definition_schema`, `+get_filter_schema`, `+get_groupby_schema`, `+get_tag_definition_schema`, `+query_adhoc`
- Get the analysis query schema for the specified model type. Different model types use different query structures. This tool returns field definitions and examples. Supported model types: event, retention, funnel, distribution, sql, interval, path, attribution, prop_analysis, rank_list, heat_map.
- Get the analysis query schema for the specified model type.

## Command
```bash
ae-cli analysis +get_analysis_query_schema --model_type event
ae-cli analysis +get_analysis_query_schema --model_type event --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--model_type` | Yes | Model type. Supported values: event, retention, funnel, distribution, sql, interval, path, attribution, prop_analysis, rank_list, heat_map |

## Decision Rules
- It is recommended to run `--dry-run` first to inspect the request body mapping before making the formal call.

## Next Steps on Failure
- If reading fails, first verify whether the object ID exists and belongs to the current project.
- If the schema does not match expectations, confirm whether the correct schema interface was called (filter/groupby/query/tag/cluster).

## Recommended chaining
- +get_analysis_query_schema -> +get_filter_schema -> +get_groupby_schema
