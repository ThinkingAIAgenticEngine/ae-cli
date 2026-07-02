---
name: ae-agent
version: 1.1.0
description: "AE Agent platform resource management CLI for listing Agents, creating and updating automations, adding/removing/listing/toggling custom models, MCP servers, Skills, uploading sandbox files to the attachment library, browsing the MCP/Skill market, setting market category/icon, copying system/company Skills to personal, and submitting/approving/sharing Skills. Use when the user asks to manage Agent platform resources, browse the market, or create scheduled Agent automations. Must use ae-cli agent commands."
---

# ae-agent

AE CLI (`ae-cli`) agent platform resource commands are invoked through:

```bash
ae-cli agent +<command> [options]
```

## Global Rules

- Use this skill for Agent platform resource management: Agents, automations, models, MCP servers, Skills, attachments, the MCP/Skill market, and Skill copy/approval/share flows.
- Read operations can run directly. Write operations require explicit user intent and normally keep the confirmation prompt unless `--yes` is passed.
- Prefer `--dry-run` before destructive writes.
- Only personal scope resources can be created or deleted; company/system resources are read-only in the CLI (exception: root users can approve/reject submissions and set company-scope meta).
- Toggle operations on company/system resources only affect the current user's preference, not the global state.
- JSON flags must be valid JSON strings, usually wrapped in single quotes in shell.
- Successful commands return JSON by default. Use `--format table` when a table is easier to scan.
- `--host <url>` overrides the active AE host. It is available on every command and may be placed after the subcommand, e.g. `ae-cli agent +<command> --host <url>`.

## Commands

### Agents

| Command        | Risk | Purpose                                                        |
| -------------- | ---: | -------------------------------------------------------------- |
| `+list-agents` | read | List Agents visible to current user (personal/company/system). |

### Automations

| Command              |  Risk | Purpose                                |
| -------------------- | ----: | -------------------------------------- |
| `+create-automation` | write | Create an Agent automation task. |

### Models

| Command         |  Risk | Purpose                                                        |
| --------------- | ----: | -------------------------------------------------------------- |
| `+list-models`  |  read | List models visible to current user (personal/company/system). |
| `+add-model`    | write | Add a custom model (personal scope).                           |
| `+del-model`    | write | Delete a personal model.                                       |
| `+toggle-model` | write | Enable or disable a model.                                     |

### MCP Servers

| Command       |  Risk | Purpose                                   |
| ------------- | ----: | ----------------------------------------- |
| `+list-mcps`  |  read | List MCP servers visible to current user. |
| `+add-mcp`    | write | Add an MCP server (personal scope).       |
| `+del-mcp`    | write | Delete a personal MCP server.             |
| `+toggle-mcp` | write | Enable or disable an MCP server.          |

### Skills

| Command         |  Risk | Purpose                                    |
| --------------- | ----: | ------------------------------------------ |
| `+list-skills`  |  read | List Skills visible to current user.       |
| `+add-skill`    | write | Create a custom Skill (personal scope).    |
| `+del-skill`    | write | Delete a personal Skill (physical delete). |
| `+toggle-skill` | write | Enable or disable a Skill.                 |

### Market (browse)

| Command              | Risk | Purpose                                                                  |
| -------------------- | ----: | ------------------------------------------------------------------------ |
| `+list-mcp-market`   | read | List MCP servers from the market (filter by scope/category/search/sort). |
| `+list-skill-market` | read | List Skills from the market (only approved; same filters).              |

### Category & Icon (meta)

| Command           |  Risk | Purpose                                                                       |
| ----------------- | ----: | ----------------------------------------------------------------------------- |
| `+set-mcp-meta`   | write | Update an MCP server market category/icon. Company requires root; system RO. |
| `+set-skill-meta` | write | Update a Skill market category/icon. Company requires root; system RO.       |

### Copy to personal

| Command       |  Risk | Purpose                                                                |
| ------------- | ----: | ---------------------------------------------------------------------- |
| `+copy-skill` | write | Copy a system/company Skill to a personal copy (independent duplicate). |

### Skill Approval (company-scope publish)

| Command                    |  Risk | Purpose                                                            |
| -------------------------- | ----: | ------------------------------------------------------------------ |
| `+submit-skill`            | write | Submit a personal Skill for company-scope review.                  |
| `+list-skill-submissions`  |  read | List submissions (root sees all; others see only their own).       |
| `+cancel-skill-submission` | write | Cancel a pending submission (submitter or root).                   |
| `+approve-skill`           | write | Approve a submission (root only). Creates a company-scope copy.    |
| `+reject-skill`            | write | Reject a submission with a reason (root only).                     |

### Skill Share (peer-to-peer)

