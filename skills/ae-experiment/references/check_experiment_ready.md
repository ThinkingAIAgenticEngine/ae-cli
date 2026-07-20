# +check_experiment_ready

Check whether an experiment can enter online status transitions.

```bash
ae-cli experiment +check_experiment_ready --project_id <id> --exp_id <expId>
```

Flags:
- `--project_id`, `-p`: Project ID.
- `--exp_id`: Experiment ID.

Use this before `+manage_experiment` moves an experiment to `pending`, `testing`, or `running`.
