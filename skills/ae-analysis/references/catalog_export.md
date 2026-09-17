# analysis-meta catalog export

Use this command to export one complete, permission-filtered analysis metadata JSONL when the task requires the complete directory, including an explicit complete no-match check. Do not use it again when the current conversation already has a successful export for this project and environment. Follow [`metadata_resolution.md`](metadata_resolution.md) for discovery and confirmation.

```bash
ae-cli analysis-meta catalog export \
  --project-id <project_id> \
  --output ./analysis-meta-catalog-project-<project_id>.jsonl
```

Capability id: `metadata.catalog.export`.

Input: `--project-id` selects the project. `--output` is the required `.jsonl` path and implies waiting for export completion. The CLI streams the download and publishes the finished file with mode `0600`. An existing output is rejected unless replacement is requested with `--force`; a failed download preserves the existing file.

Output: success returns the run/artifact descriptor plus `output_path`, `format: "jsonl"`, `row_count`, `bytes` and `complete: true`. Search the returned absolute path locally. The rows cover accessible events, metrics, event/user properties, clusters and tags.
