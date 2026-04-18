# te-community get_corpus_tags

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../te-shared/SKILL.md)

Query the list of available corpus tags for filtering.

Mapping command: `ae-cli community get_corpus_tags`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--space-id` | number | yes | community space ID |
| `--game-id` | number | yes | game/space ID |

## Example

```bash
# Get the tag list
ae-cli community get_corpus_tags --space-id 1 --game-id 1
```
