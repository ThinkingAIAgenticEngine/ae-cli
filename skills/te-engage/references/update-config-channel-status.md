# te-engage +update_config_channel_status

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Update the status of a config channel.

Mapped command: `ae-cli engage +update_config_channel_status`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--channel_id` | string | Yes | config channel ID |
| `--channel_status` | number | Yes | config channel status |

## Enum Notes

### `--channel_status`

- `1`: enabled
- `2`: disabled

## Safety Constraints

This command is a **write operation** and and modifies the config channel status.

## Examples

```bash
ae-cli engage +update_config_channel_status --project_id 1 --channel_id <channel_id> --channel_status 1
```
