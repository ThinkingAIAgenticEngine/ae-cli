# ae-community +search_posts


Search community posts/videos for multi-criteria filtering.

Mapping command: `ae-cli community +search_posts`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--space-id` | int64 | yes | Community space ID returned by `community spaces list` |
| `--game-id` | int64 | no | Deprecated compatibility alias; omit it, or make it equal to `--space-id` |
| `--channel-id-list` | string | No | List of channel IDs, comma separated |
| `--keywords` | string | No | List of keywords, comma separated |
| `--start-time` | string | Yes | Minimum content post time, format yyyy-MM-dd |
| `--end-time` | string | Yes | Maximum content post time, format yyyy-MM-dd |
| `--official` | boolean | No | Official account only |
| `--resource-type` | string | No | Resource type: 0 posts, 1 video, comma separated |
| `--search-mode` | number | No | Search mode: 0 word (default), 1 exact match, 2 author names |
| `--search-word` | string | No | Full-text search term, in conjunction with searchMode |
| `--sentiment-types` | string | No | Emotion type: 0 negative, 1 positive, 2 neutral, comma separated |
| `--topic-id-list` | string | No | Topic IDs returned by `+get_hot_topics`, comma separated |
| `--tag-filters` | JSON | No | Corpus tag filter array using `tagName`, `tagCode`, `inferenceType`, `calcuSymbol`, and optional `ftv` |
| `--order-by` | number | No | Sort: 0 time desc, 1 weight desc, 2 time asc, 3 replies desc, 4 heat desc |
| `--page-num` | number | No | Page from 1 |
| `--page-size` | number | No | Number of bars per page |

Examples

```bash
# Basic search
ae-cli community +search_posts \
  --space-id 1 \
  --start-time 2024-01-01 --end-time 2024-01-07

# Filter by channel and sentiment
ae-cli community +search_posts \
  --space-id 1 \
  --start-time 2024-01-01 --end-time 2024-01-07 \
  --channel-id-list 1,2 \
  --sentiment-types 0,1

# Pagination query
ae-cli community +search_posts \
  --space-id 1 \
  --start-time 2024-01-01 --end-time 2024-01-07 \
  --page-num 1 --page-size 20

# Filter by topic and corpus tag
ae-cli community +search_posts \
  --space-id 1 \
  --start-time 2024-01-01 --end-time 2024-01-07 \
  --topic-id-list topic-1,topic-2 \
  --tag-filters '[{"tagName":"Character","tagCode":"hero","inferenceType":"label","calcuSymbol":"C04"}]'
```

`inferenceType` must be `label` or `score` and should be copied from `+get_corpus_tags`.
Label filters support `C04` (has value) and `C05` (no value). Score filters support
`C00`, `C01`, `C02`, `C020`, `C03`, `C030`, `C04`, `C05`, and `C06`; comparisons other
than `C04`/`C05` require an `ftv` JSON array, and `C06` requires at least two values.
