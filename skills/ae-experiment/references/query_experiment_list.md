# experiment experiment list

Query experiments in a project with optional filters from the existing list API.

```bash
ae-cli experiment experiment list --project-id <id>
ae-cli experiment experiment list --project-id <id> --status archive
ae-cli experiment experiment list --project-id <id> --traffic-layer-id <layer-id> --group-id <group-id> --query-name checkout
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--status`: Optional status filter (`draft`, `testing`, `pending`, `running`, `paused`, `ended`, `archive`). For the dedicated archived list command, prefer `experiment experiment list-archived`.
- `--traffic-layer-id`: Optional traffic layer ID filter.
- `--group-id`: Optional business group ID filter.
- `--query-name`: Optional fuzzy match against experiment name (`exp_name LIKE`). Does not match `exp_id`.

Response shape: `data.items` contains the experiments, `data.total` contains the count, and item keys are recursively snake_case.

Targeting follows the same semantic projection as detail:
`targeting.definition_request` plus `targeting.definition_status`; internal
`target_config` is not returned.
