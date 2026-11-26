# context prepare

`ae-cli context prepare` is the read-only L1 entry for every business action in ae-analysis. It does not change existing business commands or count semantics as used. It is distinct from `context +current` (current page) and `project-semantic setup` (management evidence workspace).

```bash
# First, before deciding the project: company background + all global personal entries.
ae-cli context prepare
# After resolving the project: retained global context + project background and both project catalogs.
ae-cli context prepare --project-id <project_id>
# If remaining_pages is nonzero, retain scope and consume ALL subsequent pages.
ae-cli context prepare --project-id <project_id> --page 2
```

## Session and cache

Use the actual `agent_session_id` from the effective CLI Agent context; generate and retain one ID for this conversation only if the runtime cannot supply it. Do not reuse an old context file's session ID for a new conversation. `--session-id` is an explicit alternative, including when intent telemetry is disabled. A missing ID returns `ANALYSIS_CONTEXT_SESSION_REQUIRED` before business reads.

The private cache is under the CLI configuration directory's `analysis-context` subdirectory. Its scope is host + credential identity digest (credentials identify company/account) + session, with separate project snapshots. No credential text is persisted. Rotating credentials conservatively starts a fresh scope. Directories are private and files are atomically written with mode 0600. Cache hits do not remotely reload backgrounds/catalogs. A fresh/isolated conversation uses a fresh session ID even from the same directory.

Do not refresh for each action or question. Own successful writes update retained in-memory context; use `--refresh` on page 1 to replace the relevant snapshot before subsequently relying on its disk cache. Use explicit refresh when the user asks to reload external changes. Refresh repeats global reads before selected project reads. A failed refresh must be reported and must not be treated as a successful update. Do not use old snapshots to bypass a current failure.

## Output and complete consumption

The output reports `phase=global|project`, cache-hit flags, `prepared_at`, `complete`, `page`, `total_pages`, `remaining_pages`, source/presented entry counts and bounded `items`. Each item is a scoped published background or semantic directory entry. Follow `next_action` until no pages remain. Subsequent pages come from the same snapshot without new business requests. Oversized individual items fail explicitly rather than truncating their text. No drafts or manager-only data are read.

`complete:true` means all source directory rows were obtained, not that the Agent read every page. Reading page 1 or downloading files alone is insufficient. Retain all background and directory pages, choose relevant entries by meaning, then read current full details and necessary dependencies. A get without mark-used is an inspection; mark only actually adopted records after dependencies are verified. For management, preserve original identities and do not mark use.

Public detail/dependency calls use the analysis Gateway domain on EVERY invocation; an inspect call does not retain routing for a later run:

```bash
ae-cli capability inspect business_semantics.project_context.get --domain analysis
ae-cli capability run business_semantics.project_context.get --domain analysis --input '{"project_id":123,"id":"semantic_456"}'
```

The IDs above illustrate the shape only; copy actual IDs from the prepared catalog or a current dependency list. For an adopted rule, repeat the verified call with `mark_used:true` only after necessary dependencies were read. Never infer the route from the `business_semantics` namespace or omit `--domain analysis` on subsequent calls.

## Shared copies

Project preparation asks `business_semantics.personal_context.list` for optional `for_analysis_context:true`. Only this analysis preparation mode omits a personal entry when its associated active project copy has the same content, applicability, semantic type, ordered asset references and dependencies, and neither copy is expired. Independent similar entries, different/unknown meanings, missing or unusable project copies remain represented by the personal entry. The project catalog retains its own project entry. Ordinary personal list calls remain complete, including the existing optional `include_sharing` metadata mode; that mode alone never filters records.

The server returns `selection_policy=ANALYSIS_CONTEXT` to acknowledge this mode. A rejected input or absent acknowledgment is an initialization error requiring the matching Common deployment, never permission to silently use an unfiltered directory. CLI performs no folding, alias generation or duplicate selection. `total_source_entries` and `total_presented_entries` count the returned preparation scope after server filtering, not hidden personal management records. Version 1 preparation caches are reloaded because their personal-first selection is obsolete.

Read the CURRENT project entry and necessary dependencies, then mark only that project ID as used after adoption. Do not fetch or mark its omitted personal source, do not transfer counters, and never count both copies. Preparation and inspection do not count as adoption. For distinct retained rules, existing personal precedence remains applicable. If an explicit dependency refers to a personal ID omitted from the catalog, read that exact ID without marking it merely for inspection; only genuinely adopted dependencies count.

## Failures and scope

Unconfigured backgrounds and complete empty catalogs are valid. Permission/network/unsupported-capability failures, partial catalogs, duplicate IDs, corrupt caches and missing pages fail visibly. A partially fetched project is not cached as prepared; an already completed global stage can be reused when retrying after correcting the project failure. Never continue dependent business actions after initialization failure.

This prerequisite applies to discovery, queries, writes, governance, semantic management and archive review. `knowledge_base=explicit` affects implicit KB discovery only. Do not replace public semantics with a KB or revive retired project-semantic lifecycle commands. Help, authentication, local clock and preparation itself are bootstrap operations.
