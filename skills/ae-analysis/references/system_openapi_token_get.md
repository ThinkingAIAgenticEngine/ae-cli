# system openapi-token get

Use only when the user wants to check or retrieve the signed-in account's existing OpenAPI Token. The service uses the authenticated account and its company policy for personal OpenAPI access.

```bash
ae-cli system openapi-token get
ae-cli system openapi-token get --output <new-protected-local-file>
```

Capability id: `system.openapi_token.get`.

The default output contains the token status and expiration time when available. The status is `active`, `expired`, `not_generated`, or `disabled`. The command reads existing state without creating or extending tokens.

Pass `--output` only when the user needs the active token itself. The CLI writes it to a new private local file and reports the path alongside the status. Use the file as the credential source and keep its contents out of chat and logs. An existing path is rejected. Validation and dry-run expose metadata only.
