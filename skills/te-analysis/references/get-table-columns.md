# te_analysis +get_table_columns (Read Underlying Table Columns)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Model analysis**

## Use Cases
- Query the field list of a project table. Returns all column names and types under the specified catalog, schema, and table so the table schema can be understood before SQL analysis.
- Table guide:
- default.public.ta_event_1: catalog is default, schema is public, table is ta_event_1
- public.ta_event_1: catalog is hive(default value), schema is public, table is ta_event_1
- ta_event_1: catalog is hive(default value), schema is ta(default value), table is ta_event_1
- Query the field list of a project table.

## Command
```bash
te-cli te_analysis +get_table_columns --project_id 1 --catalog demo --schema demo --table demo
te-cli te_analysis +get_table_columns --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--catalog` | Yes | Catalog name, default hive |
| `--schema` | Yes | Schema name, default ta |
| `--table` | Yes | Table name |

## Decision Rules
- On the first run, start with only the required parameters (`--project_id`,`--catalog`,`--schema`), and add optional parameters after confirming the path works.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id`, `--catalog`, `--schema`).
- If reading fails, first verify whether the object ID exists and belongs to the current project.

## Recommended chaining
- +get_table_columns
