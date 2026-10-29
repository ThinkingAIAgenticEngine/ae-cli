# Publication and read contexts

Source-managed personal KBs publish automatically after a successful compile. Company KBs produce an immutable candidate and automatically submit `kb.version.publish@1`; an authorized current content editor (including the requester) approves through the existing approval workflow. Editing working sources after compilation does not change the candidate. Approval publishes that frozen candidate without overwriting working edits. No feature switch is required.

## Inspect and manage

| Command | Purpose | Risk |
| --- | --- | --- |
| `ae-cli kb publication get` | Formal version and candidate summary | read |
| `ae-cli kb candidate get` | Candidate metadata | read |
| `ae-cli kb candidate changes` | Changed sources, Wiki and Index; optional bounded text diff | read |
| `ae-cli kb candidate read` | Immutable candidate file | read |
| `ae-cli kb candidate discard` | Close a confirmed failed candidate | high-risk-write |
| `ae-cli kb +rm-source` | Delete a source, optionally cancelling its pending candidate | high-risk-write |
| `ae-cli kb read-context create` | Pin authorized formal views | read |
| `ae-cli kb read-context release` | Release the current user's context | write |

- `ae-cli kb publication get --name <verified-name> [--scope personal|company]`: formal version and active candidate summary.
- `ae-cli kb candidate get --name <verified-name> [--scope ...] --candidate <id>`: candidate metadata.
- `ae-cli kb candidate read --name <verified-name> [--scope ...] --candidate <id> --path <verified-path>`: immutable candidate index.md, CLAUDE.md or wiki Markdown. Candidate preview requires current content-write permission; it is not a formal query.
- `ae-cli kb candidate discard --name <verified-name> [--scope ...] --candidate <id> --yes`: `high-risk-write`; discard a candidate after a confirmed retryable publication failure. Pending requests use approval cancel. A running or uncertain publication cannot be discarded.
- When source deletion conflicts with a pending candidate, explicitly combine `ae-cli kb +rm-source --name <verified-name> --id <source-id> --cancel-candidate --expected-candidate-id <id> --yes`. This is `high-risk-write`; both flags are required. A changed candidate causes a conflict; inspect again instead of silently deleting it.

## Review compilation changes

```bash
ae-cli kb candidate changes --name 'Verified KB' --scope company --candidate '<candidateId>'
ae-cli kb candidate changes --name 'Verified KB' --scope company --candidate '<candidateId>' --entry-id '<entryId>'
ae-cli kb candidate changes --name 'Verified KB' --scope company --candidate '<candidateId>' --entry-id '<entryId>' --file '<returned-member-path>' --context 3
```

The list returns `candidateId`, the fixed `baseline`, `status`, `firstPublication`, `entries` and `summary`. Only changed sources, Wiki pages and Index are included; compilation rules and historical comparison are outside this preview. Copy entry IDs and member paths from actual responses. `--file` requires `--entry-id`; `--context` is 0 (default, changes only) or 3 (adjacent unchanged lines).

Entry details include changed source `fields`, changed `files`, `selectedFile`, `preview` and bounded `hunks`. The first changed file is selected by default; choose other returned members explicitly. Binary files return metadata; text over 1 MB or a complex diff has an explicit preview status. These states are not proof of unchanged contents. A legacy publication without a reconstructible frozen baseline returns `status=baseline_unavailable` and `summary=null`; missing/corrupt snapshots, forbidden access and invalid selections fail explicitly. Never substitute current working files. Successful first publication is shown entirely as added. The endpoint requires the same current content-write permission as candidate reads. Existing `candidate get/read` calls remain unchanged. Unsupported older Hosts return an error; do not fall back to comparing mutable content.

`--dry-run` shows the GET path and validated selectors without remote access. This new command uses the same Transitional admission and migration exit below.

## Query a stable formal view

`ae-cli kb +list --view published` creates a temporary context, queries, then releases it. Old Hosts without context support fail explicitly. The legacy `kb +list` default remains `buildStatus=compiled`; published/contextual list omits only this implicit filter. Explicit `--build-status` still applies.

For several related reads:

