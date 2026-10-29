# ae-community +get_livestream_list


Get the list of livestream sessions for a room (stream history).

Mapping command: `ae-cli community +get_livestream_list`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--space-id` | int64 | yes | Community space ID returned by `community spaces list` |
| `--game-id` | int64 | no | Deprecated compatibility alias; omit it, or make it equal to `--space-id` |
| `--channel-id` | number | no | Channel ID (obtain via `get_livestream_rooms`) |
| `--room-id` | string | No | Room ID (obtain via `get_livestream_rooms`) |
| `--start-time` | string | No | Start date for statistics, format yyyy-MM-dd |
| `--end-time` | string | No | End date for statistics, format yyyy-MM-dd |

## Example

```bash
# Get the livestream session list
ae-cli community +get_livestream_list \
  --space-id 1 --channel-id 1
```
