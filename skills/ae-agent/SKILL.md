---
name: ae-agent
version: 1.0.0
description: "AE Agent platform resource management CLI for adding/removing/listing/toggling custom models, MCP servers, Skills, and uploading sandbox files to the attachment library. Use when the user asks to manage Agent platform resources: add a custom model, configure an MCP server, create or toggle a Skill, or upload generated files to the attachment library for download. Must use ae-cli agent commands."
---

# ae-agent

AE CLI (`ae-cli`) agent platform resource commands are invoked through:

```bash
ae-cli agent +<command> [options]
```

## Global Rules

- Use this skill for Agent platform resource management: models, MCP servers, Skills, and attachments.
- Read operations can run directly. Write operations require explicit user intent and normally keep the confirmation prompt unless `--yes` is passed.
- Prefer `--dry-run` before destructive writes.
- Only personal scope resources can be created or deleted; company/system resources are read-only in the CLI.
- Toggle operations on company/system resources only affect the current user's preference, not the global state.
- JSON flags must be valid JSON strings, usually wrapped in single quotes in shell.
- Successful commands return JSON by default. Use `--format table` when a table is easier to scan.
- `--host <url>` overrides the active AE host. It is available on every command and may be placed after the subcommand, e.g. `ae-cli agent +<command> --host <url>`.

## Commands

### Models

| Command | Risk | Purpose |
|---|---:|---|
| `+list-models` | read | List models visible to current user (personal/company/system). |
| `+add-model` | write | Add a custom model (personal scope). |
| `+del-model` | write | Delete a personal model. |
| `+toggle-model` | write | Enable or disable a model. |

### MCP Servers

| Command | Risk | Purpose |
|---|---:|---|
| `+list-mcps` | read | List MCP servers visible to current user. |
| `+add-mcp` | write | Add an MCP server (personal scope). |
| `+del-mcp` | write | Delete a personal MCP server. |
| `+toggle-mcp` | write | Enable or disable an MCP server. |

### Skills

| Command | Risk | Purpose |
|---|---:|---|
| `+list-skills` | read | List Skills visible to current user. |
| `+add-skill` | write | Create a custom Skill (personal scope). |
| `+del-skill` | write | Delete a personal Skill (physical delete). |
| `+toggle-skill` | write | Enable or disable a Skill. |

### Attachments

| Command | Risk | Purpose |
|---|---:|---|
| `+list-attachments` | read | List user attachments (paginated). |
| `+add-attachment` | write | Upload sandbox file(s) to attachment library. |
| `+del-attachment` | write | Soft-delete an attachment. |

## Usage Examples

### List all visible models

```bash
ae-cli agent +list-models
ae-cli agent +list-models --scope personal --format table
```

### Add a custom model

```bash
ae-cli agent +add-model \
  --model-id gpt-4o \
  --name "GPT-4o" \
  --base-url "https://api.openai.com/v1" \
  --api-key "sk-xxx" \
  --provider openai
```

### Add an MCP server

```bash
ae-cli agent +add-mcp \
  --name my-mcp \
  --url "https://mcp.example.com/mcp" \
  --transport http \
  --headers '{"Authorization":"Bearer token"}'
```

### Create a Skill with inline instructions

```bash
ae-cli agent +add-skill \
  --name code-reviewer \
  --description "Reviews code for best practices" \
  --instructions "You are a code reviewer. Analyze the code for..."
```

### Create a Skill with instructions from stdin

```bash
echo "You are a helpful assistant that..." | \
  ae-cli agent +add-skill --name helper --description "Helper skill" --instructions @-
```

### Upload a single file to attachment library

```bash
ae-cli agent +add-attachment --file ./output/report.png
```

### Upload multiple files

```bash
ae-cli agent +add-attachment --files '["./report.png", "./data.csv", "./chart.pdf"]'
```

### Toggle a model on/off

```bash
ae-cli agent +toggle-model --id <model-cuid> --enabled true
ae-cli agent +toggle-model --id <model-cuid> --enabled false
```

## Notes

- Only `personal` scope resources can be created or deleted via CLI.
- MCP creation automatically validates server connectivity.
- Attachment upload supports files up to 50MB each, with a 1GB user quota.
- Batch attachment uploads support partial success — individual file failures don't affect others.
- Skill `--instructions @-` reads from stdin, useful for piping long instruction text.
