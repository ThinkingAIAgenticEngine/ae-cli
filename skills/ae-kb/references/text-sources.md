# Ordinary text sources

Use these commands for ordinary `.md`, `.markdown` and `.txt` sources, including existing uploads. Text is a content filter on `sourceType=file`, not a new source type. ZIP children and URL collection output use their original commands.

## Create

Copy the exact knowledge base name and `personal` or `company` scope from `kb +list`. Choose exactly one input:

```bash
ae-cli kb source create-text --name "Handbook" --scope company --text "Release notes" --dry-run
ae-cli kb source create-text --name "Handbook" --scope company --title "Release notes" --file ./notes.md
cat ./notes.txt | ae-cli kb source create-text --name "Handbook" --scope company --stdin
```

Each request creates one independent Markdown file source. `--file` reads one UTF-8 `.md`, `.markdown` or `.txt` file (case-insensitive); the server generates a title from the content unless `--title` is supplied, adds `.md`, and resolves duplicate names with a sequence number. To retain a local filename or upload other formats, use `kb +add`. The response `item` contains the final display name, stable ID, current `contentRevision` and pending compilation state.

Transport: `POST /agent/api/external/knowledge-bases/sources/text`, JSON `{name, scope, content, title?, inputMethod:"text_input"}`.

## Read and edit the same source

```bash
ae-cli kb +list-sources --name "Handbook" --scope company --content-type text
ae-cli kb source read-text --name "Handbook" --scope company --id <source-id>
ae-cli kb source read-text --name "Handbook" --scope company --id <source-id> --out ./original.md
ae-cli kb source replace --name "Handbook" --scope company --id <source-id> \
  --source-type file --expected-revision <contentRevision> --text "Revised notes"
cat ./revised.md | ae-cli kb source replace --name "Handbook" --scope company --id <source-id> \
  --source-type file --expected-revision <contentRevision> --stdin
```

`read-text` returns complete `{item, content, contentFormat}` in the standard JSON envelope. `item.contentRevision` corresponds to these exact bytes; `contentFormat` is `markdown` or `text`. `--out` exclusively creates a new local file and returns only `{item, contentFormat, out}`. Existing files and symlinks are never overwritten. A read does not establish write permission.

Text replacement sends `PUT .../sources/<id>/text?name=...&scope=...` with `{content, expectedRevision, inputMethod:"text_input"}`. It preserves the existing source ID, name and format. The original `replace --file` path continues to send multipart data to `/raw` or prepare a ZIP preview, as described in [source mutations](source-mutations.md).

Read after saving and compare the complete bytes and revision. An unchanged save reports `outcome=unchanged` without increasing the revision; a real change reports the actual mutation result and new revision. `SOURCE_CONTENT_REVISION_CONFLICT` exits nonzero: retain local input, read current content and explicitly resolve the conflict. The CLI never obtains a new revision or retries a write automatically.

## Encoding, limits and outcomes

- File and stdin input must be strict UTF-8. BOM, LF/CRLF/CR, mixed line endings and the presence or absence of a trailing newline are preserved. Quotes, backticks and Unicode remain business data. `--stdin` is explicit and requires a pipe; missing input never waits for interactive text.
- Empty or whitespace-only text is rejected. The limit is 50 MiB (52,428,800 UTF-8 bytes), including BOM and newlines. Exactly the limit is allowed. JSON escaping overhead is separate; valid content is never truncated.
- Creation and replacement are ordinary `write` commands without a second confirmation. A `--dry-run` validates local input and previews the request with content redacted, sends no business request, and cannot prove host permissions or a current revision.
- Text flags are sensitive. Text input, full read responses and server error details are excluded from command and HTTP diagnostics; structured errors retain the server code and safe recovery guidance. Explicit `read-text` JSON or `--out` content is the requested business result.
- An unsupported host fails explicitly; the CLI does not fall back to upload or delete/re-add. If the outcome is unknown, inspect `+list-sources` and read the source before deciding on another request; retrying creation can create another independent source.
- Saving does not compile or publish. After reviewing all changes, explicitly use `kb +compile` and inspect `kb +status`. Failed compilation preserves prior published knowledge. Deletion uses existing `+rm-source` confirmation and publication semantics.

## Admission record

- Transition status: transitional
- Owning module: te-claude knowledge-base source management
- Current transport: External Knowledge Base REST API
- Gateway target: TBD
- Review after: 2026-11-12
- Exit condition: when equivalent text and revision capabilities enter the Gateway, migrate the typed commands to the shared transport where their file, stdin, revision and output handling adds value, while preserving released command compatibility.
