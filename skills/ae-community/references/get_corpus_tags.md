# ae-community +get_corpus_tags


Query the list of available corpus tags for filtering.

Mapping command: `ae-cli community +get_corpus_tags`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--space-id` | int64 | yes | Community space ID returned by `community spaces list` |
| `--game-id` | int64 | no | Deprecated compatibility alias; omit it, or make it equal to `--space-id` |

## Example

```bash
# Get the tag list
ae-cli community +get_corpus_tags --space-id 1
```
