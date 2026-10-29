# ae-community +get_channel_info


Get the list of valid channels for the community space, including channel IDs and names. **This is the prerequisite step for most commands that require `--channel-id` / `--channel-id-list`**: first get the real channel ID here, then call `+search_posts`, `+get_post_detail`, `+get_comments_summary`, `+get_livestream_list`, etc. If the space ID is unknown, run `ae-cli community spaces list` first.

Mapping command: `ae-cli community +get_channel_info`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--space-id` | int64 | yes | Community space ID returned by `community spaces list` |
| `--game-id` | int64 | no | Deprecated compatibility alias; omit it, or make it equal to `--space-id` |

## Example

```bash
# Get channel list
ae-cli community +get_channel_info --space-id 1
```

Copy returned channel IDs exactly. JSON output preserves IDs outside JavaScript's safe integer range
as strings.
