# analysis-meta virtual-property create

Use when the user needs to create a SQL virtual event or user property.

Do not use it for physical/super properties. Use `analysis_meta +create_virtual_property` only when the gateway capability is unavailable.

Command:

```bash
ae-cli analysis-meta virtual-property create --project-id <project_id> --sql-expression '<sql>' --v-prop '{...}' --properties '[...]'
ae-cli analysis-meta virtual-property create --project-id <project_id> --sql-expression '<sql>' --v-prop '{...}' --dry-run
```

Capability id: `metadata.virtual_property.create`.

Input sends typed snake_case fields.

Output is a successful gateway envelope with no business data.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--sql-expression` | Yes | SQL expression used to calculate the virtual property. |
| `--v-prop` | Yes | Virtual property JSON object with `property.column_name`, `table_type`, and `select_type`. |
| `--properties` | No | Dependent property JSON array. |
| `--sql-event-relation-type` | No | `relation_default`, `relation_always`, or `relation_by_setting`. |
| `--related-events` | No | Related events JSON array for `relation_by_setting`. |
| `--tag-date-policies` | No | Tag date policies JSON array. |
| `--replace-remark` | No | Replacement remark. |
| `--replace-suggestion` | No | Replacement suggestion. |
