# AgentSpace Workspace CLI Contract

Status: implemented across the paired ae-cli and te-claude changes; both must be deployed before non-dry-run Workspace commands can run end to end.

## Scope

`workspace` means the product AgentSpace boundary. It does not mean the legacy local/sandbox file-sync target used by the top-level `sync` and `model` commands.

This contract covers:

- AgentSpace discovery, target resolution, profile, and lifecycle.
- AgentSpace assets.
- Agent, MCP, Skill, and knowledge-base capability bindings.
- Shared AgentSpace membership and activity.
- AgentSpace-scoped archived conversations.

Memory uses the already implemented `/api/cli/memory/v2` contract. Automation uses `/api/cli/automation/v1` with `agentSpaceId`.

## Authentication and Envelope

- Base path: `/api/cli/workspace/v1`.
- Authentication: the existing dedicated AE CLI token only. Do not reuse browser session cookies or add another credential.
- Success envelope: `{ "ok": true, "data": ... }`.
- Error envelope: `{ "ok": false, "error": { "type": "auth|permission|validation|not_found|api", "code": "...", "message": "...", "details": ... } }` with optional `details` and an appropriate non-2xx HTTP status.
- CLI error messages are English. The server translates domain errors by stable code at the Workspace CLI boundary; shared Web/domain messages and business data retain their original language.
- Local input failures use `validation`. The CLI preserves recognized server error types, codes, hints, and optional details. HTTP 401/403 take precedence as `auth`/`permission`; without a recognized type, 400/413/422 map to `validation`, 404 to `not_found`, and other statuses to `api`.
- For JSON API responses, an HTTP 200 `ok:false` envelope is still a failure. Malformed error envelopes fail with `WORKSPACE_INVALID_RESPONSE` without echoing their contents. Raw asset downloads retain their file bytes.
- Every response containing user or workspace data must use private no-store cache semantics.
- Authorization must be resolved server-side for every request. The CLI-supplied AgentSpace, role, or capability information is never trusted.

## Target Resolution

`GET /api/cli/workspace/v1/target` accepts `agentSpaceId`, `conversationId`, or both.

The CLI selects inputs in this order:

1. `--workspace-id`
2. `TE_AGENT_CURRENT_AGENT_SPACE_ID` or the canonical `/spaces/actived/<id>/.conversations/...` runtime directory
3. `--conversation-id`
4. `TE_AGENT_CONVERSATION_ID`

When both values are present, the server must verify that the conversation belongs to the AgentSpace and reject a mismatch. There is no implicit default-personal-space fallback.

The resolved response contains at least:

```json
{
  "agentSpaceId": "space-id",
  "spaceType": "personal",
  "role": "OWNER"
}
```

## Endpoint Matrix

| CLI command | Method and path |
|---|---|
| `workspace list` | `GET /agent-spaces` |
| `workspace get` | `GET /agent-spaces/:id` |
| `workspace current` | `GET /target` |
| `workspace create` | `POST /agent-spaces` |
| `workspace update` | `PATCH /agent-spaces/:id` |
| `workspace delete` | `DELETE /agent-spaces/:id` |
| `workspace recover` | `POST /agent-spaces/:id/recover` |
| `workspace asset list` | `GET /agent-spaces/:id/documents` |
| `workspace asset read` | `GET /agent-spaces/:id/documents/content` |
| `workspace asset upload` | `POST /agent-spaces/:id/documents/upload` |
| `workspace asset download` | `GET /agent-spaces/:id/documents/download` |
| `workspace asset mkdir` | `POST /agent-spaces/:id/documents/mkdir` |
| `workspace asset move` | `PATCH /agent-spaces/:id/documents` |
| `workspace asset delete` | `DELETE /agent-spaces/:id/documents` |
| `workspace capability list` | `GET /agent-spaces/:id/capabilities` |
| `workspace capability set` | `PUT /agent-spaces/:id/capabilities` |
| `workspace member list` | `GET /agent-spaces/:id/members` |
| `workspace member add` | `POST /agent-spaces/:id/members` |
| `workspace member update` | `PATCH /agent-spaces/:id/members/:userId` |
| `workspace member transfer-owner` | `PATCH /agent-spaces/:id/members/:userId` with role `OWNER` |
| `workspace member remove` | `DELETE /agent-spaces/:id/members/:userId` |
| `workspace activity list` | `GET /agent-spaces/:id/activities` |
| `agent +find-archived-conversations` | `GET /agent-spaces/:id/conversations/archived` |
| `agent +restore-conversation` | `POST /agent-spaces/:id/conversations/:conversationId/restore` |

All paths in the table are relative to `/api/cli/workspace/v1`.

## Write Semantics

- `workspace create` creates personal AgentSpaces only. Shared AgentSpace creation remains an administrator flow.
- `workspace recover` retries the unavailable runtime for an active AgentSpace. It does not undo archival or deletion.
- Capability updates require the non-negative `revision` returned by `workspace capability list`; stale revisions must return a conflict.
- Memory mutations require their resource `version`; this is separate from capability revision.
- Delete and membership or ownership changes are high-risk writes and use the CLI confirmation gate.
- Asset upload is limited to 50 MB. Download preserves response bytes and refuses to overwrite a local file unless `--overwrite true` is explicit.
- Writes include `operationSource: "ae_cli"` where the endpoint accepts an operation source.

## Compatibility Boundary

- The legacy `sync` and interactive `model` commands are blocked when AgentSpace context is detected. Their original behavior remains available outside AgentSpace context.
- Archived-conversation commands use the Workspace adapter when AgentSpace scope is available and retain the legacy Agent/all sandbox path otherwise.
- Workspace endpoints are transitional nongateway commands. Gateway target metadata is not yet available; review by 2026-12-01 and migrate when equivalent typed capabilities exist.

## Delivery Gate

The CLI portion is ready when build, Workspace tests, Memory tests, Agent command regression tests, release checks, and CLI self-check pass. End-to-end delivery additionally requires the te-claude adapter above plus integration tests using a personal and a shared AgentSpace with Owner/Admin/Member authorization cases.
