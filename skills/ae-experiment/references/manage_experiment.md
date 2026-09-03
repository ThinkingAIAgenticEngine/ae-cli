# experiment experiment manage

Manage experiment status.

```bash
ae-cli experiment experiment manage --project-id <id> --exp-id <expId> --target-status <status> [--remark <text>]
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--exp-id`: Experiment ID.
- `--target-status`: One of `draft`, `testing`, `pending`, `running`, `paused`, `ended`, `archive`.
- `--remark`: Optional operation remark.

When target status is `pending`, `testing`, or `running`, Hermes performs a ready check before changing status.

Response shape: the operation or blocking readiness result is in `data.result`, with object keys recursively converted to snake_case.
