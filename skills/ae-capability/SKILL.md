---
name: ae-capability
version: 1.2.0
description: "AE/TE capability gateway discovery and generic invocation with ae-cli. Use when the user needs to list or search available capabilities, inspect an unknown capability schema/risk/auth contract, dry-run a capability, or invoke a long-tail capability that has no curated ae-cli command. Always discover and inspect before composing input; never guess capability IDs or input fields."
---

# ae-capability

Use this skill for progressive capability discovery and generic gateway invocation. Prefer a domain-specific curated command when one exists; use `ae-cli capability ...` for discovery and long-tail capabilities.

## Decision Order

1. Use a domain skill and its curated command when it directly covers the task.
2. Otherwise search the capability catalog.
3. Inspect the selected capability before constructing input.
4. Dry-run with real input when helpful.
5. Run after dry-run succeeds; obtain chat confirmation only for delete capabilities.

Never guess a capability ID, input field, enum value, resource ID, or project ID.

## Skill references

Default: **do not** create a standalone skill reference for every new capability. Use `search` → `inspect` → `dry-run` → `run`; catalog `description`, `risk`, and `inspect` `input_schema` are the contract.

Create or keep a standalone reference only when at least one applies: L2 hard bar, easily confused with neighbors, `high-risk-write` delete workflow, or multi-step orchestration. Domain skills may inline one-line summaries in overview matrices (e.g. `analysis_gateway_assets.md`). See [`capability-command-admission` §10](../../docs/capability-command-admission.md).

## Commands

```bash
# List summaries for one capability namespace.
ae-cli capability list --domain <domain>

# Search capability IDs and descriptions. All terms must match.
ae-cli capability search "<terms>" --domain <domain>

# Read input_schema, risk, auth, output, and dry-run support.
ae-cli capability inspect <capability-id>

# Validate and preview input without execution.
ae-cli capability dry-run <capability-id> --input '<json-object>'

# Execute after inspection (and dry-run when input is non-trivial).
ae-cli capability run <capability-id> --input '<json-object>'
```

`--input` accepts:

- An inline JSON object.
- A JSON file path.
- `@<path>`.
- `-` to read JSON from stdin.

The capability namespace is inferred from `<capability-id>` for `inspect`, `dry-run`, and `run`. Use `--domain <domain>` only to override routing.

## Risk Levels (aligned with lark-cli)

| `risk` | Meaning | Chat confirmation before `run`? | CLI `[y/N]` without `--yes`? |
| --- | --- | --- | --- |
| `read` | Query / list / inspect | No | No |
| `write` | Create, update, share, and other ordinary writes | No | No |
| `high-risk-write` | Delete or remove resources | **Yes** | **Yes** |

Legacy values such as `create`, `update`, or `delete` are normalized to this three-tier model (`delete` → `high-risk-write`; `create`/`update` → `write`).

## Safety

- `list`, `search`, `inspect`, and `dry-run` never execute business mutations.
- `capability run` inspects metadata before execution when `--yes` is absent.
- Only `high-risk-write` requires chat confirmation before `capability run ... --yes`.
- `read` and `write` may run directly after inspect/dry-run.
- Use `--yes` on delete runs only after the user explicitly authorizes execution in chat.
- Global `--dry-run` on `capability run` calls the gateway dry-run endpoint instead of execute.

## High-Risk Confirmation Workflow (Agent)

Applies only when `inspect` shows `risk=high-risk-write`.

User intent (for example "delete this space") is **not** execution authorization. Do not pass `--yes` just because the user stated the desired action.

1. Run `capability inspect` and `capability dry-run` with the final input.
2. **Stop in the same turn.** Do not call `capability run` in the same turn as dry-run.
3. Summarize in chat: capability ID, `project_id`, key input fields, and `risk=high-risk-write`.
4. Ask the user to confirm execution. Prefer `AskUserQuestion` when that tool is available; otherwise ask in plain text and wait for the user's **next message**.
5. Only after the user replies with explicit authorization (for example `confirm`, `execute`, or `yes`) run `capability run ... --yes` with the same input as dry-run.

For `risk=write`, run directly after a successful dry-run; no chat confirmation gate.

Never pass `--yes` on the first delete attempt. CLI terminal `[y/N]` prompts do not work in Agent Bash; chat confirmation is the real gate for `high-risk-write`.

## Output

- `list` returns `{ domain, count, capabilities }`.
- `search` returns `{ domain, query, count, capabilities }`.
- `inspect`, `dry-run`, and `run` return gateway data in the standard ae-cli envelope.

## Examples

```bash
ae-cli capability search "dashboard list" --domain analysis
ae-cli capability inspect analysis.dashboard.list
ae-cli capability dry-run analysis.dashboard.list --input '{"project_id":1}'
ae-cli capability run analysis.dashboard.list --input input.json
```
