# analysis-governance rule update

Use when the user needs to update an asset governance rule through the capability gateway.

Do not use it to create a new rule or guess a rule ID; resolve the existing rule with `rule list` before updating its full definition.

Command:

```bash
ae-cli analysis-governance rule update --project-id <project_id> --rule-id <rule_id> --rule-name <rule_name> --rule '<verified_rule_json>'
```

Capability id: governance.rule.update.

Input sends project_id, rule_id, rule_name, comment, rule. The CLI merges the snake_case object from `--payload` into these top-level Gateway fields; explicit flags override matching payload fields. `--project-id` owns the project identity and cannot be supplied or overridden by payload. Required business fields must exist in the final merged input.

Output `data` returns the updated `rule_id` and `updated=true`; a missing rule is an operation failure, not a create fallback.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| --project-id | Yes | Numeric project ID. |
| --rule-id | No | Rule ID; required unless provided inside payload. |
| --rule-name | No | Rule name; required unless provided inside payload. |
| --comment | No | Rule comment. |
| --rule | No | Governance Filter JSON; required unless provided inside payload. |
| --payload | No | Optional JSON object merged into top-level input. Use schema-declared snake_case fields; explicit flags take precedence. `node_ids`, `searchs`, and `status` are arrays; `rule` is an object when supplied. |
