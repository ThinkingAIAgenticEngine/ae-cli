---
name: ae-kb
version: 1.0.0
description: "AE/TE knowledge base CLI manual for creating, querying, LLM-powered ask, deterministic index/grep/read retrieval, checking status, uploading, compiling, schema generation, URL sources, source deletion, and knowledge base deletion. Use when the user asks to manage TE/AE/ThinkingEngine knowledge bases, upload documents or URLs to a knowledge base, query knowledge, ask knowledge bases with an LLM, inspect knowledge base indexes, search knowledge base pages, read a specific knowledge base page, check knowledge base status, generate schemas, compile knowledge, remove sources, or delete a knowledge base. Must use ae-cli kb commands and must not guess knowledge base names, scopes, page paths, source display names, JSON payload shapes, or URL formats."
---

# ae-kb

AE CLI (`ae-cli`) knowledge base commands are invoked through:

```bash
ae-cli kb +<command> [options]
```

## Global Rules

- Use this skill for TE/AE knowledge base tasks: create, query, ask with LLM, inspect indexes, grep pages, read pages, check status, upload sources, add URL sources, generate schema, compile, remove source files, and delete knowledge bases.
- Read operations can run directly after required inputs are known. Write operations require explicit user intent and normally keep the confirmation prompt unless the user asks to bypass it.
- Prefer `--dry-run` before destructive or broad writes when the user has not already validated the target.
- Do not invent knowledge base names, scopes, source display names, or JSON payloads. Ask the user or query known context when values are missing.
- JSON flags must be valid JSON strings, usually wrapped in single quotes in shell commands.
- Successful commands return JSON by default. Use `--format table` only when a table is easier for a human to scan.
- `--host <url>` overrides the active AE host. It is available on every command and may be placed after the subcommand, e.g. `ae-cli kb +<command> --host <url>`.
- For external-agent retrieval, prefer the deterministic flow `+index` -> `+grep` -> `+read`: inspect navigation, locate candidate pages, then open the exact page or line window. Use `+ask` only when the user wants an LLM-synthesized answer and accepts token consumption.

## Commands

| Command | Risk | Purpose |
|---|---:|---|
| `+query` | read | Query one or more knowledge bases with a natural-language question. |
| `+ask` | read | LLM-powered Q&A over knowledge bases. Consumes platform tokens. |
| `+index` | read | List accessible knowledge bases and their `index.md` navigation maps. |
| `+grep` | read | Keyword-search knowledge base pages and return matched lines with context. |
| `+read` | read | Read a full knowledge base page or a line window. |
| `+new` | write | Create a new personal or company knowledge base. |
| `+add` | write | Upload local files, a non-recursive directory, or HTTP(S) pages converted to markdown. |
| `+url` | write | Upload a URL source directly with optional display name and parsing instruction. |
| `+schema` | write | Generate the compile schema for a knowledge base. |
| `+compile` | write | Compile a knowledge base in incremental or full mode. |
| `+status` | read | Query the current status of a knowledge base. |
| `+rm-source` | write | Delete one source file from a knowledge base by display name. |
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

`--url` must be `http(s)`.

### Generate Schema and Compile

Generate the schema first when the knowledge base needs a compile schema.

```bash
ae-cli kb +schema --name engineering-handbook
```

Use `--force` only to recover a stuck `generating` status. Use `--model` only when the user provides the model display name.

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

### Query Knowledge

Use `+query` with a natural-language question and a JSON array of source refs.

```bash
ae-cli kb +query \
  --query "How do we release a dashboard?" \
  --sources '[{"scope":"company","name":"engineering-handbook"}]'
```

`--sources` entries require:

- `scope`: knowledge base scope such as `personal` or `company`.
- `name`: knowledge base name.

### Ask Knowledge (LLM)

Use `+ask` when the user wants an LLM-synthesized answer. This endpoint calls a large language model and **consumes platform tokens**. Prefer `+index` -> `+grep` -> `+read` when deterministic retrieval is enough.

```bash
ae-cli kb +ask \
  --question "How do we troubleshoot payment alerts?" \
  --sources '[{"scope":"company","name":"engineering-handbook"}]' \
  --model-id claude-sonnet-4-6 \
  --max-turns 10 \
  --locale zh
```

- `--question`, alias `-q`: required natural-language question (1-2000 characters).
- `--sources`: optional JSON array of knowledge base refs. Omit to search all accessible knowledge bases.
- `--model-id`: optional LLM model ID. Omit to use the platform default.
- `--max-turns`: optional agent turn limit (1-20, server default 10).
- `--locale`: optional locale: `zh`, `en`, `ja`, or `ko`.

### Explore Knowledge Base Pages

Use the deterministic retrieval primitives when an agent needs to explore knowledge base content like a code repository. These endpoints do not call an LLM on the server side.

Start with `+index` to see accessible knowledge bases and navigation maps:

```bash
ae-cli kb +index \
  --sources '[{"scope":"company","name":"engineering-handbook"}]'
```

