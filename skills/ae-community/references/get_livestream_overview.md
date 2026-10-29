# ae-community +get_livestream_overview


Livestream overview trends: number of active rooms, number of sessions, number of interactions and livestream duration.

Mapping command: `ae-cli community +get_livestream_overview`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--space-id` | int64 | yes | Community space ID returned by `community spaces list` |
| `--game-id` | int64 | no | Deprecated compatibility alias; omit it, or make it equal to `--space-id` |
| `--start-time` | string | No | Start date for statistics, format yyyy-MM-dd |
| `--end-time` | string | No | End date for statistics, format yyyy-MM-dd |

## Example

```bash
# Get livestream overview
ae-cli community +get_livestream_overview \
  --space-id 1 \
  --start-time 2024-01-01 --end-time 2024-01-07
```
