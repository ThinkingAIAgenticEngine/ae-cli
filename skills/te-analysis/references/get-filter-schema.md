# te_analysis +get_filter_schema (get filter schema)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Schema Queries**

## Use Cases
- Helper tool positioning: this command provides structure definitions (schema) and should be used as a prerequisite step.
- Recommended order: call the schema tool first to get the structure, then call the specific business tool.
- Typical downstream tools: `+create_virtual_event`, `+get_analysis_query_schema`, `+get_cluster_definition_schema`, `+get_groupby_schema`, `+get_tag_definition_schema`, `+query_dashboard_report_data`, `+query_report_data`
- Get the filter schema. Returns field definitions, operator enums, data type descriptions, and examples.
- Get the filter schema.

## Commands
```bash
te-cli te_analysis +get_filter_schema
te-cli te_analysis +get_filter_schema --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| None | - | This command has no business parameters; call it directly. |

## Decision Rules
- It is recommended to run `--dry-run` first to observe the request-body mapping before making the formal call.

## Next Step After Failure
- If reading fails, first verify whether the object ID exists and belongs to the current project.
- If the schema does not match expectations, confirm whether the correct schema interface was called (filter/groupby/query/tag/cluster).

## Recommended Chaining
- +get_analysis_query_schema -> +get_filter_schema -> +get_groupby_schema
