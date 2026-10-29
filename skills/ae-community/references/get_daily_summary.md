# ae-community +get_daily_summary


Community daily news for a given day: hot list rankings and selected opinions (positive/negative).

Mapping command: `ae-cli community +get_daily_summary`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--space-id` | int64 | yes | Community space ID returned by `community spaces list` |
| `--game-id` | int64 | no | Deprecated compatibility alias; omit it, or make it equal to `--space-id` |
| `--date` | string | Yes | Date, format yyyy-MM-dd |

## Example

```bash
# Get daily report
ae-cli community +get_daily_summary \
  --space-id 1 --date 2024-01-01
```
