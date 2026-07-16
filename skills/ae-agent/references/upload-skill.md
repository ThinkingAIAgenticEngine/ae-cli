# agent +upload-skill (Upload ZIP Skill)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Skills / write**

## Use Cases
- Upload a ZIP-format Skill package. The server parses SKILL.md from the ZIP, extracts files to the target directory, and writes the DB record.
- Endpoint: `POST /api/sandbox/agent/skills/upload` (multipart/form-data, 120s timeout).
- Supports form-field overrides for name, displayName, description, instructions, icon, category.
- `--scope` controls target scope: `personal` (default) or `company`.
- `--replace-skill-id` replaces an existing Skill instead of creating a new one.
- `--auto-rename` auto-renames on name conflict.

## Mandatory Rules (MUST)
- `--file` is required and must be a `.zip` file that exists on disk.
- The ZIP must contain a `SKILL.md` file (with name and content at minimum).
- `--scope` must be `personal` or `company` (default `personal`).
- `--category` must be one of the market category keys when provided.
- `--instructions` supports `@-` to read from stdin.
- This is an ordinary `write` operation and does not require CLI confirmation.

## Market Category Keys
`ae_preset | dev_tool | search_tool | data_query | content_gen | enterprise | life | automation | other`

## Command
```bash
# Upload a personal Skill from ZIP
ae-cli agent +upload-skill --file ./my-skill.zip

# Upload with overrides
ae-cli agent +upload-skill \
  --file ./my-skill.zip \
  --scope personal \
  --name custom-name \
  --display-name "Custom Skill" \
  --description "Override description" \
  --category dev_tool \
  --icon-emoji robot

# Instructions from stdin
echo "You are a helpful assistant..." | \
  ae-cli agent +upload-skill --file ./my-skill.zip --instructions @-

# Replace an existing Skill
ae-cli agent +upload-skill --file ./updated.zip --replace-skill-id <skill-cuid>

# Auto-rename on conflict
ae-cli agent +upload-skill --file ./my-skill.zip --auto-rename

# Dry-run to inspect the request before executing
ae-cli agent +upload-skill --dry-run --file ./my-skill.zip
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--file` | Yes | Local `.zip` file path |
| `--scope` | No | Target scope: `personal` (default) or `company` |
| `--auto-rename` | No | Auto-rename on name conflict |
| `--replace-skill-id` | No | Replace an existing Skill (CUID) instead of creating new |
| `--category` | No | Market category key (see above) |
| `--name` | No | Override Skill name (from ZIP SKILL.md if omitted) |
| `--display-name` | No | Override display name |
| `--description` | No | Override description |
| `--instructions` | No | Override instructions (use `@-` to read from stdin) |
| `--icon-emoji` | No | Market icon emoji (e.g. `robot`) |
| `--icon-color` | No | Market icon color (e.g. `#1E76F0`) |

## Decision Rules
- The ZIP must contain a `SKILL.md` with at least `name` and content — otherwise the upload fails with `missing_skill_md` or `missing_name_or_content`.
- Form-field overrides take precedence over ZIP SKILL.md content.
- Use `--replace-skill-id` to update an existing Skill's full content from a ZIP (different from `+edit-skill` which edits individual fields).
- Use `--auto-rename` when the Skill name might conflict with an existing one.
- `company` scope requires root privileges.
- Use `--dry-run` first to verify the request shape before executing.

## Next Steps on Failure
- `File not found`: verify the local file path.
- `--file must be a .zip file`: only ZIP format is supported.
- `ZIP 中缺少 SKILL.md`: ensure the ZIP contains a `SKILL.md` file.
- `缺少名称或内容`: the SKILL.md is missing the `name` field or content — fix the ZIP.
- `缺少描述`: the SKILL.md is missing the description — fix the ZIP or use `--description`.
- `数据库写入失败`: DB write failed — retry or check server logs.
- `409` / name conflict: use `--auto-rename` or choose a different `--name`.

## Recommended Chaining
- `+upload-skill` → `+list-skills` (verify) → `+get-skill-content` (inspect) → `+edit-skill` (fine-tune) → `+submit-skill` (publish)
