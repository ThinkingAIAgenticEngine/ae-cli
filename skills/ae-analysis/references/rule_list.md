# analysis-governance rule list

Use when the user needs to list asset governance rules through the capability gateway.

Do not use it to discover rule field syntax; use `rule schema` for construction metadata and this command for existing rule IDs and definitions.

Command:

```bash
ae-cli analysis-governance rule list --project-id <project_id> --limit 50 --offset 0
```

Capability id: `governance.rule.list`.

Input sends `project_id`, optional `limit`, and `offset`. The CLI merges the snake_case object from `--payload` into these top-level Gateway fields; explicit flags override matching payload fields. `--project-id` owns the project identity and cannot be supplied or overridden by payload. Required business fields must exist in the final merged input.

Output always uses the directory envelope: `data.items[]`, `total`, `limit`, `offset`, `has_more`, and `next_offset`. Resolve a real `rule_id` from `items` before update or delete.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| --project-id | Yes | Numeric project ID. |
| --payload | No | Optional JSON object merged into top-level input. Use schema-declared snake_case fields; explicit flags take precedence. `node_ids`, `searchs`, and `status` are arrays; `rule` is an object when supplied. |
| `--limit` / `-l` | No | Page size. Default: 50, maximum: 200. |
| `--offset` / `-o` | No | Zero-based page offset. Default: 0. |
