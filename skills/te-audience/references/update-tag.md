# te_audience +update_tag (Update Tag)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Tag Management**

## Use Cases
- Prerequisite helper: first call `+get_tag_definition_schema` to get the structure, then call this tool.
- When updating `definition`, you must first supplement it with real project metadata; at minimum, first call `te_meta +list_events` and `te_meta +list_properties`.
- Update a user tag definition. Supports updating the display name, remark, type, and tag definition. Updating only the display name or remark does not trigger recomputation.

## Required Prerequisites (MUST only when updating definition)
- If this request includes `--definition`, you must first read and follow these reference docs:
  - [`./get-tag-definition-schema.md`](./get-tag-definition-schema.md)
  - [`../../te-meta/references/list-events.md`](../../te-meta/references/list-events.md)
  - [`../../te-meta/references/list-properties.md`](../../te-meta/references/list-properties.md)
- Do not submit a new `definition` until the above docs have been read and the prerequisite commands have been run.

## Prerequisite Call Chain (run only when updating definition)
1. First determine `--type` (condition / metric / first_last / sql).
2. Read `get-tag-definition-schema.md`, then call `te-cli te_audience +get_tag_definition_schema` to obtain the structure.
3. Read `list-events.md`, then call `te-cli te_meta +list_events --project_id 1`.
4. Read `list-properties.md`, then call `te-cli te_meta +list_properties --project_id 1`.
5. Build the new `definition` based on the schema + metadata, then run `+update_tag`.

## Commands
```bash
te-cli te_audience +update_tag --project_id 1 --tag_name demo --display_name "Demo v2"
te-cli te_audience +update_tag --project_id 1 --tag_name demo --type condition --definition '{}' --zone_offset 8
te-cli te_audience +update_tag --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--tag_name` | Yes | Tag name |
| `--display_name` | No | New tag display name. Length: 1-80 |
| `--remark` | No | New tag remark |
| `--type` | No | New tag type. Supported values: condition, metric, first_last, sql |
| `--definition` | No | New tag definition JSON. If provided, MUST call `+get_tag_definition_schema` first, then fill valid event/property names from `te_meta` metadata commands in the same `project_id`. |
| `--zone_offset` | No | Optional time zone offset for tag computation. Valid range: -12 to 14 (supports decimals like 5.5). |

## Decision Rules
- If you are not updating `definition` (only updating `display_name`/`remark`), you can skip the schema and metadata prerequisite chain.
- When updating `definition`, it cannot be written from experience alone; it must satisfy both the schema structure and the project's real metadata.
- Before calling `list_events` / `list_properties`, you must first read the corresponding reference docs.
- For the first execution, it is recommended to pass only the required parameters (`--project_id`, `--tag_name`) and add optional parameters after confirming the path works.
- Wrap JSON parameters in single quotes (e.g. `--definition '{}'`) to avoid shell escaping issues.
- When troubleshooting across projects, first confirm whether `--project_id` matches the current permissions and target environment.
- Write operations keep confirmation prompts by default; for automation scenarios, reevaluate whether to use `--yes`.

## Next Step on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill the gap (focus on `--project_id`, `--tag_name`).
- If `Invalid JSON` appears, first check whether a schema-required field is missing, then verify whether event/property names come from the same `project_id`'s metadata query results.
- If the result after writing is not as expected, immediately re-read the corresponding list/get interfaces and compare before and after.

## Recommended Chain
- +get_tag_definition_schema -> te_meta +list_events -> te_meta +list_properties -> +update_tag
- +list_tags -> +get_tags_by_name -> +update_tag
