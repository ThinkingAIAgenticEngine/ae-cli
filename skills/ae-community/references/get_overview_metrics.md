# ae-community +get_overview_metrics


Overall community metrics within time range: number of posts/replies, sentiment count, channel breakdown.

Mapping command: `ae-cli community +get_overview_metrics`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--space-id` | int64 | yes | Community space ID returned by `community spaces list` |
| `--game-id` | int64 | no | Deprecated compatibility alias; omit it, or make it equal to `--space-id` |
| `--channel-id-list` | string | No | List of channel IDs, comma separated |
| `--start-time` | string | Yes | Start date for statistics, format yyyy-MM-dd |
| `--end-time` | string | Yes | End date for statistics, format yyyy-MM-dd |

## Example

```bash
# Get overall indicators
ae-cli community +get_overview_metrics \
  --space-id 1 \
  --start-time 2024-01-01 --end-time 2024-01-07
```
