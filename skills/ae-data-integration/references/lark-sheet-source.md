# Source — online document (Feishu sheet)

## When this branch applies

The input is a **URL**, not a local path. Feishu sheet links (`/sheets/`), spreadsheet links
(`/spreadsheets/`), and wiki links that resolve to a sheet (`/wiki/`) all route here instead of
[source-inspect.md](source-inspect.md). The pipeline is identical after the sheet is snapshotted
to a local XLSX: business identification, tracking plan, transform, and sink all reuse the
local-file flow unchanged.

Only **Feishu sheets** and **Feishu Bitable (多维表格)** are supported in this phase. Bitable links
(`/base/`) — including wiki links that resolve to a Bitable — route to
[lark-bitable-source.md](lark-bitable-source.md) instead of this page. Other online documents
(Tencent Docs, DingTalk, WPS, Google Sheets, Notion) have no CLI read path — route to
[manual-export-source.md](manual-export-source.md), which has the user export the file themselves
and then rejoins the local-file flow.

## Safety rules (online-specific)

- The URL, its token, the snapshot file path, and every cell value are sensitive. Never print
  source values while inspecting; summarize types, ratios, counts, and fingerprints only.
- Pulling a sheet to the local machine moves data across a trust boundary. Before downloading
  anything, tell the user the sheet will be snapshotted to a local file, and get their
  confirmation when the sheet is not their own data.
- The snapshot is a point-in-time copy. State the export timestamp, and note that the import
  reflects the exported moment only — a sheet that may be edited mid-run is imported as of the
  snapshot, not live.
- lark-cli (Feishu) and ae-cli (AE) are two separate credential domains. Read Feishu with
  lark-cli; upload to AE with ae-cli. Never forward a token from one to the other, and never
  send an AE access token or CLI token to any Feishu endpoint.

## Step 0 — Environment self-check (before any pull)

The Feishu read path depends on `lark-cli`, a CLI separate from ae-cli. Check it up front so a
missing install or a missing login surfaces as an environment problem, not as a data problem
mid-pipeline.

1. **Detect lark-cli.** Run `lark-cli --version`. If the command is not found, stop and tell the
   user to install it (`npm i -g @larksuite/cli`). Do not attempt to install it yourself, and do
   not fall back to another read path — a half-provisioned Feishu client produces worse failures
   than a clear "not installed" stop.
2. **Check the login.** Run
   `LARKSUITE_CLI_NO_UPDATE_NOTIFIER=1 LARKSUITE_CLI_NO_SKILLS_NOTIFIER=1 lark-cli auth status --json --verify`.
   Reading a sheet in the user's cloud space needs the **user** identity (`--as user`); the bot
   identity cannot see a user's drive documents. If the user identity is unavailable or
   unverified, follow the lark-shared skill's split-flow: start
   `lark-cli auth login --scope "<scope>" --no-wait --json`, show the QR code / link to the user,
   and only after the user confirms run `lark-cli auth login --device-code <device_code>`.
   Authorization requires the user's participation — never bypass or automate it.
3. **Handle permission errors when they occur.** If a pull returns `permission_violations`
   (missing scopes) together with `console_url` and `hint`, route by identity:
   - user identity → add the missing scope with
     `lark-cli auth login --scope "<missing_scope>"` (incremental grant);
   - bot identity → direct the user to open the scope in the developer console via the returned
     `console_url`; never run `auth login` for a bot.
   If the sheet itself is not accessible to the user's account — a resource-side permission
   problem, not a scope problem — ask the user to confirm the link is correct and that their
   Feishu account can open the sheet. Do not retry against a different sheet silently.

## Step 1 — Locate the workbook and sheets

1. Run `lark-cli sheets +workbook-info --url "<url>"` to list the sheets (`sheet_id`, `title`,
   `row_count`, `column_count`, `is_hidden`). Never guess a sheet id or the name `Sheet1`.
