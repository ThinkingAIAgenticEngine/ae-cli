# ae-community +get_hot_topics


Ranking of hot topics within a time range.

Mapping command: `ae-cli community +get_hot_topics`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--space-id` | int64 | yes | Community space ID returned by `community spaces list` |
| `--game-id` | int64 | no | Deprecated compatibility alias; omit it, or make it equal to `--space-id` |
| `--start-time` | string | No | Topic statistics start time, format yyyy-MM-dd |
| `--end-time` | string | No | Topic statistics end time, format yyyy-MM-dd |
| `--order-by` | number | No | Sort: 0 by popularity desc, 1 by start time desc |

## Example

```bash
# Get hot topics
ae-cli community +get_hot_topics \
  --space-id 1 \
  --start-time 2024-01-01 --end-time 2024-01-07
```
