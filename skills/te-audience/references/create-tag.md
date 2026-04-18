# analysis_audience +create_tag (Create Tag)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Tag Management**

## Use Cases
- Prerequisite helper: first call `+get_tag_definition_schema` to obtain the structure, then call this tool.
- When building a real `definition`, you must supplement it with real project metadata; at minimum, first call `analysis_meta +list_events` and `analysis_meta +list_properties`.
- Create a user tag definition. Supports the condition, metric, first_last, and sql tag types. Returns the new tag ID without tag members.

## Required Prerequisites (MUST)
- Before constructing `--definition`, you must first read and follow these reference docs:
  - [`./get-tag-definition-schema.md`](./get-tag-definition-schema.md)
  - [`../../te-meta/references/list-events.md`](../../te-meta/references/list-events.md)
  - [`../../te-meta/references/list-properties.md`](../../te-meta/references/list-properties.md)
- Do not generate the final `definition` until the above docs have been read and the prerequisite commands have been run.

## Prerequisite Call Chain (Required for Building Definition)
1. First determine `--type` (condition / metric / first_last / sql).
2. Read `get-tag-definition-schema.md` to understand the return structure of `+get_tag_definition_schema`.
3. Call `ae-cli analysis_audience +get_tag_definition_schema` to obtain the schema.
4. Read `list-events.md`, then call `ae-cli analysis_meta +list_events --project_id 1` to get available events.
5. Read `list-properties.md`, then call `ae-cli analysis_meta +list_properties --project_id 1` to get available properties.
6. Build `definition` based on the schema + metadata, then call `+create_tag`.

## Commands
```bash
ae-cli analysis_audience +create_tag --project_id 1 --tag_name demo --display_name demo --definition '{}'
ae-cli analysis_audience +create_tag --project_id 1 --tag_name demo --display_name demo --type condition --definition '{}' --zone_offset 8 --entity_id 1001
ae-cli analysis_audience +create_tag --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--tag_name` | Yes | Tag name. Must start with a letter and contain only letters, digits, and underscores. Length: 1-80 |
| `--display_name` | Yes | Tag display name. Length: 1-80 |
| `--type` | No | Tag type. Supported values: condition, metric, first_last, sql |
| `--definition` | Yes | Tag definition JSON. MUST call `+get_tag_definition_schema` first, then fill valid event/property names from `analysis_meta` metadata commands in the same `project_id`. |
| `--zone_offset` | No | Optional time zone offset for tag computation. Valid range: -12 to 14 (supports decimals like 5.5). If the user does not specify a timezone, omit this parameter. When a timezone is specified, call get_project_config first to check whether the project supports time zones (timeZoneEnabled) and available values (availableTimeZones). |
| `--entity_id` | No | Optional entity ID for tag definition. Use list_entities to query available entities. |

## Decision Rules
- `definition` cannot be written from experience alone: it must satisfy both the schema structure and the project's real metadata.
- Before calling `list_events` / `list_properties`, you must first read the corresponding reference docs to avoid misuse of parameters or misreading return fields.
- For the first execution, it is recommended to pass only the required parameters (`--project_id`, `--tag_name`, `--display_name`, `--definition`) and add optional parameters after confirming the path works.
- Wrap JSON parameters in single quotes (e.g. `--definition '{}'`) to avoid shell escaping issues.
- When troubleshooting across projects, first confirm whether `--project_id` matches the current permissions and target environment.
- Write operations keep confirmation prompts by default; for automation scenarios, reevaluate whether to use `--yes`.

## Next Step on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill the gap (focus on `--project_id`, `--tag_name`, `--display_name`, `--definition`).
- If `Invalid JSON` appears, first check schema-required fields, then verify whether event/property names come from the same `project_id`'s metadata query results.
- If the result after writing is not as expected, immediately re-read the corresponding list/get interfaces and compare before and after.

## Recommended Chain
- +get_tag_definition_schema -> analysis_meta +list_events -> analysis_meta +list_properties -> +create_tag
- +list_tags -> +get_tags_by_name -> +update_tag