2. Surface the sheet list to the user. A workbook with one visible sheet proceeds with it;
   multiple sheets ask the user to choose, mirroring `--data-set` on a local workbook. Report any
   hidden sheet (`is_hidden`) by name — it is usually scratch space or a superseded draft, and
   the same "ask before reading a hidden sheet" rule as a local XLSX applies. (`inspect` already
   excludes hidden sheets from discovery, listing them under `excluded_sheets` with reason
   `hidden` — name them anyway rather than relying on silent exclusion.) Show each sheet's row
   count and, when available, its time coverage so an overlapping or derived sheet is visible
   before it is chosen.

## Step 2 — Snapshot to a local XLSX

Export the workbook to an XLSX under the pipeline's working directory (a cwd-relative path, so
lark-cli's file-path rules accept it):

```bash
lark-cli sheets +workbook-export --url "<url>" --output-path ".ae-cli/data-integration/online/<fingerprint>/snapshot.xlsx"
```

- **Export the whole workbook as XLSX**, not CSV: the XLSX export preserves dates, numbers,
  merged cells, and hidden rows, so the downstream XLSX reader (date-cell detection, merged
  cells, hidden rows) and the type inference behave exactly as for a local file. One caveat
  (verified): the export keeps a formula's text but **drops the cached computed result**, so a
  formula cell reads as missing — `inspect` flags it with a warning naming the affected columns
  ("a formula whose last computed result is not stored in the file"). Surface that warning when
  the source sheet contains formulas; the skill never evaluates a formula or guesses its value.
  Do **not** use `+csv-get` for the snapshot — its display values round long numbers to
  scientific notation (`1.04E+14`) and flatten types, which would silently corrupt ID-like
  columns and lock wrong property types in AE.
- `<fingerprint>` is a short, collision-resistant name derived from the spreadsheet token plus a
  timestamp (e.g. first 8 chars of the token hash + `YYYYMMDD-HHMMSS`). One online source gets
  one directory, so a re-export never overwrites an unrelated source. Create the directory before
  exporting.
- The export is an async job with built-in polling. If it returns `timed_out=true`, resume with
  its `next_command` rather than re-exporting blindly.
- If the export fails on a network error or times out mid-job, treat the snapshot as unknown:
  stop, and ask the user to confirm the sheet state before retrying — the same rule as a lost
  upload batch. Never resume a half-written snapshot silently.

## Step 3 — Rejoin the local-file pipeline

Feed the snapshot as a local file and continue at [source-inspect.md](source-inspect.md):

```bash
ae-cli data-integration inspect --input-file '.ae-cli/data-integration/online/<fingerprint>/snapshot.xlsx'
```

When the exported workbook holds multiple sheets, pass `--data-set '<chosen-sheet>'` using the
sheet the user picked in Step 1 — the downstream multi-sheet selection is answered by the same
choice, not re-asked.

Everything downstream — business identification, tracking plan, transform, sink — is unchanged.
The snapshot lives under `.ae-cli/data-integration/`, so [reuse](reuse.md) and
[handoff](handoff.md) find it like any other pipeline artifact; record in the handoff that the
source was an online Feishu sheet and include the snapshot timestamp.

## Error classification

The three pipeline classes in [error-handling.md](error-handling.md) are about rows, files, and
programs. Online-source problems land outside those three and must not be mislabeled as them:

| Problem | Class it is NOT | What to do |
| --- | --- | --- |
| `lark-cli` not installed | Not a parse error, not a data problem | Stop; give the install command |
| lark-cli not logged in / no user identity | Not a parse error | Split-flow authorization with the user |
| Missing scope (`permission_violations`) | Not a parse error | Incremental `auth login --scope` (user) or developer console (bot) |
| Sheet not accessible to the user's account | Not a scope problem | Ask the user to verify the link and their access |
| Export job timed out / network lost | Same rule as a lost upload batch | Treat the snapshot as unknown; stop and confirm |
