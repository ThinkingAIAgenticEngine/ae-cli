# agent +del-model (Delete Model)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Models / write**

## Use Cases
- Delete a custom model (personal or company scope).
- `--scope personal` (default) deletes a personal model; `--scope company` deletes a company model (requires root/agent_admin). System models cannot be deleted.

## Mandatory Rules (MUST)
- `--id` is required. Obtain the real model record ID (CUID) via `+list-models` — do not guess.
- `--scope` controls target scope: `personal` (default) or `company`. Company scope requires root/agent_admin.
- Prefer `--dry-run` before executing a destructive delete.
- Write operation: keep the confirmation prompt unless `--yes` is explicitly requested.

## Command
```bash
ae-cli agent +del-model --id <model-cuid> --yes
ae-cli agent +del-model --dry-run --id <model-cuid>
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--id` | Yes | Model record ID (CUID) |
| `--scope` | No | Target scope: `personal` (default) or `company` (requires root/agent_admin) |

## Decision Rules
- Confirm the model ID with `+list-models` before deleting.
- Company-scope models can be deleted with `--scope company` by root/agent_admin; system models cannot be deleted via CLI.

## Next Steps on Failure
- `404` / not found: re-run `+list-models` to verify the model ID and scope.

## Recommended Chaining
- `+list-models` → confirm `id` → `+del-model`
