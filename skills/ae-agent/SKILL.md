---
name: ae-agent
version: 1.2.0
description: "AE Agent platform resource management CLI for listing Agents, creating and updating automations, adding/removing/listing/toggling custom models, MCP servers, Skills, uploading sandbox files to the attachment library, browsing the MCP/Skill market, setting market category/icon, copying system/company Skills to personal, and submitting/approving/sharing Skills. Use when the user asks to manage Agent platform resources, browse the market, or create scheduled Agent automations. Must use ae-cli agent commands."
---

# ae-agent

> **CRITICAL — Before running any `+<command>` command, you MUST first read the corresponding `references/<command>.md`.** The reference filename equals the command name without the leading `+`, for example `+add-mcp` → `references/add-mcp.md`.
> **CRITICAL — Never guess record IDs (Agent / automation / model / MCP / Skill / submission / share / attachment).** Always use the appropriate `+list-*` command to discover real IDs first.
> **CRITICAL — All Agent platform resources are served under the `/api/sandbox/agent/*` path.** Do not reference legacy paths.

AE CLI (`ae-cli`) agent platform resource commands are invoked through:

```bash
ae-cli agent +<command> [options]
```

All commands live under the `agent` service. Quick help:

```bash
ae-cli agent --help
ae-cli agent +list-agents --help
ae-cli agent +create-automation --help
```

## Global AE CLI Rules

- Use this skill for Agent platform resource management: Agents, automations, models, MCP servers, Skills, attachments, the MCP/Skill market, and Skill copy/approval/share flows.
- **Read operations** (`+list-*`) can run directly once required IDs are known.
- **Write operations** require explicit user intent and keep the confirmation prompt by default. Pass `--yes` only in fully automated pipelines.
- Prefer `--dry-run` before destructive writes to inspect the request shape without executing.
- Personal and company scope resources can be created/updated/deleted; company scope requires root/agent_admin role; system resources are read-only (exception: root users can approve/reject submissions and set company-scope meta).
- Toggle operations on company/system resources only affect the current user's preference, not the global state.
- Never invent record IDs. Discover them with `+list-*` commands or accept them from the user.
- JSON flags must be valid JSON strings, usually wrapped in single quotes in shell.

### Global Parameters

| Parameter | Description |
|---|---|
| `--format <json\|table>` | Output format. Default is JSON. |
| `--host <url>` | Override the active AE host. Available on every command and may be placed after the subcommand, e.g. `ae-cli agent +<command> --host <url>`. |
| `--yes` | Skip confirmation for write operations. |
| `--dry-run` | Show request details (method + URL + body) without executing. |

### Output and Errors

- Successful commands return machine-readable JSON by default. Use `--format table` when a table is easier to scan.
- Failed commands return `{ "ok": false, "error": { "type": "...", "message": "...", "hint": "..." } }` and exit non-zero.

## When to Use

Use `ae-agent` for all Agent platform resource work:

- **Agents & automations**: list Agents, create / list / update scheduled Agent automations.
- **Models**: list, add, delete, toggle custom models.
- **MCP servers**: list, add, delete, toggle MCP servers; browse the MCP market; set market meta.
- **Skills**: list, add, delete, toggle Skills; browse the Skill market; set market meta; copy system/company Skills to personal; submit/approve/reject company-scope Skills; share/accept/reject peer-to-peer Skills.
- **Attachments**: list, upload, soft-delete sandbox files in the attachment library.

If the user's intent is data analysis, audience management, metadata governance, TeamRuns, or knowledge bases, switch to `ae-analysis` / `ae-engage` / `ae-dataops` / `ae-team` / `ae-kb`.

## Tool Groups (66 commands)

### Agents (5)

- `+list-agents` ([doc](references/list-agents.md)) — list Agents visible to current user (personal/company/system)
- `+create-agent` ([doc](references/create-agent.md)) — create a new Agent (personal/company scope; company requires root/agent_admin; name/description/instructions/model/mcp-ids/skill-ids)
- `+update-agent` ([doc](references/update-agent.md)) — update an Agent's name/description/instructions/model/mcp-ids/skill-ids/enabled
- `+del-agent` ([doc](references/del-agent.md)) — soft-delete a personal/company Agent (company requires root/agent_admin; system Agents cannot be deleted)
- `+get-agent` ([doc](references/get-agent.md)) — get a single Agent's detail

### Automations (3)

- `+list-automations` ([doc](references/list-automations.md)) — list current user's Agent automation tasks
- `+create-automation` ([doc](references/create-automation.md)) — create an Agent automation task (hourly/daily/weekly/monthly or cron)
- `+update-automation` ([doc](references/update-automation.md)) — update an automation's name, instruction, schedule, or enabled state

### Models (6)

- `+list-models` ([doc](references/list-models.md)) — list models visible to current user (personal/company/system)
- `+add-model` ([doc](references/add-model.md)) — add a custom model (personal/company scope; company requires root/agent_admin)
- `+update-model` ([doc](references/update-model.md)) — update a custom model (personal/company scope; company requires root/agent_admin; apiKey left blank to keep existing)
- `+del-model` ([doc](references/del-model.md)) — delete a personal/company model (company requires root/agent_admin)
- `+toggle-model` ([doc](references/toggle-model.md)) — enable or disable a model
- `+test-model` ([doc](references/test-model.md)) — test custom model connectivity (LLM only)

