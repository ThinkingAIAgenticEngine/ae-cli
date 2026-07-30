# experiment feature save

Create or update a Feature.

```bash
ae-cli experiment feature save --project-id <id> --req '<json>'
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--req`: Feature save request JSON object.

Create mode requires `featureKey`, `type`, and `targetPlatform`. Modify mode uses `id` or `update=true`.
