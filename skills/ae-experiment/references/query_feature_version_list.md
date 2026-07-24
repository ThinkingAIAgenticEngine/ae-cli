# experiment feature version-list

List Feature version history for one Feature key.

Reuse the existing Hermes `GET /v1/atlas/feature/versions` API and return the full
version records, including `version_snapshot`.

Use with `experiment feature get --version <featureVersionId>` to inspect one version.

```bash
ae-cli experiment feature version-list --project-id <id> --feature-key <feature-key>
ae-cli experiment feature get --project-id <id> --feature-key <feature-key> --version <featureVersionId>
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--feature-key`: Feature key.

Response shape: `data.items` contains version history records, `data.total` contains
the count, and item keys are recursively snake_case.