### MCP Servers (14)

- `+list-mcps` ([doc](references/list-mcps.md)) — list MCP servers visible to current user
- `+add-mcp` ([doc](references/add-mcp.md)) — add an MCP server (personal/company scope; company requires root/agent_admin)
- `+update-mcp` ([doc](references/update-mcp.md)) — update an MCP server's config (url/transport/headers/auth-mode; connectivity validated)
- `+del-mcp` ([doc](references/del-mcp.md)) — delete a personal MCP server
- `+toggle-mcp` ([doc](references/toggle-mcp.md)) — enable or disable an MCP server
- `+mcp-tools` ([doc](references/mcp-tools.md)) — list tools provided by an MCP server (OAuth auto-refresh)
- `+mcp-auth-start` ([doc](references/mcp-auth-start.md)) — start OAuth authorization (cliMode; print authorizeUrl, then poll with +mcp-auth-status)
- `+mcp-auth-status` ([doc](references/mcp-auth-status.md)) — query OAuth status (not_required/needs_auth/authenticated/reauth_required/disabled)
- `+mcp-auth-disconnect` ([doc](references/mcp-auth-disconnect.md)) — disconnect OAuth, clear token and disable
- `+list-mcp-credentials` ([doc](references/list-mcp-credentials.md)) — list per-user credentials for system MCPs
- `+set-mcp-credential` ([doc](references/set-mcp-credential.md)) — upsert a per-user MCP credential (oauth/apikey)
- `+auto-provision-mcp-credentials` ([doc](references/auto-provision-mcp-credentials.md)) — auto-inject credentials for all system MCPs (uses session token by default)
- `+mcp-token` ([doc](references/mcp-token.md)) — get the shared MCP token (useMcpToken=true; plaintext, mind shell history)
- `+mcp-stats` ([doc](references/mcp-stats.md)) — MCP call stats for recent N days (`--days` 1-365 default 30; by server / by day)

### Skills (4)

- `+list-skills` ([doc](references/list-skills.md)) — list Skills visible to current user
- `+add-skill` ([doc](references/add-skill.md)) — create a custom Skill (personal/company scope; company requires root/agent_admin)
- `+del-skill` ([doc](references/del-skill.md)) — delete a personal Skill (physical delete)
- `+toggle-skill` ([doc](references/toggle-skill.md)) — enable or disable a Skill

### Skill content & assets (16)

- `+edit-skill` ([doc](references/edit-skill.md)) — edit a Skill's content (name/description/instructions/category/icon)
- `+get-skill-content` ([doc](references/get-skill-content.md)) — read a Skill's SKILL.md source
- `+list-skill-assets` ([doc](references/list-skill-assets.md)) — list asset files of a Skill
- `+upload-skill-asset` ([doc](references/upload-skill-asset.md)) — upload an asset file (`isDangerousFile` checked; 1MB)
- `+read-skill-asset` ([doc](references/read-skill-asset.md)) — read an asset file (binary-safe with `--output`)
- `+del-skill-asset` ([doc](references/del-skill-asset.md)) — delete an asset file
- `+list-skill-references` ([doc](references/list-skill-references.md)) — list reference files (`.md` only)
- `+upload-skill-reference` ([doc](references/upload-skill-reference.md)) — upload a reference file (`.md` only; 1MB)
- `+read-skill-reference` ([doc](references/read-skill-reference.md)) — read a reference file
- `+del-skill-reference` ([doc](references/del-skill-reference.md)) — delete a reference file
- `+list-skill-scripts` ([doc](references/list-skill-scripts.md)) — list script files of a Skill
- `+upload-skill-script` ([doc](references/upload-skill-script.md)) — upload a script file (`isDangerousFile` checked; 1MB)
- `+read-skill-script` ([doc](references/read-skill-script.md)) — read a script file (binary-safe with `--output`)
- `+del-skill-script` ([doc](references/del-skill-script.md)) — delete a script file
- `+upload-skill` ([doc](references/upload-skill.md)) — create/replace a Skill from a ZIP package (parses SKILL.md; 5MB)
- `+rescan-skills` ([doc](references/rescan-skills.md)) — rescan local filesystem and sync Skills to DB (root only)

### Market (browse) (2)

- `+list-mcp-market` ([doc](references/list-mcp-market.md)) — list MCP servers from the market (filter by scope/category/search/sort)
- `+list-skill-market` ([doc](references/list-skill-market.md)) — list Skills from the market (only approved; same filters)

### Category & Icon (meta) (2)

- `+set-mcp-meta` ([doc](references/set-mcp-meta.md)) — update an MCP server market category/icon (company requires root; system RO)
- `+set-skill-meta` ([doc](references/set-skill-meta.md)) — update a Skill market category/icon (company requires root; system RO)