Then use `+grep` to locate likely pages and line numbers:

```bash
ae-cli kb +grep \
  --query "sandbox configuration" \
  --sources '[{"scope":"company","name":"engineering-handbook"}]' \
  --top-k 10
```

Finally use `+read` to open the exact page, optionally with a line window:

```bash
ae-cli kb +read \
  --source '{"scope":"company","name":"engineering-handbook"}' \
  --path "wiki/sandbox.md" \
  --offset 1 \
  --limit 200
```

Retrieval rules:

- `+index` accepts optional `--sources` and `--locale`; omit `--sources` to list all accessible knowledge bases.
- `+grep` requires `--query` / `-q`; optional `--sources`, `--top-k` (1-50, default 10), and `--locale`.
- `+read` requires `--source` pointing to exactly one knowledge base and `--path` relative to the knowledge base root; optional `--offset`, `--limit` (1-10000), and `--locale`.
- Do not guess a `--path`; get it from `+index` or `+grep` results.

### Remove One Source

Use `+rm-source` only when the source display name is known exactly.

```bash
ae-cli kb +rm-source \
  --name engineering-handbook \
  --display-name kb-1780046712-guide.md
```

If the user only gives a loose source name, do not guess. Ask for the exact uploaded display name.

### Delete a Knowledge Base

Use `+remove` for deleting the entire knowledge base. Confirm the target name with the user if there is any ambiguity.

```bash
ae-cli kb +remove --name engineering-handbook
```

## Command Reference

### `+query`

```bash
ae-cli kb +query --query "<question>" --sources '[{"scope":"company","name":"kb-name"}]'
```

- `--query`, alias `-q`: required natural-language question.
- `--sources`: required JSON array of knowledge base refs.

### `+ask`

```bash
ae-cli kb +ask --question "<question>" [--sources '[{"scope":"company","name":"kb-name"}]'] [--model-id claude-sonnet-4-6] [--max-turns 10] [--locale zh|en|ja|ko]
```

- `--question`, alias `-q`: required natural-language question (1-2000 characters).
- `--sources`: optional JSON array of knowledge base refs. Omit to search all accessible knowledge bases.
- `--model-id`: optional LLM model ID. Omit to use the platform default.
- `--max-turns`: optional agent turn limit, 1-20, server default 10.
- `--locale`: optional locale: `zh`, `en`, `ja`, or `ko`.
- **Token cost**: this command invokes an LLM on the server and consumes platform tokens. Prefer `+index` -> `+grep` -> `+read` for token-free deterministic retrieval.

### `+index`

```bash
ae-cli kb +index [--sources '[{"scope":"company","name":"kb-name"}]'] [--locale zh|en|ja|ko]
```

- `--sources`: optional JSON array of knowledge base refs. Omit to list all accessible knowledge bases.
- `--locale`: optional locale: `zh`, `en`, `ja`, or `ko`.

### `+grep`

```bash
ae-cli kb +grep --query "<keywords>" [--sources '[{"scope":"company","name":"kb-name"}]'] [--top-k 10] [--locale zh|en|ja|ko]
```

- `--query`, alias `-q`: required keywords to search across knowledge bases.
- `--sources`: optional JSON array of knowledge base refs. Omit to search all accessible knowledge bases.
- `--top-k`: optional max number of hits, 1-50, default 10.
- `--locale`: optional locale: `zh`, `en`, `ja`, or `ko`.

### `+read`

```bash
ae-cli kb +read --source '{"scope":"company","name":"kb-name"}' --path "index.md" [--offset 1] [--limit 200] [--locale zh|en|ja|ko]
```

- `--source`: required JSON object pointing to exactly one knowledge base.
- `--path`: required page path relative to the knowledge base root, such as `index.md` or `wiki/concepts/data-model.md`.
- `--offset`: optional 1-based start line.
- `--limit`: optional max line count, 1-10000.
- `--locale`: optional locale: `zh`, `en`, `ja`, or `ko`.

### `+new`

```bash
ae-cli kb +new --name "<name>" [--scope personal|company] [--description "..."] [--tags '["t1","t2"]'] [--project-id "..."] [--project-name "..."]
```

### `+add`

```bash
ae-cli kb +add --name "<name>" --files '["./a.md","./docs","https://example.com/page"]'
```

### `+url`

```bash
ae-cli kb +url --name "<name>" --url "https://example.com/page" [--display-name "..."] [--parse-instruction "..."]
```

### `+schema`

```bash
ae-cli kb +schema --name "<name>" [--force] [--model "<model displayName>"]
```

### `+compile`

```bash
ae-cli kb +compile --name "<name>" [--mode incremental|full]
```

### `+status`

```bash
ae-cli kb +status --name "<name>"
```

### `+rm-source`

```bash
ae-cli kb +rm-source --name "<name>" --display-name "<uploaded source display name>"
```

### `+remove`

```bash
ae-cli kb +remove --name "<name>"
```
