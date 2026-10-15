# Compilation rule candidates

`+schema` still generates rules from sources. `+import` still imports compiled snapshots. The explicitly approved schema-import contract retains the `+schema-*` command names below.

| Command | Required flags | Purpose |
| --- | --- | --- |
| `+schema-download` | `--name --output` | Download original formal bytes |
| `+schema-import` | `--name --file --request-id` | Upload Markdown with basic checks; AI validation is explicit |
| `+schema-import-list` | `--name` | List pending candidates; `--cursor/--limit` |
| `+schema-import-status` | `--import-id` | Read report, revision and receipt |
| `+schema-import-content` | `--import-id` | Read full candidate; `--target/--output` |
| `+schema-import-diff` | `--import-id` | Full diff and hashes; `--baseline/--output` |
| `+schema-import-save` | `--import-id --revision --request-id --file` | Save only; no AI |
| `+schema-import-validate` | `--import-id --revision --request-id --hash` | Explicit validation |
| `+schema-import-optimize` | `--import-id --revision --request-id --hash` | One repair and independent revalidation; repeat `--issue-id` |
| `+schema-import-reject` | `--import-id --revision --request-id` | Restore latest repair input; no recursive undo |
| `+schema-import-apply` | `--import-id --revision --request-id --hash` and exactly one of `--schema-hash/--schema-absent` | Explicit formal replacement; optional `--report-id` |
| `+schema-import-abandon` | `--import-id --revision --request-id` | Abandon draft; high-risk write |

Use `--scope personal|company` for name lookup. All subsequent operations use the returned import ID, never resolve a name again. Upload may explicitly replace one pending import with `--replaces-import-id/--replaced-revision`; otherwise it creates an additional draft.

Upload, validation, optimization and status support `--wait --timeout <seconds>`. Timeout stops polling and preserves the task. Model operations accept `--model`. Original/current downloads preserve BOM and line endings and never overwrite an existing output file.

Before applying, read `+schema-import-diff --baseline current-schema`, the entire candidate and advisories. Use the returned formal hash. `KB_SCHEMA_IMPORT_BASE_CHANGED` requires reviewing a fresh diff and explicit confirmation; never refresh the hash and automatically replay apply. Revision/request conflicts preserve your file. `settlementPending/recoveryRequired` means an administrator must inspect the operation; it is not an applied success. Applying does not compile or create a published version. Existing Wiki content needs a later compilation.

Normal initialization can apply a reviewed, release-accepted preset without a new AI report. Existing valid formal rules are reused on refresh without upload, application, generation or AI validation. Legacy callers may still pass `--report-id`; it is omitted from JSON when absent. Servers with an older mandatory-report contract reject this fast path; surface that incompatibility rather than invent a report or silently generate rules.

Candidates are shared between Web and CLI for the same user. Closing either client does not abandon saved work. Save makes a new human baseline only when bytes change. Application admission follows the current server's basic checks and `canApply` response. AI validation is explicit and optional; it is recommended once when authoring a reusable preset. Keep its complete passing report and exact content hash before releasing that preset. No automatic model retry loop exists.

## Transitional transport

Maintainer: te-claude knowledge-base schema-import module. Gateway coverage: not available; this feature uses the shared External REST service. Migration target: knowledge-base schema import capabilities when a stable equivalent gateway contract exists. Review date: 2026-12-16. Exit condition: equivalent upload, binary download, revision/receipt, full-diff and asynchronous task semantics are available through the gateway with transport tests. Dry-run redacts local file content. Business error codes are preserved.
