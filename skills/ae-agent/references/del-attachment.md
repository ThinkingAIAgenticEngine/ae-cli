# agent +del-attachment (Delete Attachment)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Attachments / write**

## Use Cases
- Soft-delete an attachment.
- Endpoint: `DELETE /api/sandbox/agent/attachments?id=[id]`.

## Mandatory Rules (MUST)
- `--id` is required. Obtain the real attachment ID via `+list-attachments` — do not guess.
- This is a soft delete — prefer `--dry-run` before executing.
- Write operation: keep the confirmation prompt unless `--yes` is explicitly requested.

## Command
```bash
ae-cli agent +del-attachment --id <attachment-id> --yes
ae-cli agent +del-attachment --dry-run --id <attachment-id>
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--id` | Yes | Attachment ID |

## Decision Rules
- Confirm the attachment ID with `+list-attachments` before deleting.
- This is a soft delete, not a physical removal.

## Next Steps on Failure
- `404` / not found: re-run `+list-attachments` to verify the attachment ID.

## Recommended Chaining
- `+list-attachments` → confirm `id` → `+del-attachment`
