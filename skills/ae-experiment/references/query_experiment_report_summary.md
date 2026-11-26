# experiment report summary

Query experiment report summary.

```bash
ae-cli experiment report summary --project-id 1 --exp-id exp_123
ae-cli experiment report summary --project-id 1 --exp-id exp_123 --force-refresh true
```

Required flags: `--project-id`, `--exp-id`. Optional: `--force-refresh`.

Response shape: `data.report`, with recursively snake_case keys.
