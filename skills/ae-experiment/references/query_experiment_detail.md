# experiment experiment get

Query full experiment detail.

```bash
ae-cli experiment experiment get --project-id <id> --exp-id <expId>
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--exp-id`: Experiment ID.

Response shape: the experiment is in `data.item`, with recursively snake_case keys such as `exp_id` and `feature_key_list`.
