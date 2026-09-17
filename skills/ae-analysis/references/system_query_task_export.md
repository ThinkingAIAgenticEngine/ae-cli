# system query-task export

Use when the user needs the complete bounded query-monitor task result as a cancellable CSV artifact.

Do not use it for an inline page; use `ae-cli system query-task list` instead.

Command:

```bash
ae-cli system query-task export --company-id <company_id> --start-time '2026-07-24 00:00:00' --end-time '2026-07-24 23:59:59' --status-codes '[4]' --content-codes '[101]' --task-type-codes '[6]' --project-ids '[123]' --output <file>
```

Capability id: `system.query_task.export`.

If the required filter mappings are unknown, call `ae-cli system query-task options --company-id <company_id>` once. Reuse verified mappings within the same company/project scope; do not guess filter codes or cluster names.

Use `--output` to wait and download the completed artifact. If interrupted, resume with `ae-cli analysis run wait --run-id <run_id> --output <file>` using the same export response. See [`run_wait.md`](run_wait.md).

The artifact is CSV and this command intentionally has no `--artifact-format`. Cancel an unfinished export with `ae-cli analysis query cancel --run-id <run_id>`.

The response uses `ok`, `data`, and `meta`. Empty task data is a successful export when `ok=true`; preserve `request_id` and `invocation_id`.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--company-id` | Yes | Company ID. |
| `--start-time` | Yes | Inclusive range start in `yyyy-MM-dd HH:mm:ss`. |
| `--end-time` | Yes | Inclusive range end in `yyyy-MM-dd HH:mm:ss`. |
| `--status-codes` | Yes | Non-empty task status-code JSON array. |
| `--content-codes` | Yes | Non-empty query content-code JSON array. |
| `--task-type-codes` | Yes | Non-empty query task-type-code JSON array. |
| `--project-ids` | Conditional | Non-empty project IDs or space codes are required. |
| `--space-codes` | Conditional | Non-empty space codes or project IDs are required. |
| `--cluster-names` | No | Optional cluster-name JSON array. |
| `--download-columns` | No | Optional allowlisted CSV column JSON array. |
| `--request-id` | No | Caller-supplied `cli_<32 lowercase hex>` lifecycle ID; generated when omitted. |
| `--timeout-seconds` | No | Maximum runtime, `1..21600`; default `21600`. |
| `--output` | No | Wait and download to this local file. |
