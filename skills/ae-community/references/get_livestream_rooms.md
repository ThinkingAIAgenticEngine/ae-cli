# ae-community +get_livestream_rooms


Search livestream rooms by time range and channel, and return room lists and statistics.

Mapping command: `ae-cli community +get_livestream_rooms`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--space-id` | int64 | yes | Community space ID returned by `community spaces list` |
| `--game-id` | int64 | no | Deprecated compatibility alias; omit it, or make it equal to `--space-id` |
| `--channel-id-list` | string | No | List of channel IDs, comma separated |
| `--start-time` | string | No | Start date for statistics, format yyyy-MM-dd |
| `--end-time` | string | No | End date for statistics, format yyyy-MM-dd |

## Example

```bash
# Search livestream room
ae-cli community +get_livestream_rooms \
  --space-id 1 \
  --start-time 2024-01-01 --end-time 2024-01-07
```
