# analysis-meta virtual-property sql-rule-update

Use when the user needs to update SQL virtual property rule.

Do not use it for renaming a physical property. Use only when replacing the complete SQL rule for an existing virtual property and an exact DTO is available.

Command:

```bash
ae-cli analysis-meta virtual-property sql-rule-update --project-id <project_id> --sql-expression '<sql>' --v-prop '{...}' --properties '[...]'
ae-cli analysis-meta virtual-property sql-rule-update --project-id <project_id> --sql-expression '<sql>' --v-prop '{...}' --dry-run
```

Capability id: `metadata.virtual_property.sql_rule_update`.

Input sends typed snake_case fields.

Output is a successful gateway envelope with no business data.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--sql-expression` | Yes | Replacement SQL expression. |
| `--v-prop` | Yes | Existing virtual property JSON object, including its ID and property fields. |
| `--properties` | No | Dependent property JSON array. |
| `--sql-event-relation-type` | No | `relation_default`, `relation_always`, or `relation_by_setting`. |
| `--related-events` | No | Related events JSON array for `relation_by_setting`. |
| `--tag-date-policies` | No | Tag date policies JSON array. |
| `--replace-remark` | No | Replacement remark. |
| `--replace-suggestion` | No | Replacement suggestion. |
