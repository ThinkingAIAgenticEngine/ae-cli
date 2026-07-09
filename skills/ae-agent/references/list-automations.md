# agent +list-automations (List Automations)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Automations / read**

## Use Cases
- List the current user's Agent automation tasks.
- Returns an array of automation summaries; key fields include `id`, `name`, `status`, `schedule`/`cronExpression`.
- Use this to discover a real automation ID before `+update-automation`.

## Mandatory Rules (MUST)
- Do not guess automation IDs. Always call `+list-automations` first when an automation ID is needed.
- Do not surface raw automation IDs, raw JSON, or concrete detail paths in user-facing replies — use the ID only internally for subsequent commands.

## Command
```bash
ae-cli agent +list-automations
ae-cli agent +list-automations --status active
ae-cli agent +list-automations --q "daily" --limit 20 --format table
ae-cli agent +list-automations --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--q` | No | Keyword for automation name or instruction |
| `--status` | No | `active` \| `paused` |
| `--limit` | No | Maximum number of automations to return, 1–10000 |

## Decision Rules
- When the user wants to pause, resume, rename, or edit an automation, call this first to find the target ID.
- `--status active` lists only enabled automations; `--status paused` lists paused ones.
- If many automations are returned, summarize by `name` and `status` to help the user pick the right one.

## Next Steps on Failure
- Empty result: confirm the user has created automations on the active AE host.
- Auth error: run `ae-cli auth login`.

## Recommended Chaining
- `+list-automations` → confirm `id` → `+update-automation`
