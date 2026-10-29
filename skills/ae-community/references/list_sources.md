# List Configured Community Sources

Use this L2 command when an ingestion or reporting workflow needs the exact source and channel IDs
configured in a selected community space.

## Command

```bash
ae-cli community sources list --space-id <space-id>
```

## Input

| Flag | Required | Description |
|---|---|---|
| `--space-id` | yes | Positive signed int64 space ID returned by `community spaces list`. |

The command is backed by `community.source.list` and requires the product's data-configuration view
permission. A permission error does not mean that the space has no data sources.

## Output and next step

Each source includes its `sourceId`, `sourceName`, `sourceType`, `channelId`, and `channelName`, plus
the configured template/config metadata. Preserve every digit of IDs exactly.

For `community data report`, select the source that matches the real data producer, then pass its
`sourceId` as `--source-id` and its `channelId` as `--channel-id`. Do not choose a source by position
in the list and never fabricate a missing source.
