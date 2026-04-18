---
name: te-shared
version: 1.0.0
description: "TE CLI basics: authentication configuration, global parameters, error handling, and security constraints"
metadata:
  requires:
    bins: ["ae-cli"]
  cliHelp: "ae-cli --help"
---

# te-shared

TE CLI (`ae-cli`) is the command-line tool for the ThinkingEngine data analysis platform, used by AI Agents and human users.

## Authentication

You must authenticate before use. Authentication priority:

1. Environment variable `TE_TOKEN` (highest priority, suitable for CI/scripts)
2. Cached token (`~/.ae-cli/tokens.json`, valid for 20 hours)
3. macOS automatically extracts it from Chrome (macOS only)

### Authentication Commands

```bash
# Automatic macOS authentication (extract token from Chrome)
ae-cli auth login

# Manually set token
ae-cli auth set-token <token>

# View authentication status
ae-cli auth status

# Log out
ae-cli auth logout
```

### Multi-environment Support

```bash
# Specify host
ae-cli auth login --host ta-staging.example.com
ae-cli auth set-token <token> --host ta-staging.example.com

# Configure default host
ae-cli config set defaultHost ta-staging.example.com
```

## Global Parameters

All commands support the following global parameters:

| Parameter | Description | Default |
|------|------|--------|
| `--host <host>` | TE instance address | defaultHost from config or ta.thinkingdata.cn |
| `--format <json\|table>` | Output format | json |
| `--jq <expr>` | jq filter expression | - |
| `--dry-run` | Show the request only, do not execute it | false |
| `--yes` | Skip confirmation for write operations | false |

## Output Format

### JSON (default)

```json
{
  "ok": true,
  "data": { ... }
}
```

### Table

```bash
ae-cli analysis_meta +list_events --project_id <YOUR_PROJECT_ID> --format table
```

### jq Filtering

```bash
ae-cli analysis_meta +list_events --project_id <YOUR_PROJECT_ID> --jq '.'
```

## Error Handling

Error output goes to stderr, in the following format:

```json
{
  "ok": false,
  "error": {
    "type": "auth | api | validation | config",
    "message": "...",
    "hint": "..."
  }
}
```

Exit code: success `0`, error `1`.

## Security Constraints

- Commands with `risk: read` execute directly
- Commands with `risk: write` require confirmation unless `--yes` is passed
- Use `--dry-run` to preview the request that will be sent

## Command Structure

```bash
ae-cli <domain> +<command> [flags]
ae-cli api <METHOD> <PATH> [--params] [--data]
```

Domains: `analysis` (analysis), `analysis_audience` (audience), `analysis_meta` (metadata), `analysis_common` (common), `operation` (operations)
