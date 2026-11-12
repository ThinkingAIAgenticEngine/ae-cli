# Invoke AE Agents through A2A

Use these commands when a user asks an external coding Agent to delegate work to an AE Agent through an A2A link. The caller must be able to execute ae-cli. The target must be an AE Agent, and its server must support CLI-token Bearer authentication.

The CLI loads the current user's host-scoped CLI credential internally. Never read credential files, print tokens, ask the user to paste a TE token, or construct authenticated curl commands. If authentication is missing, direct the user to `ae-cli auth login --host <AE-host>`.

HTTP 401 clears only the selected host's process-local token cache, rereads its credential, and retries once within the same 30-second timeout. The retry preserves the message and JSON-RPC IDs. HTTP 403 is never retried. Stored credentials are not deleted or minted by this recovery; if authorization still fails, log in again for the selected host.

## Workflow

1. Select the authorized AE host. A link alone never authorizes sending credentials to another deployment. For another deployment, use its explicit `--host` and log in there first. The target URL must be inside that host's configured application path (default `/agent`). Redirects are rejected. Card-advertised interface URLs are not followed.
2. Read the Card to check the target's capabilities.
3. Submit the user's task. This is a write operation: the remote Agent can execute tools on the user's behalf. Use a stable `--message-id` if a submission might need to be retried.
4. Read the returned `task.id` and query it until the task reaches a terminal state. Space polls several seconds apart. Preserve and report the task ID if the task is still running when stopping. Never resubmit a task just because it is still running.
5. Summarize the returned artifacts/history. `TASK_STATE_COMPLETED` succeeds; `TASK_STATE_FAILED`, `TASK_STATE_CANCELED`, and `TASK_STATE_REJECTED` are terminal failures. For `TASK_STATE_INPUT_REQUIRED`, ask for the required input and send it with the returned `contextId` and task ID. For `TASK_STATE_AUTH_REQUIRED`, report the requested authorization; do not keep polling blindly.

```bash
ae-cli agent a2a +card --host https://ae.example.com \
  --url https://ae.example.com/agent/api/a2a/agents/AGENT_ID/agent-card.json

ae-cli agent a2a +send --host https://ae.example.com \
  --url https://ae.example.com/agent/api/a2a/agents/AGENT_ID/agent-card.json \
  --message 'Summarize the requested data' --message-id REQUEST_UUID

ae-cli agent a2a +get --host https://ae.example.com \
  --url https://ae.example.com/agent/api/a2a/agents/AGENT_ID/agent-card.json \
  --id TASK_ID
```

The default Agent discovery link is `/agent/.well-known/agent-card.json` under the selected application path. `+card` reads that exact URL; `+send` and `+get` map it to `/agent/api/a2a/agents/system-default-agent`. Explicit Agent Card and RPC links remain supported with the same behavior. Custom deployment paths are preserved. Discovery never follows Card-advertised URLs.

```bash
ae-cli agent a2a +card --host https://ae.example.com \
  --url https://ae.example.com/agent/.well-known/agent-card.json
```

Transition status: transitional
Owning module: te-claude A2A
Current transport: A2A 1.0 JSON-RPC with CLI-token Bearer authentication
Gateway target: TBD
Review after: 2026-12-01
Exit condition: equivalent Gateway capabilities exist; retain typed invocation and host-scoping value when migrating.

## Commands

| Command | Risk | Required flags | Optional flags |
| --- | --- | --- | --- |
| `agent a2a +card` | read | `--url` | `--host` |
| `agent a2a +send` | write | `--url`, `--message` | `--host`, `--message-id`, `--context-id`, `--task-id`, `--space-id`, `--model`, `--history-length` |
| `agent a2a +get` | read | `--url`, `--id` | `--host`, `--history-length` |
| `agent a2a list` | read | `--url` | `--context-id`, `--status`, `--page-size`, `--page-token`, `--history-length`, `--status-timestamp-after`, `--include-artifacts` |
| `agent a2a cancel` | high-risk-write | `--url`, `--id` | `--yes` |
| `agent a2a delete-context` | high-risk-write | `--url`, `--context-id` | `--yes` |

Card and JSON-RPC endpoint URLs are accepted. All commands support global `--dry-run`, which previews the request without loading credentials or making an A2A request. `+send` uses `configuration.returnImmediately: true`; `+get` uses the JSON-RPC `GetTask` method. Results retain the server's A2A shape inside the normal CLI output envelope. No streaming or third-party authentication is provided.

The source contract is the AE server's `src/lib/a2a/protocol.ts`, `http.ts`, and `service.ts`: `A2A-Version: 1.0`, `Authorization: Bearer <CLI token>`, JSON-RPC 2.0 `SendMessage` / `GetTask`, and `/api/a2a/agents/<id>/agent-card.json` under the configured application path.

## Workspace and model selection

Read `capabilities.extensions` in `+card` first. The extension URI
`https://thinkingdata.cn/a2a/extensions/agent-evaluation/v1` advertises
`params.spaceSelection.spaces` and `params.modelSelection.models`. Use exact
IDs from these lists, not display names. Model switching must be advertised;
a fixed Agent only accepts its configured model. Space IDs contain 1–191
letters, digits, underscores or hyphens.

```bash
ae-cli agent a2a +send --host https://ae.example.com \
  --url https://ae.example.com/agent/.well-known/agent-card.json \
  --message 'Summarize the requested data' --space-id SPACE_ID --model MODEL_ID \
  --message-id REQUEST_UUID --history-length 0 --dry-run
```

`--space-id` maps to `message.metadata[extensionURI].agentSpaceId` and
`--model` to `.model`. The CLI sends both `message.extensions` and the
`A2A-Extensions` request header. Without these flags the old payload and headers
remain unchanged. No evaluation source is fabricated. Space/model authorization
is enforced by the server. For continuations using `--context-id` or `--task-id`, omit `--space-id` or
repeat the original workspace ID. The server checks that a supplied workspace
matches the existing conversation and rejects changes. Replies with `--task-id`
cannot select a model. Keep selections unchanged when retrying a
message ID. An older server may reject these optional extensions; omit the
selection flags to retain the previous invocation contract.

`--history-length` is a non-negative integer; zero suppresses history and the
server caps returned history at 100. `list` uses `ListTasks`, returns one page,
and preserves `nextPageToken`; reuse the same filters on subsequent pages.
`--page-size` is 1–100. `--status` uses the exact `TASK_STATE_*` enum from the
protocol. `--include-artifacts false` explicitly excludes artifacts.

`cancel` sends `CancelTask`. `delete-context` sends `DeleteContext` with the
context-lifecycle extension header; inspect the Card for support first.
Both require high-risk confirmation, or `--yes` after explicit user approval.

## Server capability coverage

The current server also offers `SendStreamingMessage`, `SubscribeToTask`,
registered attachment transfer and signed inter-Agent delegation. These require
SSE/file/proof lifecycles and are not exposed by these JSON commands. Continue
using `+send` and `+get` for asynchronous text tasks. Push notifications and
extended Agent Cards are explicitly unsupported by the server. Do not invent
metadata or credentials to simulate any of these capabilities.
