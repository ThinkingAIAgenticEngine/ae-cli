# analysis-governance rule list

Use when the user needs to list asset governance rules through the capability gateway.

Do not use it to discover rule field syntax; use `rule-schema` for construction metadata and this command for existing rule IDs and definitions.

Command:

```bash
ae-cli analysis-governance rule list --project-id <project_id>
ae-cli analysis-governance rule list --dry-run --project-id <project_id>
```

Capability id: analysis_meta.asset_rule.list.

Input sends project_id, payload. Payload keys must follow the common-service snake_case input schema; do not send camelCase aliases.

Output `data` is the saved governance rule collection for the project. Resolve a real `rule_id` from this result before update or delete.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| --project-id | Yes | Numeric project ID. |
| --payload | No | Optional snake_case object carrying the same fields. Use this for complex governance filters or backend-shaped payloads. |
