# experiment feature list

Query Features in a project.

```bash
ae-cli experiment feature list --project-id <id>
```

Flags:
- `--project-id`, `-p`: Project ID.

Response shape: `data.items` contains Features, `data.total` contains the count, and item keys are recursively snake_case.
