# agent +find-archived-conversations (Find Archived Conversations)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Conversations / read**

## Use Cases

- Find conversations the current user previously archived.
- Search the current AgentSpace when `--workspace-id`, `TE_AGENT_CURRENT_AGENT_SPACE_ID`, or a conversation target is available.
- Preserve legacy one-Agent and explicit all-Agent search outside an AgentSpace scope.
- Search a specific Agent from a regular terminal, or explicitly search all Agents.
- Discover a real `conversation_id` before `+restore-conversation`.

## Mandatory Rules (MUST)

- Target precedence is explicit `--workspace-id`, current AgentSpace environment or canonical runtime directory, explicit `--conversation-id`, then legacy Agent/all scope. A legacy conversation environment variable alone does not opt into AgentSpace routing.
- Never silently search every Agent. Outside an AgentSpace or Agent sandbox, provide `--agent-id` or `--all true`.
- `--all false` does not authorize an all-Agent search.
- `--agent-id` and `--all true` are mutually exclusive.
- Inside an Agent sandbox, the default Agent is read from `TE_AGENT_CURRENT_AGENT_ID`.
- Do not guess conversation IDs. Use the `conversation_id` returned by this command.
- The command only finds archived conversations. It does not archive active conversations.

## Command

```bash
# Current AgentSpace inside an AgentSpace runtime
ae-cli agent +find-archived-conversations

# Explicit AgentSpace
ae-cli agent +find-archived-conversations --workspace-id <agent-space-id> --q "quarterly review"

# Specific Agent from any terminal
ae-cli agent +find-archived-conversations --agent-id <agent-id> --q "quarterly review" --time-zone Asia/Shanghai

# Display local timestamps in another time zone
ae-cli agent +find-archived-conversations --agent-id <agent-id> --time-zone America/Los_Angeles

# Explicit all-Agent search
ae-cli agent +find-archived-conversations --all true --limit 100 --format table

# Inspect the request without calling the API
ae-cli agent +find-archived-conversations --agent-id <agent-id> --dry-run
```

## Parameters

| Parameter     | Required    | Description                                                        |
| ------------- | ----------- | ------------------------------------------------------------------ |
| `--workspace-id` | No | AgentSpace ID; defaults to `TE_AGENT_CURRENT_AGENT_SPACE_ID` |
| `--conversation-id` | No | Conversation used to resolve its owning AgentSpace |
| `--q`         | No          | Keyword matched against conversation titles and message previews   |
| `--agent-id`  | Conditional | Agent ID; required outside a sandbox unless `--all true` is used   |
| `--all`       | Conditional | Must be explicitly `true` to search every Agent                    |
| `--limit`     | No          | Maximum results, integer 1–100; default 20                         |
| `--time-zone` | No          | IANA time zone for local timestamp fields; default `Asia/Shanghai` |

## Output

- `items[].conversation_id`: stable ID accepted by `+restore-conversation`.
- `items[].title`, `last_preview`: conversation summary.
- `items[].archived_at`, `updated_at`: original UTC ISO timestamps for stable machine processing.
- `items[].archived_at_local`, `updated_at_local`: timestamps converted to `items[].time_zone` in `YYYY-MM-DD HH:mm:ss` format.
- `items[].time_zone`: IANA time zone used for the local timestamp fields.
- `items[].agent`: originating Agent summary when available.
- `has_more`: `true` when additional matches exist beyond the requested limit.

When presenting results to a user, prefer `archived_at_local` and `updated_at_local`. Pass the user's IANA time zone through `--time-zone` when known; otherwise use the default `Asia/Shanghai`.

## Next Steps on Failure

- Scope error: add `--workspace-id <agent-space-id>`, `--conversation-id <conversation-id>`, `--agent-id <agent-id>`, or explicitly use `--all true`.
- Time zone error: provide a valid IANA name such as `Asia/Shanghai` or `America/Los_Angeles`.
- Empty result: try another keyword or an explicit all-Agent search.
- Auth error: run `ae-cli auth login`, or verify that the command is running inside the expected Agent sandbox.

## Recommended Chaining

- `+find-archived-conversations` → choose a real `conversation_id` → `+restore-conversation`

## Transition Metadata

- Transition status: transitional
- Owning module: te-claude conversation archive
- Current transport: CLI-token Workspace REST API for AgentSpace scope; te-claude sandbox REST API for legacy Agent/all scope
- Gateway target: `agent.conversation.find_archived`
- Review after: 2026-10-23
- Exit condition: Migrate to the Gateway when the equivalent capability has stable metadata and output, or remove this command if L3 discovery provides the same typed scope and output guarantees.
