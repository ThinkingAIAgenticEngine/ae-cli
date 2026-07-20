# +save_traffic_layer

Create or update a traffic layer.

```bash
ae-cli experiment +save_traffic_layer --project_id <id> --req '<json>'
```

Flags:
- `--project_id`, `-p`: Project ID.
- `--req`: Traffic layer save request JSON object.

Create mode requires `bucketId`, `layerName`, and `layerType` in the request. Modify mode requires `layerId`.
