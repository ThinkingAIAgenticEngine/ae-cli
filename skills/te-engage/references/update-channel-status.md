# te-engage +update_channel_status

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Update the status of an Engage channel.

Mapped command: `ae-cli engage +update_channel_status`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--channel_id` | string | Yes | channel ID |
| `--status` | number | Yes | channel status |

## Enum Notes

### `--status`

- `0`: disabled
- `1`: enabled

## Safety Constraints

This command is a **write operation** and Before executing, confirm that the user explicitly wants to change the channel status.

## Examples

```bash
ae-cli engage +update_channel_status --project_id 1 --channel_id <channel_id> --status 1
```
