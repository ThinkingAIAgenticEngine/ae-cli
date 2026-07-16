# analysis user-tag update-id

Update a tag by remapping imported values to its analysis entity.

Do not use it for condition/metric/first-last/SQL definition changes.

Flags: `--project-id`, `--tag-name` required. Provide exactly one of local `--input-file`, reusable `--input-file-id`, or small-test `--file-content`. Optional: `--display-name`, `--entity-id`, `--remarks`, conditional `--association-property`.

Use `analysis entity id-import-options` for the effective entity. CSV is headerless UTF-8 with exactly two non-empty columns: association value or entity ID, then `tag_value`.

```bash
ae-cli analysis user-tag update-id --project-id <project_id> --tag-name vip_tag --input-file-id <input_file_id>
```

The response reports `operation_status=PROCESSING` and a pending match summary. Read the tag again until processing completes to obtain final uploaded, matched, and unmatched counts.
