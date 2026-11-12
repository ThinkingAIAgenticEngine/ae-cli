# CLI source request diagnostics

Every source-bearing Capability Gateway, MCP and DataOps HTTP send writes one INFO line with prefix `CLI_SOURCE_SEND` to `$HOME/.ae-cli/log/YYYYMMDD_info.log`. This includes uploads, downloads and explicit retries. Public builds retain this logging even though they omit the internal source header.

The JSON record contains `request_id`, method, target host and path, actual source and its state, local package name/version, and sandbox detection evidence (`runtime_root_env`, `cli_token_file`, `not_detected`). Detection evidence is observed at logging time; the recorded source is always taken from the final outgoing headers. A missing source is a normal public/external case, not a warning.

`X-TA-CLI-Request-Id` is a fresh diagnostic UUID per HTTP send, independent of business request IDs, idempotency keys and Agent turn IDs. Gateways supporting source logs record it as `request_id` in `CLI_SOURCE_RECEIVE`; older gateways ignore it. On the server compare the raw source values and the actual `call_source`, rather than inferring what arrived from the CLI package or sandbox type.

Only allowlisted metadata is logged. Authorization, CLI tokens, cookies, URL userinfo/query/fragment and request/response bodies are excluded. Untrusted values are bounded and JSON-escaped. Diagnostics do not alter source selection, business bodies or command output; logging failures do not block fetch.

Regression: `npm run verify:cli-source-logging`; transport coverage: `npm run verify:capability-api`, `npm run verify:mcp-int64-request`, and `npx tsx tests/dataops-integration.test.ts`.
