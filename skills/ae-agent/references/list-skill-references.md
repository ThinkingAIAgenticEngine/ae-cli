# agent +list-skill-references (List Skill References)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Skills / read**

## Use Cases
- List all `.md` files in a Skill's `references` directory.
- Endpoint: `GET /api/sandbox/agent/skills/[id]/references`.
- Returns `{ items: [...] }` with file metadata (name, size, etc.).
- Only `.md` files are listed (references directory is markdown-only).

## Mandatory Rules (MUST)
- `--id` is required. Obtain the real Skill record ID (CUID) via `+list-skills` — do not guess.

## Command
```bash
ae-cli agent +list-skill-references --id <skill-cuid>
ae-cli agent +list-skill-references --dry-run --id <skill-cuid>
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--id` | Yes | Skill record ID (CUID) |

## Decision Rules
- Use `+list-skills` to confirm the Skill ID before listing references.
- Read operation: no confirmation prompt needed.
- References are `.md` files that provide additional context for the Skill.

## Next Steps on Failure
- `404` / not found: re-run `+list-skills` to verify the Skill ID and scope.

## Recommended Chaining
- `+list-skills` → confirm `id` → `+list-skill-references` → `+read-skill-reference` or `+upload-skill-reference`
