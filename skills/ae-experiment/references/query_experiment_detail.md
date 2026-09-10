# experiment experiment get

Query full experiment detail.

```bash
ae-cli experiment experiment get --project-id <id> --exp-id <expId>
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--exp-id`: Experiment ID.

Response shape: the experiment is in `data.item`, with recursively snake_case keys such as `exp_id` and `feature_key_list`.

When targeting contains reversible QP, it is returned as
`targeting.definition_request` with `targeting.definition_status=AVAILABLE`.
An absent definition is `NOT_APPLICABLE`; a historical unsupported definition is
`UNAVAILABLE` with `definition_unavailable_reason`. The internal `target_config`
field is never returned.
