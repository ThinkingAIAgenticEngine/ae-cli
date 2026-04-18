# te-engage +config_channel_detail

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Query config channel details.

Mapped command: `ae-cli engage +config_channel_detail`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--channel_id` | string | Yes | config channel ID |

## Common enums in the response

### `channelType`

- `0`: `WEBHOOK`
- `1`: `CLIENT`

### `channelStatus`

- `1`: enabled
- `2`: disabled

## Examples

```bash
ae-cli engage +config_channel_detail --project_id 1 --channel_id <channel_id>
```
