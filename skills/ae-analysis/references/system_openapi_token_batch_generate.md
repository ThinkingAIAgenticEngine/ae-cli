# system openapi-token batch-generate

Use only when an authorized company operator asks to generate OpenAPI Tokens for named members of their company. Resolve the exact member `open_id` values with [system member list](system_member_list.md) if the operator also has permission to view company members. Use the confirmed member selection and expiration time for the entire batch.

```bash
ae-cli system openapi-token batch-generate --dry-run --company-id <company-id> --open-ids '["<open-id>"]' --expires-at '<ISO-8601-with-offset>'
ae-cli system openapi-token batch-generate --company-id <company-id> --open-ids '["<open-id>"]' --expires-at '<ISO-8601-with-offset>' --yes
```

Capability id: `system.openapi_token.batch_generate`.

Run `--dry-run` first, summarize the company, selected members and expiration time, and wait for explicit user confirmation before rerunning the same request with `--yes`. The preview checks the request and member scope without generating tokens. Gateway execution requires `yes: true`.

| Parameter | Required | Description |
| --- | --- | --- |
| `--company-id` | Yes | Company ID of the authenticated operator. |
| `--open-ids` | Yes | JSON array of 1 to 200 company member open IDs. Duplicate IDs are processed once. |
| `--expires-at` | Yes | Future ISO 8601 timestamp with `Z` or a UTC offset. Applies to newly generated tokens. |

The command generates tokens for members with a missing or expired token and skips members with an active token. Active tokens retain their current expiration. Check `generated_count`, `skipped_count`, `failed_count`, and each member's `status` and error `code` when present. The response carries issuance status and expiration metadata.
