# +manage_experiment

Manage experiment status.

```bash
ae-cli experiment +manage_experiment --project_id <id> --exp_id <expId> --target_status <status> [--remark <text>]
```

Flags:
- `--project_id`, `-p`: Project ID.
- `--exp_id`: Experiment ID.
- `--target_status`: One of `draft`, `testing`, `pending`, `running`, `paused`, `ended`, `archive`.
- `--remark`: Optional operation remark.

When target status is `pending`, `testing`, or `running`, the MCP server performs a ready check first.
