# system receiver-detection get

Use when the user authorizes retrieving receiver-address detection configuration, including initialization. This capability has `risk=write` and requires `system:write`: it may initialize a default task and trigger detection. Keep it out of read-only discovery and audit paths.

Do not use it outside the system receiver-detection operation or with fields absent from the inspected capability schema.

Command:

```bash
ae-cli system receiver-detection get --company-id <company-id> --address-url <address-url>
```

Capability id: `system.receiver_detection.get`.

The response uses `ok`, `data`, and `meta`. Treat empty `data` as success when `ok=true`; preserve `request_id` and `invocation_id` when present.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--company-id` | Yes | Company ID. |
| `--address-url` | Yes | Receiver address URL. |
