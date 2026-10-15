# Workspace command reference

## Context and profile

| Command | Risk | Required input | Result boundary |
|---|---:|---|---|
| `list` | read | none | Accessible AgentSpaces and stable IDs. |
| `get` | read | workspace or conversation target | Resolved profile and access. |
| `current` | read | workspace or conversation target | Server-verified target, role, and capabilities. |
| `create` | write | `--name`; optional description | Creates only a personal AgentSpace. |
| `update` | write | target, `--name` | Updates profile only. |
| `delete` | high-risk-write | target | Soft-deletes an AgentSpace. |
| `recover` | write | target | Requests runtime recovery for an active but unavailable AgentSpace; it does not undo archival or deletion. |
| `activity list` | read | target | Recent workspace activity, up to 20 items. |

## Files

| Command | Risk | Required input |
|---|---:|---|
| `asset list` | read | target; optional folder `--path` |
| `asset read` | read | target, text file `--path` |
| `asset upload` | write | target, local `--file`; optional destination `--path` |
| `asset download` | read | target, remote `--path`, local `--output` |
| `asset mkdir` | write | target, `--name`; optional parent `--path` |
| `asset move` | write | target, `--path`, `--destination` |
| `asset delete` | high-risk-write | target, `--path` |

Uploads are capped at 50 MB. Downloads preserve raw bytes and refuse to replace an existing local file unless `--overwrite true` is explicit.

## Capabilities

`capability list` returns the current revision and available selections. `capability set` replaces exactly one type: `agent`, `mcp`, `skill`, or `knowledge_base`.

```bash
ae-cli workspace capability list --workspace-id <agent-space-id>
ae-cli workspace capability set --workspace-id <agent-space-id> --version <revision> --capability-type skill --selected-ids '["<skill-id>"]'
```

`--selected-ids '[]'` clears that type. When changing Agent capabilities, pass `--default-agent-id` only when the selected default is valid in the new set. A version conflict means the settings changed; list again and reassess.

## Shared-space members

| Command | Risk | Required input |
|---|---:|---|
| `member list` | read | target; optional `--candidate-query` |
| `member add` | high-risk-write | target, `--user-id`, `--role ADMIN|MEMBER` |
| `member update` | high-risk-write | target, `--user-id`, `--role ADMIN|MEMBER` |
| `member transfer-owner` | high-risk-write | target, new owner `--user-id` |
| `member remove` | high-risk-write | target, `--user-id` |

Discover users through `member list --candidate-query` and use returned IDs. Ownership transfer is a distinct command so it cannot be confused with an ordinary role update.
