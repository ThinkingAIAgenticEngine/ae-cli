# system oauth2 update

This is a `high-risk-write` operation because it changes access, ownership, or authentication policy. Preview the affected scope with `--dry-run`, obtain explicit user confirmation, then use global `--yes` for non-interactive execution. Validation and dry-run do not apply the change.

Use when the user needs to enable or disable company OAuth2 login.

Do not use it outside the system oauth2 operation or with fields absent from the inspected capability schema.

Command:

```bash
ae-cli system oauth2 update --company-id <company-id> --enable-oauth2 <true_or_false> --yes
```

Capability id: `system.oauth2.update`.

The response uses `ok`, `data`, and `meta`. Treat empty `data` as success when `ok=true`; preserve `request_id` and `invocation_id` when present.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--company-id` | Yes | Company ID. |
| `--enable-oauth2` | Yes | Target OAuth2 login state. |
