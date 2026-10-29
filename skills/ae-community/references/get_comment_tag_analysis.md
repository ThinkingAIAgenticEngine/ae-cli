# ae-community +get_comment_tag_analysis


Comment tag analysis: Specify the tag code and return the count and time trend of each tag value.

Mapping command: `ae-cli community +get_comment_tag_analysis`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--space-id` | int64 | yes | Community space ID returned by `community spaces list` |
| `--game-id` | int64 | no | Deprecated compatibility alias; omit it, or make it equal to `--space-id` |
| `--channel-id` | number | yes | channel ID |
| `--uuid` | string | yes | content UUID |
| `--resource-type` | number | Yes | Resource type: `0` for posts, `1` for videos |
| `--tag-code` | string | Yes | Tag code (obtain via `get_corpus_tags`) |
| `--start-time` | string | No | Earliest comment publish date, format yyyy-MM-dd, default is the publishing time of the post |
| `--end-time` | string | No | Latest comment publish date, format yyyy-MM-dd |

## Example

```bash
# Analyze comment tags
ae-cli community +get_comment_tag_analysis \
  --space-id 1 \
  --channel-id 1 --uuid <uuid> \
  --resource-type 0 --tag-code "sentiment"
```