| Command               |  Risk | Purpose                                                           |
| --------------------- | ----: | ----------------------------------------------------------------- |
| `+share-skill`        | write | Share a personal Skill to a same-company user.                    |
| `+list-skill-shares`  |  read | List Skill shares (received by default; `--direction sent`).     |
| `+accept-skill-share` | write | Accept a received share (creates a personal copy for recipient).  |
| `+reject-skill-share` | write | Reject a received share.                                          |

### Attachments

| Command             |  Risk | Purpose                                       |
| ------------------- | ----: | --------------------------------------------- |
| `+list-attachments` |  read | List user attachments (paginated).            |
| `+add-attachment`   | write | Upload sandbox file(s) to attachment library. |
| `+del-attachment`   | write | Soft-delete an attachment.                    |

## Usage Examples

### List all visible models

```bash
ae-cli agent +list-models
ae-cli agent +list-models --scope personal --format table
```

### List all visible Agents

```bash
ae-cli agent +list-agents
ae-cli agent +list-agents --scope personal --q "daily"
```

### Create an enabled daily automation

```bash
ae-cli agent +create-automation \
  --name "Daily AI Brief" \
  --schedule-kind daily \
  --time 09:00 \
  --message "Summarize yesterday's AI news" \
  --yes

# Create but keep paused when the user explicitly asks not to enable it.
ae-cli agent +create-automation \
  --name "Daily AI Brief" \
  --schedule-kind daily \
  --time 09:00 \
  --message "Summarize yesterday's AI news" \
  --enabled false \
  --yes
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

### Add an MCP with a market category and icon

```bash
ae-cli agent +add-mcp \
  --name my-mcp \
  --url "https://mcp.example.com/mcp" \
  --transport http \
  --headers '{"Authorization":"Bearer token"}' \
  --category dev_tool \
  --icon-emoji robot
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

### Browse the market

```bash
ae-cli agent +list-mcp-market --scope company --category dev_tool --sort calls
ae-cli agent +list-skill-market --search "code review" --sort newest --format table
```

### Set market category / icon

```bash
ae-cli agent +set-mcp-meta --id <mcp-cuid> --category dev_tool --icon-emoji robot
ae-cli agent +set-skill-meta --id <skill-cuid> --category data_query
```

### Copy a system/company Skill to personal

```bash
ae-cli agent +copy-skill --id <skill-cuid>
ae-cli agent +copy-skill --id <skill-cuid> --category dev_tool --icon-emoji robot
```

### Submit a Skill for company approval

```bash
ae-cli agent +submit-skill --id <skill-cuid> --description "Code reviewer for the team"
```

### Review approvals (root)

```bash
ae-cli agent +list-skill-submissions --status pending
ae-cli agent +approve-skill --id <submission-cuid>
ae-cli agent +reject-skill --id <submission-cuid> --reason "Needs more detail"
```

### Share a Skill peer-to-peer

```bash
ae-cli agent +share-skill --id <skill-cuid> --to-user-id <user-id>
ae-cli agent +list-skill-shares --direction received --status pending
ae-cli agent +accept-skill-share --id <share-cuid>
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
- Automations are enabled by default; pass `--enabled false` only when the user explicitly asks to create or update the task without enabling it. Use `+list-automations` to find the target ID internally, but do not show automation IDs, raw JSON, or concrete detail paths in user-facing replies.
- MCP creation does NOT validate server connectivity — an unreachable URL is accepted at create time and only fails when the agent actually calls the MCP at runtime. Double-check the URL.
- Attachment upload supports files up to 50MB each, with a 1GB user quota.
- Batch attachment uploads support partial success — individual file failures don't affect others.
- Skill `--instructions @-` reads from stdin, useful for piping long instruction text.
- Market category keys: `ae_preset | dev_tool | search_tool | data_query | content_gen | enterprise | life | automation | other`. Sort options: `newest | calls | likes` (`calls` sorts MCP by call count, Skill by download count). Market scope: `all | system | company | custom` (`custom` = personal).
- `+add-mcp` / `+add-skill` accept optional `--category / --icon-emoji / --icon-color`; these are applied via a follow-up meta PATCH after creation. MCP creation still does NOT validate server connectivity.
- `+copy-skill` copies a system/company Skill to an independent personal copy. Optional `--category / --icon-emoji / --icon-color` override the copy's market meta; omit them to inherit the source's. MCP has no copy (use `+toggle-mcp` to enable a system/company MCP per-user).
- Approval and share flows are Skill-only; MCP has no approval or share. `+approve-skill` / `+reject-skill` require root.
- `--id` semantics differ by command: `+submit-skill` / `+share-skill` / `+copy-skill` take a Skill ID; `+cancel-skill-submission` / `+approve-skill` / `+reject-skill` take a submission ID; `+accept-skill-share` / `+reject-skill-share` take a share ID.
