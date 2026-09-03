---
name: ae-kb
version: 1.0.0
description: 'AE/TE knowledge base CLI manual for creating, importing read-only compiled snapshots, querying, LLM-powered ask, listing accessible knowledge bases and their sources, deterministic index/grep/read retrieval, checking status, uploading, compiling, schema generation, URL sources, source deletion, and knowledge base deletion. Use when the user asks to manage TE/AE/ThinkingEngine knowledge bases, import a compiled Markdown ZIP snapshot, upload documents or URLs to a knowledge base, query knowledge, ask knowledge bases with an LLM, list accessible knowledge bases or source metadata, inspect knowledge base indexes, search knowledge base pages, read a specific knowledge base page, check knowledge base status, generate schemas, compile knowledge, remove sources, or delete a knowledge base. To choose which knowledge base is worth searching, use the ae-kb-discovery skill first; this skill runs the retrieval once a target is chosen. Must use ae-cli kb commands and must not guess knowledge base names, scopes, page paths, source IDs, source display names, JSON payload shapes, or URL formats.'
---

# ae-kb

AE CLI (`ae-cli`) knowledge base commands are invoked through:

```bash
ae-cli kb +<command> [options]
```

## Global Rules

- Use this skill for TE/AE knowledge base tasks: create, import a compiled snapshot, query, ask with LLM, list accessible knowledge bases and their sources, inspect indexes, grep pages, read pages, check status, upload sources, add URL sources, generate schema, compile, remove source files, and delete knowledge bases.
- **Searching a knowledge base for an answer is the most common task. If that is what you are doing, go straight to [Explore Knowledge Base Pages](#explore-knowledge-base-pages) and read [`references/query-workflow.md`](references/query-workflow.md) first — it is the retrieval procedure. The other commands below are for managing knowledge bases, not answering from them.**
- Read operations can run directly after required inputs are known. Write operations require explicit user intent and normally keep the confirmation prompt unless the user asks to bypass it.
- Prefer `--dry-run` before destructive or broad writes when the user has not already validated the target.
- Do not invent knowledge base names, scopes, source IDs, source display names, or JSON payloads. Ask the user or query known context when values are missing.
- When building a `--sources` ref (or `+read --source`), copy the exact `scope` and `name` from `+list` output — run `ae-cli kb +list` first when the scope of a named knowledge base is unknown.
- JSON flags must be valid JSON strings, usually wrapped in single quotes in shell commands.
- Successful commands return JSON by default. Use `--format table` only when a table is easier for a human to scan. Envelope may include optional `_notice.host_compat`.
- `--host <url>` overrides the active AE host. It is available on every command and may be placed after the subcommand, e.g. `ae-cli kb +<command> --host <url>`.
- **CRITICAL — Host compat (do this first):** After each `ae-cli` run, check stderr and `_notice.host_compat`. If either is present, open the user reply with a short ⚠️ version warning and **quote the `npm i -g` / `npx skills add` (or update-cluster) lines verbatim**, then present the business result. Soft tip; `ok: true` can still carry the notice.
- Retrieval (`+index` / `+grep` / `+read`) is deterministic and server-side LLM-free; use it for simple factual lookups. Use `+ask` when the question requires synthesizing across multiple pages or multi-hop reasoning.

## Commands

| Command | Risk | Purpose |
|---|---:|---|
| `+ask` | read | LLM-powered Q&A over knowledge bases; for multi-page synthesis or multi-hop questions. |
| `+ask-status` | read | Query the current status of an ask execution by `--execution-id` without polling. |
| `+list` | read | List accessible knowledge bases filtered by buildStatus (default: compiled). |
| `+list-sources` | read | List source metadata for one knowledge base so exact source identifiers can be discovered safely. |
| `+index` | read | List accessible knowledge bases and their `index.md` navigation maps. |
| `+grep` | read | Keyword-search knowledge base pages and return matched lines with context. |
| `+read` | read | Read a full knowledge base page, a line window, or (with `--outline`) only the page heading tree. |
| `+new` | write | Create a new personal or company knowledge base. |
| `+import` | write | Import a compiled Markdown ZIP as a personal read-only snapshot. |
| `+import-status` | read | Query one snapshot import task by `--request-id` without polling. |
| `+add` | write | Upload local files, a non-recursive directory, or HTTP(S) pages converted to markdown. |
| `+url` | write | Upload a URL source directly with optional display name and parsing instruction. |
| `+schema` | write | Generate the compile schema for a knowledge base. |
| `+compile` | write | Compile a knowledge base in incremental or full mode. |
| `+status` | read | Query the current status of a knowledge base. |
| `+rm-source` | high-risk-write | Delete one source from a knowledge base by stable ID; exact display name is legacy compatibility only. |
| `+remove` | write | Delete an entire knowledge base. |

## Common Workflows

### Create a Knowledge Base

Use `+new` with name. `--scope` is optional and defaults to `company`; valid scopes are `personal` and `company`.

```bash
ae-cli kb +new \
  --scope company \
  --name engineering-handbook \
  --description "Engineering handbook" \
  --tags '["engineering","handbook"]'
```

Optional fields:

- `--scope`: scope, defaults to `company`.
- `--description`: description, up to 200 characters.
- `--tags`: JSON array, max 2 tags, each up to 15 characters.
- `--project-id`: optional project ID to bind.
- `--project-name`: optional project display name.

### Import a Compiled Snapshot

Use `+import` only for a ZIP whose root contains `index.md` and at least one
`wiki/**/*.md` page. The server validates all archive paths, limits, UTF-8 text, and Wiki links.

```bash
ae-cli kb +import \
  --file ./knowledge-base.zip \
  --name "Imported handbook" \
  --description "Compiled documentation snapshot" \
  --tags '["docs","handbook"]'

# The submission returns requestId + queued. Query one snapshot later:
ae-cli kb +import-status --request-id <requestId>
```

- The result is always a `personal` read-only snapshot; there is no `--scope`, `--force`, or replace option.
- Imported snapshots support list, Index/Wiki reading, grep/read, Ask, and deletion. They do not expose source, Schema, usage, compile, member, settings, ownership-transfer, or company-publish operations.
- The ZIP is limited to 50 MB and supports Markdown text only. Local images, attachments, other binaries, broken Wiki links, and ambiguous Wiki links are rejected by the server.
- Submission returns `{requestId, status: "queued"}` immediately. It does not wait for ZIP validation or publication.
- `+import-status` returns one of `queued`, `running`, `succeeded`, or `failed`; success includes `knowledgeBaseId`, and failure includes a stable error code/message.
- If a `requestId` was returned, query it before retrying. If no request ID was received, run `ae-cli kb +list` before retrying the same name. A repeated same-name import is rejected.

- Transition status: transitional
- Owning module: te-claude External Knowledge Base Import API
- Current transport: authenticated KB external REST through `kbUpload` for submission and `kbApi` for status lookup.
- Gateway target: TBD (`kb.snapshot.import` proposed)
- Review after: 2026-12-01
- Exit condition: migrate to a typed Gateway capability when the equivalent multipart import capability is available, or remove this command if dynamic Gateway execution provides the same file-handling and output contract.

### Upload Files or Directories

Use `+add` when sources are local files, local directories, or pages that should be fetched and converted to markdown before upload.

```bash
ae-cli kb +add \
  --name engineering-handbook \
  --files '["./README.md","./docs","https://example.com/guide"]'
```

Input rules:

- `--files` must be a JSON array of strings.
- Local directory reading is non-recursive.
- URL entries must start with `http://` or `https://`.
- Supported extensions include markdown/text, office documents, PDFs, spreadsheets, presentations, and common images. Local files are uploaded as multipart file blobs; HTTP(S) pages are fetched and converted to markdown before upload.
- Duplicate filenames are automatically suffixed as `name-1.ext`, `name-2.ext`, etc.

### Add a URL Source

Use `+url` when adding one URL source and optionally passing a display name or parsing instruction.

```bash
ae-cli kb +url \
  --name engineering-handbook \
  --url https://example.com/guide \
  --display-name guide \
  --parse-instruction "Keep headings and code blocks"
```

`--url` must be `http(s)`. The server detects the platform from the URL automatically: URLs on a `*.feishu.cn` or `*.larksuite.com` subdomain are parsed with the Feishu pipeline (including sub-documents, using the server's own Feishu parsing instruction — `--parse-instruction` is ignored for them); all other URLs are fetched as regular web pages.

### Generate Schema and Compile

Generate the schema first when the knowledge base needs a compile schema.

```bash
ae-cli kb +schema --name engineering-handbook
```

Use `--force` only when `+status` reports `schema_generating` and the user explicitly wants to replace the current generation attempt. The replacement may consume additional tokens. Use `--model` only when the user provides the model display name.

To add one-time guidance for this generation without changing stored knowledge base metadata, pass `--custom-instructions`. The server trims the value, treats whitespace-only input as absent, and accepts up to 10,000 Unicode characters. Do not include secrets or credentials.

```bash
ae-cli kb +schema \
  --name engineering-handbook \
  --custom-instructions "Prioritize troubleshooting workflows and preserve command examples"
```

Use `--dry-run` to inspect the request body before sending it. While generation is running, a request without `--force` is idempotent only when it supplies no new model or effective custom instructions; otherwise it fails with `KB_SCHEMA_GENERATION_IN_PROGRESS`. With `--force`, the selected model and custom instructions apply to the replacement attempt. Invalid text fails with `KB_SCHEMA_CUSTOM_INSTRUCTIONS_INVALID`.

Compile after sources and schema are ready:

```bash
ae-cli kb +compile --name engineering-handbook --mode incremental
```

Valid compile modes are `incremental` and `full`; default is `incremental`.

### Check Knowledge Base Status

Use `+status` to inspect the current status of a knowledge base.

```bash
ae-cli kb +status --name engineering-handbook
```

### Ask Knowledge (LLM)

Use `+ask` when the question requires synthesizing across multiple pages or multi-hop reasoning — a server-side agent runs the full retrieval loop and returns a synthesized answer with its source paths. Prefer `+index` -> `+grep` -> `+read` when deterministic retrieval is enough.

The `+ask` command uses asynchronous submit/poll: by default, it automatically polls for completion (every 5s, up to 10 minutes) and prints the final answer. The output JSON is isomorphic to the previous synchronous response, so consumers require no changes.

```bash
# Default: submit and poll for completion
ae-cli kb +ask \
  --question "How do we troubleshoot payment alerts?" \
  --sources '[{"scope":"company","name":"engineering-handbook"}]' \
  --model-id claude-sonnet-4-6 \
  --max-turns 50 \
  --locale zh

# Submit only, return executionId immediately (for batch processing)
ae-cli kb +ask --question "..." --no-wait

# Query execution status later
ae-cli kb +ask-status --execution-id <id>
```

- `--question`, alias `-q`: required natural-language question (1-2000 characters).
- `--sources`: optional JSON array of knowledge base refs. Omit to search all accessible knowledge bases.
- `--model-id`: optional LLM model ID. Omit to use the platform default.
- `--max-turns`: optional agent turn limit (1-100, server default 50).
- `--locale`: optional locale: `zh`, `en`, `ja`, or `ko`.
- `--no-wait`: optional boolean flag. Return immediately after submission with `{executionId, status}`, without polling.
- **Failure handling**: If execution fails, the command exits non-zero and prints an error message on stderr prefixed with the typed error code, e.g. `[timeout] ...` / `[model_error] ...` / `[invalid_sources] ...` (followed by the executionId). Treat the bracketed code as the machine-readable failure type.

### List Accessible Knowledge Bases

Use `+list` when you only need accessible knowledge base metadata without loading `index.md` navigation maps. Omit `--build-status` to default to `compiled`; pass `idle` / `pending` / `compiling` / `compiled` / `failed` to filter by a specific status (system knowledge bases are always listed regardless of status):

```bash
ae-cli kb +list
ae-cli kb +list --locale zh
ae-cli kb +list --build-status compiled
```

### Explore Knowledge Base Pages

Use the deterministic retrieval primitives when an agent needs to explore knowledge base content like a code repository. These endpoints do not call an LLM on the server side.

**Before running a real query, read [`references/query-workflow.md`](references/query-workflow.md)** — it is the step-by-step procedure for turning a question into an answer without crawling. It covers candidate indexing, copied-path grep, same-page read windows, linked-page re-grep, outline-derived ranges, and coverage assessment. This section below is the per-command reference the workflow draws on.

Start with `+list` or `+index` to discover accessible knowledge bases. Use `+index` when you also need navigation maps:

```bash
ae-cli kb +list
```

```bash
ae-cli kb +index \
  --sources '[{"scope":"company","name":"engineering-handbook"}]'
```

Then use `+grep` to locate likely pages and line numbers:

```bash
ae-cli kb +grep \
  --query "sandbox configuration" \
  --sources '[{"scope":"company","name":"engineering-handbook"}]' \
  --paths '["wiki/sandbox.md"]' \
  --top-k 10
```

Each grep hit carries `path`, `line`, `breadcrumb`, a context snippet, and the section range of the matched line (`sectionStartLine` / `sectionEndLine`). `line` is the hit anchor; `sectionStartLine` / `sectionEndLine` are the enclosing heading-section boundaries. Choose the smallest reliable `--offset` / `--limit` window that preserves the needed evidence; use the section range when the answer needs whole-section context.

Use `+read --outline` when the current target page has no reliable grep range and headings are needed to choose a section:

```bash
ae-cli kb +read \
  --source '{"scope":"company","name":"engineering-handbook"}' \
  --path "wiki/sandbox.md" \
  --outline
```

Then use `+read` to open the selected window, using the hit anchor, a section boundary from same-page or linked-page grep, or two adjacent outline headings:

```bash
ae-cli kb +read \
  --source '{"scope":"company","name":"engineering-handbook"}' \
  --path "wiki/sandbox.md" \
  --offset 42 \
  --limit 60
```

### List Sources

List sources first to discover the stable identifier for the intended source:

```bash
ae-cli kb +list-sources --name engineering-handbook
```

Copy the exact `id` from the response into `+rm-source`. Do not guess a source ID from a local filename, URL, display name, or an older upload response.

- Transition status: transitional
- Owning module: te-claude External Knowledge Base Sources API
- Current transport: authenticated KB external REST through `kbApi`.
- Gateway target: TBD (`kb.source.list` proposed)
- Review after: 2026-12-03
- Exit condition: migrate to a typed Gateway capability when an equivalent source-list capability is available, or remove this command if dynamic Gateway execution provides the same discoverability and safe output contract.

### Remove One Source

Use `+rm-source --id` with the exact ID returned by the current `+list-sources` response. This is a `high-risk-write`; keep the interactive confirmation unless the user has explicitly authorized `--yes`.

```bash
ae-cli kb +rm-source \
  --name engineering-handbook \
  --id cm-source-id
```

`--display-name` is retained for legacy compatibility only when a stable source ID is unavailable:

```bash
ae-cli kb +rm-source \
  --name engineering-handbook \
  --display-name kb-1780046712-guide.md
```

If the user only gives a loose source name, do not guess a source ID. Run `+list-sources`, identify the intended row from returned metadata, and ask only when multiple rows remain ambiguous.

### Delete a Knowledge Base

Use `+remove` for deleting the entire knowledge base. Confirm the target name with the user if there is any ambiguity.

```bash
ae-cli kb +remove --name engineering-handbook
```

## Command Reference

### `+ask`

```bash
ae-cli kb +ask --question "<question>" [--sources '[{"scope":"company","name":"kb-name"}]'] [--model-id claude-sonnet-4-6] [--max-turns 50] [--locale zh|en|ja|ko] [--no-wait]
```

- `--question`, alias `-q`: required natural-language question (1-2000 characters).
- `--sources`: optional JSON array of knowledge base refs. Omit to search all accessible knowledge bases.
- `--model-id`: optional LLM model ID. Omit to use the platform default.
- `--max-turns`: optional agent turn limit (1-100, server default 50).
- `--locale`: optional locale: `zh`, `en`, `ja`, or `ko`.
- `--no-wait`: optional. Return immediately with `{executionId, status}` instead of polling.
- When to use: multi-page synthesis or multi-hop questions. For simple factual lookups, prefer `+index` / `+grep` / `+read`.
- Output: By default, polls and returns `{executionId, answer, sources, modelUsage, toolCallCount, maxTurns, modelId}` (same fields as the previous synchronous response, plus `executionId`). With `--no-wait`, returns `{executionId, status}` immediately. On failure, exits non-zero with a stderr message prefixed by the typed error code (`[timeout]`, `[model_error]`, `[invalid_sources]`, `[process_restart]`).

### `+ask-status`

```bash
ae-cli kb +ask-status --execution-id <id>
```

- `--execution-id`: required. The execution ID returned by `+ask` submission.
- Output: Returns the current execution state: `{executionId, status, elapsedMs?, answer?, sources?, modelUsage?, toolCallCount?, error?}`. Does not poll; returns a single snapshot.

### `+list`

```bash
ae-cli kb +list [--build-status compiled] [--locale zh|en|ja|ko]
```

- `--build-status`: optional; one of `idle` / `pending` / `compiling` / `compiled` / `failed`. Omit to default to `compiled` (system knowledge bases are always listed regardless of status).
- `--locale`: optional locale: `zh`, `en`, `ja`, or `ko`.
- Response items include `buildStatus`.

### `+index`

```bash
ae-cli kb +index [--sources '[{"scope":"company","name":"kb-name"}]'] [--locale zh|en|ja|ko]
```

- `--sources`: optional JSON array of knowledge base refs. Omit to list all accessible knowledge bases.
- `--locale`: optional locale: `zh`, `en`, `ja`, or `ko`.

### `+grep`

```bash
ae-cli kb +grep --query "<keywords>" --sources '[{"scope":"company","name":"kb-name"}]' --paths '["wiki/page.md"]' [--top-k 10] [--locale zh|en|ja|ko]
```

- `--query`, alias `-q`: required keywords to search.
- `--sources`: required JSON array of knowledge base refs.
- `--paths`: required JSON array of wiki pages or subdirectories **copied** from `+index`. A single page is still an array, e.g. `["wiki/sandbox.md"]`. Distinct from `+read --path` (one string).
- `--top-k`: optional max number of hits, 1-50, default 10.
- `--locale`: optional locale: `zh`, `en`, `ja`, or `ko`.
- Each hit includes `sectionStartLine` / `sectionEndLine`: the line range of the section (bounded by the nearest headings) containing the matched line. Use it as the `+read` window.

### `+read`

```bash
ae-cli kb +read --source '{"scope":"company","name":"kb-name"}' --path "index.md" [--offset 1] [--limit 200] [--outline] [--locale zh|en|ja|ko]
```

- `--source`: required JSON object pointing to exactly one knowledge base.
- `--path`: required page path relative to the knowledge base root, such as `index.md` or `wiki/concepts/data-model.md`.
- `--offset`: optional 1-based start line.
- `--limit`: optional max line count, 1-10000.
- `--outline`: optional. Return only the whole-page heading tree (`{level, heading, line}`) with empty content, independent of `--offset` / `--limit`. Use it on long pages to choose which section to read.
- `--locale`: optional locale: `zh`, `en`, `ja`, or `ko`.

### `+new`

```bash
ae-cli kb +new --name "<name>" [--scope personal|company] [--description "..."] [--tags '["t1","t2"]'] [--project-id "..."] [--project-name "..."]
```

### `+add`

```bash
ae-cli kb +add --name "<name>" --files '["./a.md","./docs","https://example.com/page"]'
```

### `+import`

```bash
ae-cli kb +import --file "./knowledge-base.zip" --name "<name>" [--description "..."] [--tags '["t1","t2"]'] [--project-id "..."]
```

- `--file`: required local `.zip` file.
- `--name`: required personal knowledge-base name, up to 30 characters.
- `--description`: optional, up to 200 characters.
- `--tags`: optional JSON array, max 2 unique tags, each up to 15 characters.
- `--project-id`: optional project binding.
- Scope and terminal build state are generated by the server and cannot be supplied by the client.
- Output: `{requestId, status: "queued"}`. Use `+import-status`; the command does not poll.

### `+import-status`

```bash
ae-cli kb +import-status --request-id <requestId>
```

- `--request-id`: required ID returned by `+import`.
- Output: `{requestId, status, knowledgeBaseId?, errorCode?, errorMessage?}`.
- Returns a single snapshot and does not poll. A failed import is returned as `status: "failed"` with its stable error code/message; an unknown or inaccessible request exits non-zero.

### `+url`

```bash
ae-cli kb +url --name "<name>" --url "https://example.com/page" [--display-name "..."] [--parse-instruction "..."]
```

### `+schema`

```bash
ae-cli kb +schema --name "<name>" [--force] [--model "<model displayName>"] [--custom-instructions "<one-time guidance>"]
```

- `--custom-instructions`: Optional per-run schema-generation guidance. It is not persisted; whitespace-only input is omitted. The server allows at most 10,000 Unicode characters and rejects disallowed control characters. Do not include secrets or credentials.
- `--force`: Replace the current attempt only when schema generation is already running and the user explicitly requests the replacement. The selected model and custom instructions apply to the new attempt, which may consume additional tokens.
- `--dry-run`: Shows the same `customInstructions` request field that execution will send.
- Errors: `KB_SCHEMA_CUSTOM_INSTRUCTIONS_INVALID` means the field failed validation. `KB_SCHEMA_GENERATION_IN_PROGRESS` means generation is active and a request without `--force` supplied a new model or effective custom instructions.

### `+compile`

```bash
ae-cli kb +compile --name "<name>" [--mode incremental|full]
```

### `+status`

```bash
ae-cli kb +status --name "<name>"
```

### `+list-sources`

```bash
ae-cli kb +list-sources --name "<name>"
```

- `--name`: required knowledge base name.
- Output: Safe source metadata including the stable `id` needed by `+rm-source`; raw paths, hashes, credentials, and source content are not returned.
- Copy the exact `id` from the current response before deleting a source; never guess it.

### `+rm-source`

```bash
ae-cli kb +rm-source --name "<name>" --id "<source-id>"
```

- `--id`: preferred stable source identifier copied from `+list-sources`.
- `--display-name`: legacy compatibility selector used only when an ID is unavailable.
- If both are supplied, `--id` wins. The command removes one source only.

### `+remove`

```bash
ae-cli kb +remove --name "<name>"
```
