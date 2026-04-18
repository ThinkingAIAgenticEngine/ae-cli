# te-engage +channel_list

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Query the list of Engage channels in a project.

Mapped command: `ae-cli engage +channel_list`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--provider_list` | json | No | Provider list JSON array |
| `--channel_status` | number | No | Channel status filter |

## Enum Notes

### `--channel_status`

- `0`: disabled
- `1`: enabled

### `--provider_list`

Common provider / channelSubBizType values:

- `webhook`
- `fcm`
- `aurora`
- `apns`
- `client`
- `wechat_mini_game`
- `dou_yin_recommended_game_card`

## Examples

```bash
ae-cli engage +channel_list --project_id 1
ae-cli engage +channel_list --project_id 1 --provider_list '["webhook","fcm"]'
```
