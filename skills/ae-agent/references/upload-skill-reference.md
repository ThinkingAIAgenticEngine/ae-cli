# agent +upload-skill-reference (Upload Skill Reference)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Skills / write**

## Use Cases
- Upload a single `.md` file to a Skill's `references` directory (multipart upload).
- Endpoint: `POST /api/sandbox/agent/skills/[id]/references` (multipart/form-data).
- Max file size: 1MB per file.
- **Only `.md` files are allowed** — other extensions are rejected.

## Mandatory Rules (MUST)
- `--id` is required. Obtain the real Skill record ID (CUID) via `+list-skills` — do not guess.
- `--file` is required, must be an existing local `.md` file.
- Non-`.md` files are rejected — use `+upload-skill-asset` for other file types.
- Max 1MB per file; server enforces `isDangerousFile` checks.
- This is an ordinary `write` operation and does not require CLI confirmation.

## Command
```bash
# Upload a single reference
ae-cli agent +upload-skill-reference --id <skill-cuid> --file ./guide.md

# Upload to a sub-directory
ae-cli agent +upload-skill-reference --id <skill-cuid> --file ./advanced.md --sub-path "advanced/"

# Dry-run to inspect the request before executing
ae-cli agent +upload-skill-reference --dry-run --id <skill-cuid> --file ./guide.md
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--id` | Yes | Skill record ID (CUID) |
| `--file` | Yes | Local `.md` file path to upload (max 1MB) |
| `--sub-path` | No | Sub-directory under references (e.g. `"advanced/"`) |

## Decision Rules
- Verify the file exists locally and has a `.md` extension before uploading.
- For non-markdown files, use `+upload-skill-asset` instead.
- Use `--sub-path` to organize references into sub-directories.
- Use `--dry-run` first to verify the request shape before executing.

## Next Steps on Failure
- `File not found`: verify the local file path.
- `--file must be a .md file for references`: use `+upload-skill-asset` for non-markdown files.
- `文件过大（上限 1MB）`: the file exceeds the 1MB limit — split the markdown.

## Recommended Chaining
- `+list-skills` → `+list-skill-references` → `+upload-skill-reference` → `+list-skill-references` (verify)
