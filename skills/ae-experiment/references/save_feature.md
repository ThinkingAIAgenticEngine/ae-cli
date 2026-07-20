# +save_feature

Create or update a Feature.

```bash
ae-cli experiment +save_feature --project_id <id> --req '<json>'
```

Flags:
- `--project_id`, `-p`: Project ID.
- `--req`: Feature save request JSON object.

Create mode requires `featureKey`, `type`, and `targetPlatform`. Modify mode uses `id` or `update=true`.
