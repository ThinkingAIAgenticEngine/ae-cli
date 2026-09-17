# analysis-governance rule create

Use when the user needs to create an asset governance rule through the capability gateway.

Do not use it when a matching saved rule already exists; list rules first and use `rule update` for an existing `rule_id`.

Command:

```bash
ae-cli analysis-governance rule create --project-id <project_id> --rule-name <rule_name> --rule '<verified_rule_json>'
```

Capability id: governance.rule.create.

Input sends project_id, rule_name, comment, rule. The CLI merges the snake_case object from `--payload` into these top-level Gateway fields; explicit flags override matching payload fields. `--project-id` owns the project identity and cannot be supplied or overridden by payload. Required business fields must exist in the final merged input.

Output `data.rule_id` is the created governance rule identity. Preserve it for later update/delete operations.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| --project-id | Yes | Numeric project ID. |
| --rule-name | No | Rule name; required unless provided inside payload. |
| --comment | No | Rule comment. |
| --rule | No | Governance Filter JSON; required unless provided inside payload. |
| --payload | No | Optional JSON object merged into top-level input. Use schema-declared snake_case fields; explicit flags take precedence. `node_ids`, `searchs`, and `status` are arrays; `rule` is an object when supplied. |
