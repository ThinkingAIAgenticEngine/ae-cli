# experiment feature get

Query Feature detail by key and optional version.

```bash
ae-cli experiment feature get --project-id <id> --feature-key <key> [--version <versionId>]
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--feature-key`: Feature key.
- `--version`: Optional Feature version ID.

Response shape: the Feature is in `data.item`, with recursively snake_case keys such as `feature_key` and `target_platform`.
