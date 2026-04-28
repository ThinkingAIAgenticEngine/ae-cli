# analysis_audience +create_tag (Create Tag)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Tag Management**

## Use Cases
- Prerequisite helper: first call `+get_tag_definition_schema` to obtain the structure, then call this tool.
- When building a real `definition`, metadata must be verified in the same session and `project_id`: first build in this session must call `analysis_meta +list_events` and `analysis_meta +list_properties`; later calls should reuse the session-verified results first.
- Create a user tag definition. Supports the condition, metric, first_last, and sql tag types. Returns the new tag ID without tag members.

## Required Prerequisites (MUST)
- Before constructing `--definition`, you must first read and follow these reference docs:
  - [`./get_tag_definition_schema.md`](./get_tag_definition_schema.md)
  - [`./list_events.md`](./list_events.md)
  - [`./list_properties.md`](./list_properties.md)
- Do not generate the final `definition` until the above docs have been read and metadata has been verified: first build in this session for the same `project_id` must run metadata commands; if session-verified metadata already exists, reuse it first.

## Prerequisite Call Chain (Required for Building Definition)
1. First determine `--type` (condition / metric / first_last / sql).
2. Read `get_tag_definition_schema.md` to understand the return structure of `+get_tag_definition_schema`.
3. Call `ae-cli analysis_audience +get_tag_definition_schema --type <condition|metric|first_last|sql>` to obtain the schema progressively. Start with base mode; request `examples` only if base is insufficient; request `full` only for complex, ambiguous, or repeatedly failing definition construction.
4. Read `list_events.md`. If this is the first definition build in the current session for this `project_id` (or metadata is not yet verified), call `ae-cli analysis_meta +list_events --project_id <project_id>`; otherwise, reuse the session-verified event metadata first.
5. Read `list_properties.md`. If this is the first definition build in the current session for this `project_id` (or metadata is not yet verified), call `ae-cli analysis_meta +list_properties --project_id <project_id>`; otherwise, reuse the session-verified property metadata first.
6. Build `definition` based on the schema + metadata, then call `+create_tag`.

## Commands
```bash
ae-cli analysis_audience +create_tag --project_id <project_id> --tag_name demo --display_name demo --definition '{}'
ae-cli analysis_audience +create_tag --project_id <project_id> --tag_name demo --display_name demo --type condition --definition '{}' --zone_offset 8 --entity_id 1001
ae-cli analysis_audience +create_tag --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--tag_name` | Yes | Tag name. Must start with a letter and contain only letters, digits, and underscores. Length: 1-80 |
| `--display_name` | Yes | Tag display name. Length: 1-80 |
| `--type` | No | Tag type. Supported values: condition, metric, first_last, sql |
| `--definition` | Yes | Tag definition JSON. MUST call `+get_tag_definition_schema` first, then fill valid event/property names from metadata verified in the same `project_id` (first build queries `analysis_meta` metadata commands; later builds in the same session should reuse verified results first). |
| `--zone_offset` | No | Optional time zone offset for tag computation. Valid range: -12 to 14 (supports decimals like 5.5). If the user does not specify a timezone, omit this parameter. When a timezone is specified, call get_project_config first to check whether the project supports time zones (timeZoneEnabled) and available values (availableTimeZones). |
| `--entity_id` | No | Optional entity ID for tag definition. Use list_entities to query available entities. |

## Decision Rules
- `definition` cannot be written from experience alone: it must satisfy both the schema structure and the project's real metadata.
- Use progressive schema loading: base first, examples only when needed, full only as a last resort. Do not request full schema for simple tag creation when the intent is clear.
- Before calling `list_events` / `list_properties`, you must first read the corresponding reference docs to avoid misuse of parameters or misreading return fields. Query metadata on the first build in this session for the same `project_id`; after that, prefer reusing session-verified metadata.
- For the first execution, it is recommended to pass only the required parameters (`--project_id`, `--tag_name`, `--display_name`, `--definition`) and add optional parameters after confirming the path works.
- Wrap JSON parameters in single quotes (e.g. `--definition '{}'`) to avoid shell escaping issues.
- When troubleshooting across projects, first confirm whether `--project_id` matches the current permissions and target environment.
- Write operations keep confirmation prompts by default; for automation scenarios, reevaluate whether to use `--yes`.

## Next Step on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill the gap (focus on `--project_id`, `--tag_name`, `--display_name`, `--definition`).
- If `Invalid JSON` appears, first check schema-required fields, then verify whether event/property names come from the same `project_id`'s metadata query results.
- If the result after writing is not as expected, immediately re-read the corresponding list/get interfaces and compare before and after.

## Recommended Chain
- +get_tag_definition_schema -> (first build or refresh) analysis_meta +list_events -> analysis_meta +list_properties -> +create_tag
- +list_tags -> +get_tags_by_name -> +update_tag
