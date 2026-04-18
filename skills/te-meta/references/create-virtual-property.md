# analysis_meta +create_virtual_property (Create Virtual Property)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Metadata Query**

## Use Cases
- Before creating a virtual property, first confirm the available properties and, as needed, available events from the project metadata.
- Create a SQL-based virtual property.
- A SQL virtual property is a computed property defined by a SQL expression.
- Key parameters:
- propertyName: Unique name for the virtual property (must start with '#vp@'), the name after '#vp@' must start with a letter, and can contain letters, numbers and underscores, with a maximum of 60 characters.
- propertyDesc: Display name/description
- tableType: event or user. Determine based on the prompt whether to create a virtual event property or a virtual user property
- selectType: Data type (string, number, bool, datetime)
- sqlExpression: SQL expression for computing the property
- sqlEventRelationType: relation_default, relation_always, or relation_by_setting

## Mandatory Prerequisites (MUST)
- Before building `--sql_expression` / `--related_events`, you must first read and follow the reference docs below:
  - [`./list-properties.md`](./list-properties.md)
  - [`./list-events.md`](./list-events.md) (only when `sql_event_relation_type=relation_by_setting`)
- Do not submit the final SQL and event-association configuration until the above docs have been read and the prerequisite commands have been run.

## Prerequisite Call Chain (required for building SQL and relations)
1. Read `list-properties.md`, then run `ae-cli analysis_meta +list_properties --project_id 1` to get the available properties.
2. Use `--table_type` to determine the SQL field source (event or user scope).
3. Write `--sql_expression` using only fields confirmed in the previous step; the expression must conform to Trino syntax.
4. If `--sql_event_relation_type=relation_by_setting`, read `list-events.md`, then run `ae-cli analysis_meta +list_events --project_id 1` to get the available events and build `--related_events`.
5. Call `+create_virtual_property` to create the virtual property.
6. Example `sql_expression`: `property_a + property_b` or `CASE WHEN status = 1 THEN 'active' ELSE 'inactive' END`.

## Command
```bash
ae-cli analysis_meta +create_virtual_property --project_id 1 --property_name '#vp@demo' --table_type event --select_type string --sql_expression 'event_name' --sql_event_relation_type relation_default
ae-cli analysis_meta +create_virtual_property --project_id 1 --property_name '#vp@demo' --property_desc demo --table_type event --select_type string --sql_expression "CASE WHEN status = 1 THEN 'active' ELSE 'inactive' END" --sql_event_relation_type relation_by_setting --related_events '[{"eventName":"purchase"}]' --property_remark demo
ae-cli analysis_meta +create_virtual_property --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--property_name` | Yes | Name for the virtual property (must start with '#vp@'), the name after '#vp@' must start with a letter, and can contain letters, numbers and underscores, with a maximum of 60 characters. |
| `--property_desc` | No | Display name/description |
| `--table_type` | Yes | Table type. event: create virtual event property(virtual property generated based on event or user properties), user: create virtual user property(virtual property generated based on user properties) |
| `--select_type` | Yes | Data type: string, number, bool, datetime |
| `--sql_expression` | Yes | SQL expression for computing the property. MUST be built from fields confirmed by `analysis_meta +list_properties` in the same `project_id`, and MUST conform to Trino syntax (for example, columns starting with '#' or containing '@' should be double-quoted). |
| `--sql_event_relation_type` | Yes | Type of associating attributes with events, relation_default: auto; relation_always: all events; relation_by_setting: specified events |
| `--related_events` | No | Optional JSON array of related events. When `sql_event_relation_type=relation_by_setting`, this field is required and event names MUST come from `analysis_meta +list_events` in the same `project_id`. |
| `--property_remark` | No | Optional property remark |

## Decision Rules
- `sql_expression` / `related_events` cannot be written from experience alone: they must be built from real project metadata.
- `list_properties` / `list_events` must be read before their corresponding commands are run.
- First run should only pass required parameters (`--project_id`, `--property_name`, `--table_type`, `--select_type`, `--sql_expression`, `--sql_event_relation_type`), and add optional parameters only after the path is confirmed to work.
- Wrap JSON arguments in single quotes (for example `--related_events '{}'`) to avoid shell escaping issues.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.
- Write operations keep the confirmation prompt by default; re-evaluate whether to use `--yes` in automation scenarios.

## Next Steps After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id`, `--property_name`, and `--table_type`).
- If `Invalid JSON` occurs, first check the `related_events` structure, then verify whether the event names came from the `list_events` result for the same `project_id`.
- If SQL execution or validation fails, first check whether the field names came from `list_properties`, then check whether the Trino syntax and field references are correct.
- If the result after writing is not as expected, immediately read back the corresponding list/get interface for a before-and-after comparison.

## Recommended Chaining
- +list_properties -> +create_virtual_property
- +list_properties -> +list_events -> +create_virtual_property (sql_event_relation_type=relation_by_setting)
