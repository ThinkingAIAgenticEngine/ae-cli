# experiment traffic-layer get

Query traffic layer detail.

```bash
ae-cli experiment traffic-layer get --project-id <id> --layer-id <layerId>
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--layer-id`: Traffic layer ID.

Response shape: the traffic layer is in `data.item`, with recursively snake_case keys.
