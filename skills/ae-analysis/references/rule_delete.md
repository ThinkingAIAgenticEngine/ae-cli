# analysis-governance rule delete

Use when the user needs to delete an asset governance rule through the capability gateway.

Do not use it to disable a rule or with a guessed ID; resolve the saved rule, dry-run the final deletion, and require explicit confirmation.

Command:

```bash
ae-cli analysis-governance rule delete --project-id <project_id> --rule-id <rule_id> --dry-run
# Summarize the target and impact, then wait for explicit user confirmation.
ae-cli analysis-governance rule delete --project-id <project_id> --rule-id <rule_id> --yes
```

Capability id: governance.rule.delete.

Input sends project_id, rule_id. The CLI merges the snake_case object from `--payload` into these top-level Gateway fields; explicit flags override matching payload fields. `--project-id` owns the project identity and cannot be supplied or overridden by payload. Required business fields must exist in the final merged input.

Output `data.deleted` reports whether the identified rule was deleted; `false` must not be presented as a successful deletion.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| --project-id | Yes | Numeric project ID. |
| --rule-id | No | Rule ID; required unless provided inside payload. |
| --payload | No | Optional JSON object merged into top-level input. Use schema-declared snake_case fields; explicit flags take precedence. `node_ids`, `searchs`, and `status` are arrays; `rule` is an object when supplied. |
