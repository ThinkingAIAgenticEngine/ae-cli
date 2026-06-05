# analysis_meta +create_entity (Create Entity)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Entity Management**

## Use Cases
- Create a new entity that links an event property or user property as an analysis dimension.
- Use `+list_entities` first to confirm the entity does not already exist.

## Commands
```bash
ae-cli analysis_meta +create_entity --project_id <project_id> --entity_name "User Entity" --column_name user_id --table_type 1
ae-cli analysis_meta +create_entity --project_id <project_id> --entity_name "Event Entity" --column_name event_col --table_type 0
ae-cli analysis_meta +create_entity --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--entity_name` | Yes | Entity name |
| `--column_name` | Yes | Property column name to associate with the entity |
| `--table_type` | Yes | Table type: `0` = event property, `1` = user property |

## Decision Rules
- `--table_type` must be `0` (event property) or `1` (user property); no other values are accepted.
- Before using `--column_name`, call `analysis_meta +list_properties` to verify it exists. If the same column name appears in **both** event properties and user properties, **stop and ask the user which table type to use** — do not guess `--table_type`. Ask every time this condition is met; never carry over the answer from a previous request.
- For the first run, pass only the required parameters and confirm before adding others.
- Write operations keep the confirmation prompt by default; use `--yes` only for automation.

## Next Steps After Failure
- If `PROJECT_ID_REQUIRED` or `ENTITY_NAME_REQUIRED` appears, check that all required parameters are provided.
- If `INVALID_TABLE_TYPE` appears, verify `--table_type` is exactly `0` or `1`.
- If the result after writing is not as expected, use `analysis_meta +list_entities` to compare before and after.

## Recommended Chaining
- `analysis_meta +list_entities` → `+create_entity`
- `analysis_meta +list_properties` → `+create_entity`
