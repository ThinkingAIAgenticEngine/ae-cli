# ae-community +get_livestream_analysis


AI-generated single livestream analysis report: highlight periods (with indicators and AI interpretation) and emotional views.

Mapping command: `ae-cli community +get_livestream_analysis`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--space-id` | int64 | yes | Community space ID returned by `community spaces list` |
| `--game-id` | int64 | no | Deprecated compatibility alias; omit it, or make it equal to `--space-id` |
| `--stream-id` | string | Yes | Livestream session ID, streamId from `get_livestream_list` |

## Example

```bash
ae-cli community +get_livestream_analysis \
  --space-id 1 \
  --stream-id <stream-id>
```
