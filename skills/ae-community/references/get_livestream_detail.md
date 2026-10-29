# ae-community +get_livestream_detail


Details of a single livestream: interactive rankings and paginated interactive content.

Mapping command: `ae-cli community +get_livestream_detail`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--space-id` | int64 | yes | Community space ID returned by `community spaces list` |
| `--game-id` | int64 | no | Deprecated compatibility alias; omit it, or make it equal to `--space-id` |
| `--stream-id` | string | Yes | Live session ID, obtained from get_livestream_list |
| `--activity-types` | string | No | Interaction type filtering: 0 danmaku, 1 gift, 2 eye-catching message, 3 premium, comma separated |
| `--anchor-time` | string | No | Interaction anchor time, format yyyy-MM-dd HH:mm |
| `--search-word` | string | No | Keyword filter interaction details |
| `--order-by` | number | No | Sorting: 0 interaction time desc, 1 interaction time asc |
| `--page-num` | number | No | Page number, starting from 1 |
| `--page-size` | number | No | Number of items per page |

## Example

```bash
# Get livestream details
ae-cli community +get_livestream_detail \
  --space-id 1 --stream-id <stream-id>

# Filter danmaku types
ae-cli community +get_livestream_detail \
  --space-id 1 --stream-id <stream-id> \
  --activity-types 0,1
```
