# +save_experiment

Create or update an experiment draft.

```bash
ae-cli experiment +save_experiment --project_id <id> --req '<json>'
```

Flags:
- `--project_id`, `-p`: Project ID.
- `--req`: Experiment save request JSON object.

Notes:
- Blank `req.expId` creates a draft and returns an experiment ID.
- Non-blank `req.expId` patches the existing draft.
- `req.projectId` is overwritten from `--project_id`.
- Use `+check_experiment_ready` before moving to `pending`, `testing`, or `running`.
