# experiment experiment list-archived

Query archived experiments in a project.

This command reuses the existing experiment list API and hardcodes `status=archive`.
It only accepts `--project-id`; it does not expose additional filters.

```bash
ae-cli experiment experiment list-archived --project-id <id>
```

Flags:
- `--project-id`, `-p`: Project ID.

Response shape: `data.items` contains the archived experiments, `data.total` contains the count, and item keys are recursively snake_case.

Targeting is returned through `targeting.definition_request` and
`targeting.definition_status`; internal `target_config` is not returned.
