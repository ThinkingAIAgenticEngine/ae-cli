# ae-community +get_tag_trends


Daily tag trend: Given a tag code and a time range, return the count and time series of each tag value.

Mapping command: `ae-cli community +get_tag_trends`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--space-id` | int64 | yes | Community space ID returned by `community spaces list` |
| `--game-id` | int64 | no | Deprecated compatibility alias; omit it, or make it equal to `--space-id` |
| `--tag-code` | string | Yes | Tag code (obtain via `get_corpus_tags`) |
| `--channel-id-list` | string | No | List of channel IDs, comma separated |
| `--start-time` | string | No | Start date for statistics, format yyyy-MM-dd |
| `--end-time` | string | No | End date for statistics, format yyyy-MM-dd |

## Example

```bash
# Get tag trends
ae-cli community +get_tag_trends \
  --space-id 1 \
  --tag-code "game_version" \
  --start-time 2024-01-01 --end-time 2024-01-07
```
