# agent +read-skill-reference (Read Skill Reference)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Skills / read**

## Use Cases
- Read a Skill reference `.md` file's raw content (binary-safe).
- Endpoint: `GET /api/sandbox/agent/skills/[id]/references/[...path]`.
- By default returns `{ content, fileName }` where content is UTF-8 text.
- Use `--output <path>` to save the raw content to a local file.

## Mandatory Rules (MUST)
- `--id` is required. Obtain the real Skill record ID (CUID) via `+list-skills` — do not guess.
- `--path` is required and specifies the relative file path within the references directory.

## Command
```bash
# Read a reference (default JSON output)
ae-cli agent +read-skill-reference --id <skill-cuid> --path guide.md

# Save reference to local file
ae-cli agent +read-skill-reference --id <skill-cuid> --path guide.md --output ./guide.md

# Read from a sub-directory
ae-cli agent +read-skill-reference --id <skill-cuid> --path "advanced/tips.md"

# Dry-run to inspect the request before executing
ae-cli agent +read-skill-reference --dry-run --id <skill-cuid> --path guide.md
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--id` | Yes | Skill record ID (CUID) |
| `--path` | Yes | Relative file path within references (e.g. `"guide.md"` or `"advanced/tips.md"`) |
| `--output` | No | Write content to a local file |

## Decision Rules
- Use `+list-skill-references` to discover available file paths before reading.
- References are `.md` files — the default JSON output `{ content }` is usually sufficient.
- Use `--output` to save the content to a local file for editing or backup.
- Read operation: no confirmation prompt needed.

## Next Steps on Failure
- `404` / not found: re-run `+list-skill-references` to verify the file path.
- `文件不存在`: the file path does not exist in the references directory.

## Recommended Chaining
- `+list-skill-references` → confirm `path` → `+read-skill-reference` → `+del-skill-reference` (if cleanup needed)
