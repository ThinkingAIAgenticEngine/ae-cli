# analysis_audience +get_tag_definition_schema (Get Tag Definition Schema)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Schema Query**

## Use Cases
- Support tool positioning: the current command provides the structure definition (schema) and should be used as a prerequisite step.
- Recommended sequence: first call this schema tool to get the structure, then call specific business tools.
- Typical downstream tools: `+create_tag`, `+update_tag`
- Get the tag definition schema. Supports the condition, metric, first_last, and sql tag types and returns field definitions, enum descriptions, and examples.

## Commands
```bash
ae-cli analysis_audience +get_tag_definition_schema
ae-cli analysis_audience +get_tag_definition_schema --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| None | - | This command has no business parameters; call it directly. |

## Decision Rules
- It is recommended to run `--dry-run` first to inspect the request mapping before making the actual call.

## Next Step on Failure
- If reading fails, first verify whether the object ID exists and belongs to the current project.
- If the schema does not match expectations, confirm whether the correct schema interface was used (filter/groupby/query/tag/cluster).

## Recommended Chain
- +get_analysis_query_schema -> +get_filter_schema -> +get_groupby_schema
