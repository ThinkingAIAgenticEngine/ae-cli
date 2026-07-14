# analysis-meta virtual-property sql-rule-delete

Use when the user needs to delete or revoke SQL virtual property rule.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis-meta virtual-property sql-rule-delete --project-id <project_id> --v-prop-id <v_prop_id> --operation <operation>
ae-cli analysis-meta virtual-property sql-rule-delete --dry-run
```

Capability id: `metadata.virtual_property.sql_rule_delete`.

Input sends `project_id`, `v_prop_id`, `operation`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--v-prop-id` | Yes | Virtual property ID. |
| `--operation` | No | Delete operation. Use revoke to revoke instead of delete. |
