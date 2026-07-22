# experiment traffic-layer list

Query traffic layers in a project.

```bash
ae-cli experiment traffic-layer list --project-id <id>
```

Flags:
- `--project-id`, `-p`: Project ID.

Response shape: `data.items` contains traffic layers, `data.total` contains the count, and item keys are recursively snake_case.
