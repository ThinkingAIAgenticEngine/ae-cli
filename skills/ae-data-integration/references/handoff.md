# Handoff (reusable package)

After a successful run, export a **handoff package** so the next file of the same shape skips the full pipeline. The package freezes the transform logic (the confirmed mapping), the runnable transform script, and the tracking-plan reference. It does **not** re-freeze the raw data or any upload secrets.

## When

Run handoff after Transform — or after Sink — once the mapping is confirmed. It is local-only and idempotent: re-running it for the same table refreshes the package in place.

## CLI

```
ae-cli data-integration handoff --mapping <mapping> [--plan-file <draft.json>] [--out-dir .ae-data-integration]
```

- `--mapping` — the confirmed `ae-local-data-mapping/v1` mapping (the frozen transform logic, including `value_mapping` and `flatten_rules`).
- `--plan-file` — optional tracking-plan `draft.json` to reference inside the package (`plan.json`).
- `--out-dir` — handoff root. Default `.ae-data-integration/` (travels with the project).
- `--dry-run` previews the fingerprint, files, and index path without writing.

## Package layout

```
.ae-data-integration/
  index.json               ← shared fingerprint index (reuse detection)
  <fingerprint[:16]>/
    mapping.json           ← frozen mapping (re-runnable by convert)
    transform.mjs          ← node transform.mjs <new-file> [<output-dir>]
    plan.json              ← optional tracking-plan reference
```

The `transform.mjs` wrapper shells out to `ae-cli data-integration convert`; it takes the new file path as its first argument, never bakes the source path, and re-stamps `source.sha256` with the new file's fingerprint before converting. Reuse it only for a file of the **same shape** (same header/schema and format) — the transform logic is frozen, but the content guard is re-bound to each specific file.

## Structure fingerprint and index

Every handoff records one entry in `index.json` (`ae-data-integration-index/v1`) keyed by a **structure fingerprint** — a SHA-256 over the table shape: columns (source name + type), event model (`mode`, `event_name_field`, `record_type_field`), identity fields, and excluded columns. Business logic (`value_mapping`, transforms, `time_format`, and the fixed `default_event_name`) is excluded, so re-handing off the same table with new business rules refreshes the existing entry instead of forking a new one.

Reuse matching is its own step — see [references/reuse.md](reuse.md). It compares a new file's profile structure against this index and proposes the matching package, which the user confirms before skipping the full pipeline.

## Safety rules

- Treat the mapping, plan, generated artifacts, and the `.ae-data-integration/` directory as sensitive.
- Never write APPID, endpoints, tokens, or raw data values into a handoff package. The package references the plan and the mapping; uploads still require an explicit, confirmed `upload` call.
- Do not invent a mapping or plan. Handoff only packages what the user already confirmed.
