# Download evaluation files

Use `ae-cli evaluation file download --id <file-uuid> --output <new-path>`.
Authentication and endpoint rules are in [SKILL.md](../SKILL.md).

1. Queue an export using the dataset or run reference.
2. Poll `+get_file --id <file-uuid>` until COMPLETED. Resource creation alone is
   not evidence that the file is ready; failed/expired files cannot be downloaded.
3. Save the attachment:

```bash
ae-cli evaluation file download --id <file-uuid> --output ./results.csv --dry-run
ae-cli evaluation file download --id <file-uuid> --output ./results.csv
```

The authenticated `/files/{id}/content` route works for local and S3 storage.
The parent directory must exist. The CLI refuses to overwrite an existing path,
saves with owner-only permissions, removes failed partial output, and returns
`{path, byte_size}` in its JSON envelope. Bytes are not printed to stdout.
Dry-run previews the request and destination without opening a file or requesting
a session. Downloads do not follow redirects or retry automatically.

The older `+file_download_url` remains available for temporary URLs, but local
storage returns a server-local `file://` path. Use `file download` for a remote
client. Do not print signed URLs or private file content into reports.

Transition status: transitional
Owning module: Agent Evaluation files
Current transport: authenticated GET /agenteval/api/v1/files/{id}/content
Gateway target: TBD (evaluation file download capability)
Review after: 2027-01-21
Exit condition: migrate to Gateway when authenticated attachment delivery is
available with equivalent binary output, redaction, and no-overwrite guarantees.