```bash
ae-cli kb read-context create --sources '[{"scope":"company","name":"Verified KB"}]'
ae-cli kb +index --name 'Verified KB' --scope company --read-context '<readContextId>'
ae-cli kb +read --name 'Verified KB' --scope company --path 'wiki/verified.md' --read-context '<readContextId>'
ae-cli kb read-context release --id '<readContextId>'
```

Create accepts optional `--sources` array of `{scope,name}` and `--locale zh|en|ja|ko`. Omission discovers currently authorized formal KBs. Contexts last 15 minutes and bind list/index/grep/read to the selected formal versions. Sources, permissions, KB lifecycle and actor identity remain checked on every read. Release is owner-only and idempotent for an expired context. Do not manufacture version IDs, storage keys or context IDs.

For an expired or mismatched context, stop the sequence. A new explicit sequence may create a new context, but must not mix its results with prior context results. New snapshot-mode KBs with no published version are unpublished; an inconsistent formal pointer fails rather than falling back to working files.

Inside an Agent/Ask execution the runtime supplies a private execution context. The CLI automatically uses its scoped credential for the four query commands; do not read, print, copy or replace this credential. Missing/expired/mismatched runtime credentials fail closed, including on 401. Management commands continue using normal CLI authorization. Runtime capability negotiation is protocol validation, not a user feature toggle.

## Copy and export

A new company-copy approval freezes the current personal formal version when its Effect first executes. Retries reuse the same version and target identity. Later source changes do not alter the copy.

`ae-cli agent resource-package export --view working|published ...` defaults to working. Working exports preserve editable sources/schema and omit stale generated wiki. Published exports use one frozen formal snapshot and matching source metadata. Export retries reuse the frozen dependency closure. Editable imports start with pending sources and no published version; read-only compiled imports keep their established serving behavior.

## Command admission

- Classification: Transitional.
- Owning module: te-claude knowledge-base publication and query-context management; CLI owner: te-cli te-kb.
- Current transport: authenticated External REST through `kbApi`; runtime query calls additionally require the scoped context credential and header.
- Gateway target: an equivalent KB publication/candidate/read-context capability with the same current-editor checks, immutable candidates, idempotency, and fail-closed query binding; no equivalent is currently registered.
- Review after: 2026-11-25.
- Exit condition: when Gateway provides these semantics, migrate value-adding typed commands to L2 and simple wrappers to L3. Preserve existing command compatibility during migration.
- Write safety: candidate discard and combined source deletion require explicit `--yes`, current write permission and candidate identity checks. Context release is owner-scoped and idempotent; request preview is local and does not claim remote validation.

### Large change sets and first publication

Use `kb candidate changes --group sources|wiki|index --search <name-or-path> --change added|modified|deleted --offset 0 --limit 50` for a bounded directory page. `summary` and `groups` describe all changes; `page.total` describes entries matching the filters. Omitting these flags preserves the existing full-list call. A detail request uses `--entry-id`; `--file-search`, `--file-offset` and `--file-limit` page the changed members. `--file` selects an exact changed member independent of member pagination.

The first successful source-managed KB compilation now publishes automatically, including company KBs. Later company updates require approval. Empty version pointers alone do not prove a first publication: legacy formal content and historical versions still require review. Existing eligible first-publication pending requests are withdrawn by the server with a system audit and the same frozen candidate is published; do not approve or create another compilation to force this transition. Already decided requests are not converted. `publication get` and `candidate get` remain read-only and expose the current publication state; an automatically published candidate is still readable by its known ID.

Text and Markdown members return changed hunks. Small, unambiguous CSV/TSV changes may additionally include `table` containing only changed rows. ZIP and URL/Feishu sources expose changed frozen members; PDF, Office, images, invalid UTF-8 and oversized content explicitly return metadata/limit status rather than a fabricated textual diff. No source URL is fetched during preview.

Compatibility: deploy the matching server before using new paging flags. Old CLI requests continue to work on the new server. New flags against older servers fail explicitly with `KB_CANDIDATE_PAGING_UNSUPPORTED` when `page` or `filePage` is missing; the CLI never treats an unfiltered old response as a filtered result.