### Copy to personal (1)

- `+copy-skill` ([doc](references/copy-skill.md)) — copy a system/company Skill to a personal copy (independent duplicate)

### Skill Approval (company-scope publish) (5)

- `+submit-skill` ([doc](references/submit-skill.md)) — submit a personal Skill for company-scope review
- `+list-skill-submissions` ([doc](references/list-skill-submissions.md)) — list submissions (root sees all; others see only their own)
- `+cancel-skill-submission` ([doc](references/cancel-skill-submission.md)) — cancel a pending submission (submitter or root)
- `+approve-skill` ([doc](references/approve-skill.md)) — approve a submission (root only). Creates a company-scope copy
- `+reject-skill` ([doc](references/reject-skill.md)) — reject a submission with a reason (root only)

### Skill Share (peer-to-peer) (4)

- `+share-skill` ([doc](references/share-skill.md)) — share a personal Skill to a same-company user
- `+list-skill-shares` ([doc](references/list-skill-shares.md)) — list Skill shares (received by default; `--direction sent`)
- `+accept-skill-share` ([doc](references/accept-skill-share.md)) — accept a received share (creates a personal copy for recipient)
- `+reject-skill-share` ([doc](references/reject-skill-share.md)) — reject a received share

### Attachments (4)

- `+list-attachments` ([doc](references/list-attachments.md)) — list user attachments (paginated)
- `+add-attachment` ([doc](references/add-attachment.md)) — upload sandbox file(s) to attachment library
- `+del-attachment` ([doc](references/del-attachment.md)) — soft-delete an attachment
- `+attachment-stats` ([doc](references/attachment-stats.md)) — attachment library stats (total count/size, image/document breakdown)

## Cross-Command Notes

- **Automation IDs**: use `+list-automations` to find the target ID internally, but do not surface raw automation IDs, raw JSON, or concrete detail paths in user-facing replies.
- **MCP connectivity**: `+add-mcp` does NOT validate server connectivity — an unreachable URL is accepted at create time and only fails when the agent calls the MCP at runtime. Double-check the URL.
- **Attachments**: upload supports files up to 50MB each, with a 1GB user quota. Batch uploads support partial success — individual file failures don't affect others.
- **Skill `--instructions @-`**: reads from stdin, useful for piping long instruction text.
- **Market category keys**: `ae_preset | dev_tool | search_tool | data_query | content_gen | enterprise | life | automation | other`. Sort options: `newest | calls | likes` (`calls` sorts MCP by call count, Skill by download count). Market scope: `all | system | company | custom` (`custom` = personal).
- **Meta on create/copy**: `+add-mcp` / `+add-skill` / `+copy-skill` accept optional `--category / --icon-emoji / --icon-color`; these are applied via a follow-up meta PATCH after creation. MCP creation still does NOT validate server connectivity.
- **Copy vs toggle**: `+copy-skill` copies a system/company Skill to an independent personal copy. MCP has no copy (use `+toggle-mcp` to enable a system/company MCP per-user).
- **Approval & share are Skill-only**: MCP has no approval or share flow. `+approve-skill` / `+reject-skill` require root.
- **`--id` semantics differ by command**: `+submit-skill` / `+share-skill` / `+copy-skill` take a Skill ID; `+cancel-skill-submission` / `+approve-skill` / `+reject-skill` take a submission ID; `+accept-skill-share` / `+reject-skill-share` take a share ID.

## Typical Workflows

### Create a scheduled automation

```bash
# 1. Discover available Agents
ae-cli agent +list-agents

# 2. Create an enabled daily automation
ae-cli agent +create-automation \
  --name "Daily AI Brief" \
  --schedule-kind daily \
  --time 09:00 \
  --message "Summarize yesterday's AI news" \
  --agent-id <agent-id> \
  --yes

# 3. (Optional) Pause or edit later
ae-cli agent +list-automations --status active
ae-cli agent +update-automation --id <automation-id> --enabled false --yes
```

### Add an MCP server with market meta

```bash
ae-cli agent +add-mcp \
  --name my-mcp \
  --url "https://mcp.example.com/mcp" \
  --transport http \
  --headers '{"Authorization":"Bearer token"}' \
  --category dev_tool \
  --icon-emoji robot \
  --yes
```

### Publish a personal Skill to the company (root review)

```bash
# 1. Create a Skill
ae-cli agent +add-skill --name code-reviewer --description "Reviews code" --instructions "You are a code reviewer..."

# 2. Submit for company review
ae-cli agent +submit-skill --id <skill-cuid> --description "Code reviewer for the team"

# 3. Root reviews and approves
ae-cli agent +list-skill-submissions --status pending
ae-cli agent +approve-skill --id <submission-cuid> --yes
```

### Share a Skill peer-to-peer

```bash
ae-cli agent +share-skill --id <skill-cuid> --to-user-id <user-id> --yes
# Recipient accepts:
ae-cli agent +list-skill-shares --direction received --status pending
ae-cli agent +accept-skill-share --id <share-cuid> --yes
```

## Quick Verification

```bash
ae-cli agent --help
```
