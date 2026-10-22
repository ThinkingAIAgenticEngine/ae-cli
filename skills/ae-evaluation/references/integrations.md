# AI Monitor and TE reporting

Commands use `ae-cli evaluation +<command>`. Read the shared endpoint, authentication, and mutation rules in [SKILL.md](../SKILL.md). Use command `--help` for optional flags.

```bash
ae-cli evaluation +get_te_report_config
ae-cli evaluation +save_te_report_config --base-url "<url>" --app-id "<id>" [--lock-version <n>]
ae-cli evaluation +get_ai_monitor_connection
ae-cli evaluation +save_ai_monitor_connection --base-url "<url>" --credential-id <uuid> --session-claims-json '{...}' [--lock-version <n>]
ae-cli evaluation +verify_ai_monitor_connection
ae-cli evaluation +import_ai_monitor_traces --name "<name>" --selection-json '{...}' [--idempotency-key "<key>"]
ae-cli evaluation +list_te_claude_catalog --endpoint-url "<url>" [--credential-id <legacy-uuid>]
```

- `+save_te_report_config` / `+save_ai_monitor_connection`: omit `--lock-version` on first create; on update send the current version from the get command (0 is a valid version — never treat it as "unset").

- `--session-claims-json` requires string `user_id`, `te_user_id`, `name`, `company_id` (optional `is_root`, `platform_access`); values are redacted in dry-run output and must not be logged.
- `+list_te_claude_catalog` uses the login access token automatically under TE authentication. Supply `--credential-id` only for legacy non-TE authentication.

### Import AI Monitor traces into a dataset

The import is asynchronous: the 201 response returns the created dataset and import job — poll `+dataset_import_status` instead of treating creation as completion. `--session-claims-json` and selection content are identity/permission sensitive; never log or echo them.

```bash
ae-cli evaluation +get_ai_monitor_connection
ae-cli evaluation +save_ai_monitor_connection \
  --base-url "https://ai-monitor.example.com" \
  --credential-id <ai-monitor-session-credential-uuid> \
  --session-claims-json '{"user_id":"...","te_user_id":"...","name":"...","company_id":"..."}' \
  --lock-version <n>
ae-cli evaluation +verify_ai_monitor_connection
ae-cli evaluation +import_ai_monitor_traces \
  --name "ai-monitor-traces" \
  --selection-json '{"mode":"TRACE_IDS","trace_ids":["trace-1"]}' \
  --idempotency-key "aim-$(date +%s)"
ae-cli evaluation +dataset_import_status --id <dataset-uuid>   # poll until READY
```

FILTER mode uses `{"mode":"FILTER","start_time":"<date>","end_time":"<date>"}` with optional `agent`, `channel`, `search_term`. Both dates must be valid calendar dates in `YYYY-MM-DD` format, with `end_time` not preceding `start_time`; impossible dates such as February 30 are rejected locally. TRACE_IDS carries 1-1000 ids.
