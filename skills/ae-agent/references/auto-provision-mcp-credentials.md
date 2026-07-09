# agent +auto-provision-mcp-credentials (Auto-Provision MCP Credentials)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **MCP Credentials / write**

## Use Cases
- Auto-provision per-user credentials for all system-scope MCP servers in one call.
- Endpoint: `POST /api/sandbox/agent/mcp-credentials/auto-provision`.
- Uses the current user's access token to mint MCP tokens via the central token-generation endpoint.
- For `useMcpToken=true` system servers, a shared MCP token is generated and stored; for OAuth system servers, the access token is stored as the credential.

## Mandatory Rules (MUST)
- `--access-token` is optional; when omitted, the current session token is used automatically (via `ctx.token()`).
- The access token must be valid — an invalid/expired token causes the MCP token generation to fail (reported via `mcpTokenFailed: true` in the response).
- Write operation: keep the confirmation prompt unless `--yes` is explicitly requested.
- This is a bulk operation — it upserts credentials for ALL system MCP servers visible to the current user.

## Command
```bash
# Auto-provision using the current session token (recommended)
ae-cli agent +auto-provision-mcp-credentials --yes

# Explicitly pass an access token
ae-cli agent +auto-provision-mcp-credentials --access-token "eyJhbGci..." --yes

# Dry-run to inspect the request
ae-cli agent +auto-provision-mcp-credentials --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--access-token` | No | Access token (defaults to the current session token) |

## Decision Rules
- If the user wants to set up all system MCP credentials in one step, use this command.
- Prefer running without `--access-token` — the CLI automatically sources the current session token.
- The response reports `count` (total system servers processed), `mcpTokenCount` (servers that got a shared MCP token), and `mcpTokenFailed` (whether the MCP token generation failed).
- If `mcpTokenFailed` is `true`, the MCP token endpoint may be down or the access token invalid — check the access token and retry.
- For individual credential control, use `+set-mcp-credential` instead.

## Response Shape
```json
{
  "count": 3,
  "mcpTokenCount": 1,
  "mcpTokenFailed": false
}
```

## Next Steps on Failure
- `401` / auth expired: run `ae-cli auth login`, then retry.
- `mcpTokenFailed: true`: the MCP token generation failed — verify the access token is valid and the MCP token endpoint is configured.

## Recommended Chaining
- `ae-cli auth login` → `+auto-provision-mcp-credentials` → `+list-mcp-credentials` (verify) → `+mcp-token` (get shared token)
