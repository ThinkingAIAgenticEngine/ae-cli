# te-engage +config_item_detail

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Query config item details.

Mapped command: `ae-cli engage +config_item_detail`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--config_id` | string | Yes | config item ID |

## Common enums in the response

### `channelType`

- `1`: `WEBHOOK`
- `2`: `APP_PUSH`
- `3`: `CLIENT_PUSH`
- `4`: `WECHAT`
- `5`: `DOU_YIN`

## Examples

```bash
ae-cli engage +config_item_detail --project_id 1 --config_id cfg_123
```
