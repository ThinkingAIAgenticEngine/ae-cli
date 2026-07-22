# experiment experiment ready-check

Check whether an experiment can enter online status transitions.

```bash
ae-cli experiment experiment ready-check --project-id <id> --exp-id <expId>
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--exp-id`: Experiment ID.

Use this before `experiment experiment manage` moves an experiment to `pending`, `testing`, or `running`.

Response shape: the readiness result is in `data.readiness`, with recursively snake_case keys.
