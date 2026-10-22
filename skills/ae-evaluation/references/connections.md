# Models, agents, and credentials

Commands use `ae-cli evaluation +<command>`. Read the shared endpoint, authentication, and mutation rules in [SKILL.md](../SKILL.md). Use command `--help` for optional flags.

### Model configs

```bash
ae-cli evaluation +list_model_configs
ae-cli evaluation +get_model_config --id <model-config-uuid>
ae-cli evaluation +create_model_config --name "<name>" --provider OPENAI_COMPATIBLE_CHAT|ANTHROPIC_CHAT|GEMINI_CHAT|AZURE_OPENAI_CHAT|TE_CLAUDE_WEB \
  --model-name "<model>" --base-url "<url>" [--parameters-json '<json>'] [--capabilities-json '<json>'] [--credential-id <uuid>]
ae-cli evaluation +update_model_config --id <model-config-uuid> [same fields as +create_model_config] --lock-version <n>
ae-cli evaluation +delete_model_config --id <model-config-uuid> --lock-version <n>
ae-cli evaluation +test_model_config_connectivity --id <model-config-uuid>
ae-cli evaluation +transfer_model_config_owner --id <model-config-uuid> --owner-user-id <user-uuid> --lock-version <n>
```

- `--capabilities-json` must set `chat_completions: true` and `max_context_tokens >= 1`, otherwise `MODEL_CONFIG_INVALID`.
- Use `MODEL_PARAMETERS_V2` for new model configs. It omits `max_output_tokens`; output limits are controlled by the provider. Historical frozen snapshots may still contain V1.
- `+update_model_config` is full-replace: `+get_model_config` first and pass every field back.
- The platform validates outbound reachability at create time; unreachable base URLs are rejected.

### Agents

```bash
ae-cli evaluation +list_agents
ae-cli evaluation +get_agent --id <agent-uuid>
ae-cli evaluation +create_agent --name "<name>" --endpoint-url "<url>" \
  --input-schema-json '{"schema_version":"AGENT_INPUT_SCHEMA_V1","type":"object","properties":{...},"required":[...]}' \
  --config-json '<AGENT_CONFIG_V* json>' \
  [--connector-type HTTP_JSON_V1|OPENCODE_SERVER|OPENCLAW_GATEWAY_V1|HERMES_RUNS_V1|TE_CLAUDE_WEB_V1] [--credential-id <uuid>]
ae-cli evaluation +update_agent --id <agent-uuid> [same fields as +create_agent] --lock-version <n>
ae-cli evaluation +delete_agent --id <agent-uuid> --lock-version <n>
ae-cli evaluation +test_agent_connectivity --id <agent-uuid>
ae-cli evaluation +agent_snapshot_preview --id <agent-uuid>
ae-cli evaluation +transfer_agent_owner --id <agent-uuid> --owner-user-id <user-uuid> --lock-version <n>
```

- `--config-json` must match the connector type; use `+get_agent` on a working agent as a template. Hermes direct transport uses `AGENT_CONFIG_V2.config.hermes.transport_mode=DIRECT`; use `+list_te_claude_catalog` to discover TE Claude agent/model ids for `TE_CLAUDE_WEB` configs.
- Under TE authentication, TE Claude model and agent configs bind the login credential automatically; omit `--credential-id`. The flag remains available for legacy non-TE authentication.

### Credentials

```bash
ae-cli evaluation +list_credentials
ae-cli evaluation +get_credential --id <credential-uuid>
ae-cli evaluation +create_credential --name "<name>" --type BEARER_TOKEN|API_KEY_HEADER|AI_MONITOR_SESSION --secret "<secret>" [--header-name "<header>"] \
  [--data-token "<token>"] [--report-source "<source>"]
ae-cli evaluation +update_credential --id <credential-uuid> --name "<name>" --lock-version <n>
ae-cli evaluation +rotate_credential --id <credential-uuid> --secret "<new-secret>" --lock-version <n>
ae-cli evaluation +disable_credential --id <credential-uuid> --lock-version <n>
ae-cli evaluation +enable_credential --id <credential-uuid> --lock-version <n>
ae-cli evaluation +delete_credential --id <credential-uuid> --lock-version <n>
ae-cli evaluation +transfer_credential_owner --id <credential-uuid> --owner-user-id <user-uuid> --lock-version <n>
```

- Credential enabling/disabling is high-risk and requires confirmation. Non-interactive calls require explicit authorization and global `--yes`; `--dry-run` remains a local preview.
- Evaluation error output redacts submitted secrets and session tokens, including JSON-escaped and URL-encoded forms. Remote error messages and hints are not written to CLI logs.
- Secrets are write-only: sent once on create/rotate, never returned or logged by the CLI.
- `AI_MONITOR_SESSION` credentials additionally require `--data-token` (max 512) and `--report-source` (max 128); all three are sensitive — dry-run redacts them and they must never be logged.

### Bring your own model and agent

Credentials are prerequisites for model configs and agents:

```bash
ae-cli evaluation +create_credential --name "my-ark-token" --type BEARER_TOKEN --secret "<secret>"
ae-cli evaluation +create_model_config --name "my-judge" --provider OPENAI_COMPATIBLE_CHAT \
  --model-name "kimi-k3" --base-url "http://10.0.0.1:3003" \
  --credential-id <credential-uuid> \
  --parameters-json '{"schema_version":"MODEL_PARAMETERS_V2","temperature":0,"top_p":1,"seed":1,"timeout_ms":120000,"max_retries":2,"structured_output":"AUTO"}' \
  --capabilities-json '{"schema_version":"MODEL_CAPABILITIES_V1","chat_completions":true,"json_schema":false,"seed":true,"usage":true,"max_context_tokens":8192}'
ae-cli evaluation +test_model_config_connectivity --id <model-config-uuid>
```

To change one setting (e.g. timeout), `+update_model_config` is full-replace: `+get_model_config`, edit the JSON, pass every field back.

Ownership transfers and credential deletion require ADMIN. TE Claude catalog discovery is documented in [integrations.md](integrations.md).
