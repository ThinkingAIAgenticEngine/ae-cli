# Replace and Restore Source Drafts

These commands require a host exposing the External KB source-mutation and preview APIs. They do not compile or publish. Do not substitute `+add`, delete/re-add a source, or use whole-KB `+rollback` when the host lacks these routes.

## Discover the exact target

1. Use `kb +list` to copy the exact knowledge base name and `personal` or `company` scope.
2. Use `kb +list-sources --name "<name>" --scope <scope>` to copy the current source `id`, `sourceType`, and `contentRevision`.
3. For restoration, use `kb +versions` and `kb +version-sources` to select a published version containing this source. To discard unpublished changes, use the latest published **version number**, not `latestVersionId`.
4. The source must still exist. URL/Feishu sources and deleted parent sources cannot use these commands. Never guess IDs, revisions or historical paths.

All new commands use `kb source <action>`. Existing `+source-put`, `+source-rm` and whole-KB `+rollback` keep their original behavior.

## Replace a file source

```bash
ae-cli kb source replace --name "<name>" --scope personal --id <source-id> \
  --source-type file --expected-revision <contentRevision> --file ./revised.md --dry-run

ae-cli kb source replace --name "<name>" --scope personal --id <source-id> \
  --source-type file --expected-revision <contentRevision> --file ./revised.md
```

- Sends multipart `PUT /agent/api/external/knowledge-bases/sources/<id>/raw?name=...&scope=...` with `file` and `expectedRevision`.
- Different filenames are allowed, but the extension must match the current source's format. The host enforces this against the actual source. A `.pdf` cannot replace `.md`; ZIP cannot replace an ordinary file.
- At most 50 MB. Supported ordinary extensions: `.md`, `.markdown`, `.txt`, `.csv`, `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`, `.svg`.
- Updates the existing source draft immediately, preserving source ID, display name and raw path. Response `kind=mutation` reports the actual outcome and current revision; identical content may return `outcome=unchanged`.
- Dry-run validates local metadata but sends no request and does not disclose file content. It cannot prove host permissions, current format, revision or archive validity.

## Replace a ZIP archive

```bash
ae-cli kb source replace --name "<name>" --scope personal --id <zip-source-id> \
  --source-type zip --expected-revision <contentRevision> --file ./revised.zip
```

Sends multipart `POST .../sources/<id>/directory/previews` with `file`, `expectedRevision`, and `mode=archive`. Only `.zip` is accepted (case-insensitive); the host validates archive contents and limits. This prepares a candidate, not a source update. Whole-archive replacement can remove children missing from the uploaded archive.

If `kind=preview` is returned, retain the `previewId` and `expectedRevision`. Read the preview pages and review additions, replacements and deletions before committing. If `kind=mutation` and `outcome=unchanged` is returned, there is nothing to commit. Do not invent a preview ID.

## Restore one source or ZIP child

```bash
# Ordinary file: restores its draft immediately.
ae-cli kb source restore --name "<name>" --scope personal --id <source-id> \
  --source-type file --version <version-number> --expected-revision <contentRevision>

# Whole ZIP: prepares a preview.
ae-cli kb source restore --name "<name>" --scope personal --id <zip-source-id> \
  --source-type zip --version <version-number> --expected-revision <contentRevision>

# One historical ZIP file: prepares a preview; copy path from +version-tree.
ae-cli kb source restore --name "<name>" --scope personal --id <zip-source-id> \
  --source-type zip --version <version-number> --expected-revision <contentRevision> \
  --path "guides/intro.md"
```

Sends `POST .../versions/<version>/sources/<id>/restore`. Ordinary files send only `expectedRevision`. ZIP sends `target=source`, or `target=file` plus `path`. ZIP directory-level restoration is not supported. A historical deleted ZIP child can be restored if its parent source still exists and the host accepts the candidate.

This restores the selected source draft from immutable published bytes; it does not create a published version, restore an unpublished intermediate draft, or roll back other sources. Ordinary-file format compatibility and all historical snapshot checks remain enforced by the host.

## Review, commit or cancel a ZIP preview

```bash
ae-cli kb source preview --name "<name>" --scope personal --id <zip-source-id> \
  --preview-id <preview-id> --limit 100
# Follow nextCursor, if present, with --cursor <nextCursor>.

ae-cli kb source commit --name "<name>" --scope personal --id <zip-source-id> \
  --preview-id <preview-id> --expected-revision <preview-expectedRevision>

ae-cli kb source cancel --name "<name>" --scope personal --id <zip-source-id> \
  --preview-id <preview-id>
```

- `preview`: `GET .../directory/previews/<previewId>`, cursor up to 4096 characters, limit 1–200. Reading a preview does not update the source.
- `commit`: `POST .../directory/previews/<previewId>/commit` with `expectedRevision` and `confirmed=true`. This can delete files and is `high-risk-write`; obtain explicit user intent, then use `--yes` for authorized non-interactive execution. It updates the draft only.
- `cancel`: `DELETE .../directory/previews/<previewId>`, expects HTTP 204 and returns `{previewId, cancelled:true}`. It discards an uncommitted candidate without changing the source. Also requires confirmation (`--yes` only after explicit authorization).
- The candidate belongs to the caller and source, has an expiry, and can be replaced by a newer preparation. Never automatically prepare or confirm another candidate after expiry, a revision conflict or an uncertain result.
- All five commands support `--dry-run`; it performs no server calls. `replace` includes local file metadata with redacted content; the others show the exact request.

After a successful draft change, re-read `+list-sources`, then run `+compile` only when requested to publish it. Historical versions remain unchanged.

## Errors and retry boundaries

Keep the structured `error.code` and `hint`. `SOURCE_CONTENT_REVISION_CONFLICT`, format mismatch, missing/expired/replaced preview, permissions and damaged historical snapshot errors must not trigger delete/re-add or whole-KB rollback fallbacks. Commands do not automatically retry writes, including authentication failures. For `COMMIT_UNKNOWN`, `UNCERTAIN`, `REVIEW_REQUIRED`, or a lost response, inspect current source revision/state and the same candidate before deciding whether another write is safe; do not report failure as proof that nothing changed.

## Transitional admission

- Transition status: transitional
- Owning module: te-claude External Knowledge Base source mutation/version APIs
- Current transport: authenticated external REST through `kbApi` / `kbUpload`, using only the standard CLI token
- Gateway target: TBD; no equivalent typed source replacement/restore capability is registered in the current backend implementation
- Review after: 2026-12-15
- Exit condition: migrate to equivalent Gateway capabilities while retaining typed file handling, revision guards, preview confirmation and stable outcomes, or remove redundant wrappers when dynamic invocation provides the same contract
