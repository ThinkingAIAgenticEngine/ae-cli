# analysis super-metadata import

Use when the user needs to pre-import and confirm-import super event and super property configuration.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis super-metadata import --project-id <project_id> --payload '{}'
ae-cli analysis super-metadata import --dry-run
```

Capability id: `metadata.super_metadata.import`.

Input sends `project_id`, `payload`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--payload` | No | Optional capability payload JSON. |
