# analysis-governance rule schema

Use when the user needs to get asset governance rule field schema through the capability gateway.

Do not use it to list saved governance rules; use it before create/update only when the allowed rule fields or operators are unknown.

Command:

```bash
ae-cli analysis-governance rule schema --project-id <project_id>
```

Capability id: governance.rule.schema.

Input sends project_id. The CLI merges the snake_case object from `--payload` into these top-level Gateway fields; explicit flags override matching payload fields. `--project-id` owns the project identity and cannot be supplied or overridden by payload. Required business fields must exist in the final merged input.

Output `data` is the project-specific rule column/operator schema consumed by the `rule` object in rule create and update commands.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| --project-id | Yes | Numeric project ID. |
| --payload | No | Optional JSON object merged into top-level input. Use schema-declared snake_case fields; explicit flags take precedence. `node_ids`, `searchs`, and `status` are arrays; `rule` is an object when supplied. |
