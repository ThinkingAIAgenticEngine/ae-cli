# experiment bucket list

Query split buckets in a project.

```bash
ae-cli experiment bucket list --project-id <id>
```

Flags:
- `--project-id`, `-p`: Project ID.

Response shape: `data.items` contains split buckets, `data.total` contains the count, and item keys are recursively snake_case.
