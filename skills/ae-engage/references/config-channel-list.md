# ae-engage +config_channel_list


Query the config channel list.

Mapped command: `ae-cli engage +config_channel_list`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--channel_type` | number | No | config channel type |

## Enum Notes

### `--channel_type`

- `0`: `WEBHOOK`
- `1`: `CLIENT`

## Examples

```bash
ae-cli engage +config_channel_list --project_id 1
```
