# Resource package import and export

Use `ae-cli agent resource-package <action>` to move resource packages between environments. The service owns the package format, permissions, and task lifecycle; the CLI orchestrates the existing `/api/resource-packages/**` endpoints with the current host's CLI token. The source and target service application versions must match. A cluster-version mismatch is a warning and requires deliberate acceptance.

## Discover and export

Use actual resource IDs from the relevant Agent, Skill, MCP, Team, or knowledge-base list commands. A reference has `{ "type": "knowledge_base|mcp|skill|agent|team", "sourceId": "..." }`.

```bash
ae-cli agent resource-package export-preview --roots '[{"type":"skill","sourceId":"<id>"}]'
ae-cli agent resource-package export --scope personal --roots '[{"type":"skill","sourceId":"<id>"}]' --output ./resources.zip
ae-cli agent resource-package export --scope company --roots @roots.json --no-wait
ae-cli agent resource-package list --kind export --scope company
ae-cli agent resource-package show --task-id <task-id>
ae-cli agent resource-package download --task-id <task-id> --output ./resources.zip
```

`--roots` and `--excluded` accept inline JSON, `@file`, or `-` for stdin. Export defaults to waiting up to 1800 seconds and polling every 1500 ms. `--no-wait` returns the submitted task and cannot be combined with `--output`. `--request-key` is optional; reuse a key only for the exact same export. Download does not overwrite an existing output. Interrupted downloads retain `<output>.part` and `<output>.part.json`; rerunning the same command resumes only when the task, host, size, and ETag still match. The final file is verified against the task SHA-256.

## Import and preflight

```bash
ae-cli agent resource-package import --file ./resources.zip --scope personal
ae-cli agent resource-package import --file ./resources.zip --scope company --accept-warnings --confirmations '["COMPANY_SKILL_SCRIPTS"]'
ae-cli agent resource-package import --file ./resources.zip --scope company --upload-id <upload-id> --system-replacements @replacements.json --no-wait
```

The CLI uploads missing zero-based chunks and retains a private transfer record under `~/.ae-cli/transfers/resource-packages/` until an import task is confirmed. Use the same file, host, and scope to resume automatically, or specify `--upload-id`. Changes to the file prevent reuse. The CLI returns `review_required` with the upload ID, preflight snapshot, blockers, warnings, missing confirmations, and any prior successful duplicate when a decision is needed. Review this output before rerunning:

- Fix blockers in the target environment. For a resolvable system reference, pass `--system-replacements` as a JSON mapping of `referenceKey` to a candidate target ID. `__skip_resource__` is supported only where the service permits skipping a Team with an unresolved core system Agent.
- Pass `--accept-warnings` only after evaluating the current warnings. It does not override blockers.
- Pass `--confirmations '["COMPANY_SKILL_SCRIPTS"]'` when that code appears in `preflight.confirmations` and the user accepts the script risk.
- Pass `--allow-duplicate` only when the prior successful import is understood and another import is desired. It does not override a running duplicate blocker.

`--request-key` is optional and must be reused only with identical import parameters. If the service reports `PREFLIGHT_CHANGED`, inspect the fresh preflight and decide again. Company scope requires the service's company management permission. All task errors and item outcomes are visible with `show`.

## Task control

```bash
ae-cli agent resource-package cancel --task-id <task-id>
ae-cli agent resource-package retry --task-id <task-id> --no-wait
```

Cancellation is asynchronous and requires the high-risk write confirmation gate. Retry is available only when the service marks the task retryable. Use `show` to check terminal status; `partially_succeeded`, `failed`, `cancelled`, and `cancel_failed` are not success.

## Transition

Transition status: transitional
Owning module: te-claude resource-package
Current transport: CLI-token REST `/api/resource-packages/**`
Gateway target: TBD
Review after: 2027-01-16
Exit condition: equivalent stable Gateway capabilities cover task control and the upload/download workflow; retain CLI orchestration and compatibility for published commands.

## Knowledge base export view

`resource-package export` accepts `--view working|published` (default `working`). Working exports include editable sources and schema without stale generated wiki. Published exports require a verifiable formal snapshot and use its matching source metadata; retries retain the same frozen version and dependency closure. A missing formal version fails explicitly. Editable imported KBs have pending sources and no formal version until compilation/publication completes. See [KB publication](../../ae-kb/references/publication.md).
