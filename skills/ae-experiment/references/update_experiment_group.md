# experiment experiment update-group

Update only the business group of one experiment.

Reuses Hermes `POST /v1/atlas/experiment/updateGroup`. This dedicated endpoint
updates `group_id` only and does not go through full experiment `modify`, so it
will not rewrite traffic, variants, metrics, or other fields.

```bash
ae-cli experiment experiment update-group --project-id <id> --exp-id <exp-id> --group-id <group-id>
ae-cli experiment experiment update-group --project-id <id> --exp-id <exp-id> --group-id 0 --dry-run
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--exp-id`: Experiment ID.
- `--group-id`: Target business group ID. Use `0` for ungrouped.

Response shape: `data.result` is `true` when the update succeeds. Blank
`--group-id` is normalized to `0` on the server.
