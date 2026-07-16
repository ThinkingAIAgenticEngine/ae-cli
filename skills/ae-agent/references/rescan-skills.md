# agent +rescan-skills (Rescan Skills)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Skills / write**

## Use Cases
- Rescan Skill files on the server filesystem and sync them to the database.
- Endpoint: `POST /api/sandbox/agent/skills/rescan`.
- **Root-only**: requires root privileges; non-root users get a 403.
- No flags — the scan covers all Skill directories on the server.

## Mandatory Rules (MUST)
- This command takes no flags.
- **Root-only operation**: non-root users will receive a 403 error.
- This is an ordinary `write` operation and does not require CLI confirmation.
- Prefer `--dry-run` before executing — rescan has filesystem side effects.

## Command
```bash
# Rescan and sync
ae-cli agent +rescan-skills

# Dry-run to inspect the request before executing
ae-cli agent +rescan-skills --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| _(none)_ | — | This command takes no flags |

## Decision Rules
- Use this command when Skill files on disk are out of sync with the database (e.g. after manual filesystem changes or migration).
- This is a root-only operation — confirm the user has root privileges before running.
- The scan covers all Skill directories (system, company, personal) on the server.
- Use `--dry-run` first to verify the request shape before executing.

## Next Steps on Failure
- `403` / 无权限: the current user is not root — rescan requires root privileges.
- `扫描同步失败`: the scan encountered filesystem errors — check server logs and Skill directory permissions.

## Recommended Chaining
- `+rescan-skills` → `+list-skills` (verify the synced state)
