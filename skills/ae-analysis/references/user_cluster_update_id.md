# analysis user-cluster update-id

Update a cluster by remapping imported values to its analysis entity.

Do not use it for a condition/SQL cluster. The existing entity binding cannot be changed by this command.

Flags: `--project-id`, `--cluster-name` required. Provide exactly one of local `--input-file`, reusable `--input-file-id`, or small-test `--file-content`. Optional: `--display-name`, `--remarks`, conditional `--association-property`.

Use `analysis entity id-import-options` for the bound entity. CSV is headerless UTF-8 with exactly one non-empty column per row. Pass `--association-property` only for the primary user entity.

```bash
ae-cli analysis user-cluster update-id --project-id <project_id> --cluster-name vip_ids --input-file-id <input_file_id>
```

The response reports `operation_status=PROCESSING` and a pending match summary. Read the cluster again until processing completes to obtain final uploaded, matched, and unmatched counts.
