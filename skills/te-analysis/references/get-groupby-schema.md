# analysis +get_groupby_schema (Get Group-By Schema)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Schema queries**

## Use Cases
- Helper tool positioning: this command provides structural definitions (schema) and should be used as a prerequisite step.
- Recommended order: first use the current schema tool to get the structure, then call the specific business tool.
- Typical follow-up tools: `+get_analysis_query_schema`, `+get_cluster_definition_schema`, `+get_filter_schema`, `+get_tag_definition_schema`, `+query_report_data`
- Get the group-by schema. Returns field definitions and examples for group-by configuration.
- Get the group-by schema.

## Command
```bash
ae-cli analysis +get_groupby_schema
ae-cli analysis +get_groupby_schema --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| None | - | This command has no business parameters; call it directly. |

## Decision Rules
- It is recommended to run `--dry-run` first to inspect the request body mapping before making the formal call.

## Next Steps on Failure
- If reading fails, first verify whether the object ID exists and belongs to the current project.
- If the schema does not match expectations, confirm whether the correct schema interface was called (filter/groupby/query/tag/cluster).

## Recommended chaining
- +get_analysis_query_schema -> +get_filter_schema -> +get_groupby_schema
