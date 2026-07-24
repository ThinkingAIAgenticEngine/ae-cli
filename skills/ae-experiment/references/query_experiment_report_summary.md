# capability run experiment.report.summary

Query experiment report summary.

```bash
ae-cli capability run experiment.report.summary --input '{"project_id":1,"exp_id":"exp_123","force_refresh":false}'
```

Required input: `project_id`, `exp_id`. Optional input: `force_refresh`.

Response shape: `data.report`, with recursively snake_case keys.
