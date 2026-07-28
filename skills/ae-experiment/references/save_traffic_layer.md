# experiment traffic-layer save

Create or update a traffic layer.

```bash
ae-cli experiment traffic-layer save --project-id <id> --req '<json>'
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--req`: Traffic layer save request JSON object.

Create mode requires `bucketId`, `layerName`, and `layerType` in the request. Modify mode requires `layerId`.
