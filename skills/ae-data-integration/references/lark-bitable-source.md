# Source — online document (Feishu Bitable)

## When this branch applies

The input is a **URL**, not a local path. Feishu Bitable (多维表格 / Base) links (`/base/`), and
wiki links that resolve to a Bitable, route here instead of [source-inspect.md](source-inspect.md).
Feishu sheet links still route to [lark-sheet-source.md](lark-sheet-source.md); a `/wiki/` link can be
either, so resolve it first (Step 1) and branch on the resolved type. The pipeline is identical
after the table is snapshotted to a local JSONL: business identification, tracking plan,
transform, and sink all reuse the local-file flow unchanged.

Only **Feishu sheets** and **Feishu Bitable (多维表格)** are supported in this phase. Other online
documents (Tencent Docs, DingTalk, WPS, Google Sheets, Notion) have no CLI read path — route to
[manual-export-source.md](manual-export-source.md), which has the user export the data themselves
and then rejoins the local-file flow.

## Safety rules (online-specific)

- The URL, its token, the snapshot file path, and every record value are sensitive. Never print
  source values while inspecting; summarize types, ratios, counts, and fingerprints only.
- Pulling records to the local machine moves data across a trust boundary. Before downloading
  anything, tell the user the table will be snapshotted to a local file, and get their
  confirmation when the data is not their own.
- The snapshot is a point-in-time copy. State the export timestamp (and the base timezone the
  API reports), and note that the import reflects the exported moment only — a table that may be
  edited mid-run is imported as of the snapshot, not live.
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
   Reading a Bitable in the user's cloud space needs the **user** identity (`--as user`); the bot
   identity cannot see a user's drive documents. If the user identity is unavailable or
   unverified, follow the lark-shared skill's split-flow: start
   `lark-cli auth login --scope "<scope>" --no-wait --json`, show the QR code / link to the user,
   and only after the user confirms run `lark-cli auth login --device-code <device_code>`.
   Authorization requires the user's participation — never bypass or automate it. The Bitable
   read path needs the scopes `base:table:read`, `base:record:read`, and `base:field:read`.
3. **Handle permission errors when they occur.** If a pull returns `permission_violations`
   (missing scopes) together with `console_url` and `hint`, route by identity:
   - user identity → add the missing scope with
     `lark-cli auth login --scope "<missing_scope>"` (incremental grant);
   - bot identity → direct the user to open the scope in the developer console via the returned
     `console_url`; never run `auth login` for a bot.
   If the base itself is not accessible to the user's account — a resource-side permission
   problem, not a scope problem — ask the user to confirm the link is correct and that their
   Feishu account can open the base. Do not retry against a different base silently.

## Step 1 — Resolve the URL and locate the table

1. **Resolve the URL to a base token.** Primary (richer — returns the title and unwraps wiki
   links):
   ```bash
   lark-cli drive +inspect --url "<url>" --as user
   ```
   returns `{ok, identity: "user", data: {token, title, type, url}}`. A Bitable resolves with
   `type: "bitable"` and its base token in `token`. If `type` is not `bitable`, leave this branch
   — a sheet routes to [lark-sheet-source.md](lark-sheet-source.md). Domain-native alternative, which also
   accepts wiki and record-share links:
   ```bash
   lark-cli base +url-resolve --url "<url>" --as user
   ```
   returns `{ok, identity: "user", data: {base_token, resource_type: "bitable", input_type}}`.
2. **List the tables.**
   ```bash
   lark-cli base +table-list --base-token <base_token>
   ```
   returns `{ok, data: {tables: [{id, name, records_count, rev}], total}}`. Never guess a table
   id or name. Surface the table list to the user with each table's record count; a base with one
   table proceeds with it, multiple tables ask the user to choose, mirroring `--data-set` on a
   local workbook.

## Step 2 — Snapshot to a local JSONL

The base domain has **no workbook-export command** (only per-record reads and an attachment
downloader), so the snapshot is a **JSONL** built by paginating `+record-list` and zipping each
page into per-record objects — not an XLSX. The snapshot directory convention matches the sheet
flow: `.ae-cli/data-integration/online/<fingerprint>/snapshot.jsonl`, where `<fingerprint>` is a
short, collision-resistant name derived from the base token plus a timestamp (e.g. first 8 chars
of `sha256("<base_token>-<YYYYMMDD-HHMMSS>")`). One online source gets one directory, so a
re-export never overwrites an unrelated source. Create the directory before writing.

1. **Survey the fields** (type knowledge for the mapping step, and attachment detection):
   ```bash
   lark-cli base +field-list --base-token <base_token> --table-id <table_id>
   ```
   returns
   `{ok, data: {fields: [{id, name, type, style?, options?, multiple?, default_value?}], total}}`.
   `style` and `options` are display metadata (currency code, date format, choice list);
   `multiple` distinguishes single- from multi-select. Field-list order is NOT the record-list
   order — do not carry it across to the zip step.
2. **Paginate the records.** Always pass `--format json` explicitly — `+record-list` defaults to
   **markdown**, unlike `+table-list`/`+field-list` which already default to json:
   ```bash
   lark-cli base +record-list --base-token <base_token> --table-id <table_id> --format json
   ```
   The JSON envelope is **column-oriented**, not record-oriented:
   ```json
   {
     "ok": true, "identity": "user",
     "data": {
       "data": [["<…>", "<…>", true, 129.5, ["<…>"], ["<…>"], "<ISO8601>", ["<…>"]],
       "fields": ["<…>", "<…>", "<…>", "<…>", "<…>", "<…>", "<…>", "<…>"],
       "field_id_list": ["<…>", "…"],
       "field_type_list": ["<…>", "…"],
       "record_id_list": ["<…>", "…"],
       "has_more": true,
       "query_context": { "field_scope": "all_fields", "record_scope": "all_records" },
       "timezone": "Asia/Shanghai",
       "rev": 1,
       "total": null
     }
   }
   ```
   (`total` may be absent rather than null — see the pagination contract below.)
   `data.data` rows are positional arrays aligned with the parallel `fields`, `field_id_list`,
   `field_type_list`, and `record_id_list` arrays. Pagination contract (verified):
   - `--offset` is a 0-based row skip; start at 0.
   - `--limit` is 1–200 (default 100).
   - After each page, advance `offset` by **the number of rows returned**, not by `limit` — a
     short final page must not skip rows.
   - Loop until `has_more: false`. `total` is null or absent in this envelope — never use it to
     detect the end.
   - Each page's `fields` order is authoritative for **that page**. Field-list order ≠
     record-list order, and `--field-id` projection re-aligns the parallel arrays — always zip
     with the `fields` array from the same response.
3. **Zip each page into per-record objects.** The flat snapshot reserves `__record_id` for the
   stable ID returned by the Bitable API. Record `i` becomes
   `{ __record_id: record_id_list[i], fields[j]: data[i][j] for each j }`. A business field named
   `record_id` remains an ordinary source column. If the table itself contains a business field
   named `__record_id`, stop before writing any snapshot instead of overwriting either value or
   silently renaming the user's field. Reference implementation (paginates, zips, writes
   `snapshot.jsonl`, prints a summary only — no record values):
   ```javascript
   import { execFileSync } from "node:child_process";
   import { mkdirSync, writeFileSync } from "node:fs";
   import path from "node:path";

   const [baseToken, tableId, outDir] = process.argv.slice(2);
   mkdirSync(outDir, { recursive: true });

   function fetchPage(offset) {
     const stdout = execFileSync(
       "lark-cli",
       ["base", "+record-list", "--base-token", baseToken, "--table-id", tableId,
        "--offset", String(offset), "--limit", "200", "--format", "json"],
       { encoding: "utf8", timeout: 120_000,
         env: { ...process.env,
                LARKSUITE_CLI_NO_UPDATE_NOTIFIER: "1",
                LARKSUITE_CLI_NO_SKILLS_NOTIFIER: "1" } }
     );
     return JSON.parse(stdout);
   }

   const RECORD_ID_KEY = "__record_id";
   let offset = 0; const records = []; let meta = null;
   while (true) {
     const envelope = fetchPage(offset);
     if (!envelope.ok) { console.error("record-list failed:", JSON.stringify(envelope.error ?? envelope)); process.exit(1); }
     const d = envelope.data;
     const rows = d.data ?? [], ids = d.record_id_list ?? [], fields = d.fields ?? [];
     if (rows.length !== ids.length) { console.error(`row/id length mismatch: rows=${rows.length} ids=${ids.length}`); process.exit(1); }
     if (fields.includes(RECORD_ID_KEY)) { console.error(`reserved field name collision: ${RECORD_ID_KEY}`); process.exit(1); }
     for (let i = 0; i < rows.length; i++) {
       const rec = { [RECORD_ID_KEY]: ids[i] };
       for (let j = 0; j < fields.length; j++) rec[fields[j]] = rows[i][j];
       records.push(rec);
     }
     meta = { timezone: d.timezone, rev: d.rev, total: d.total, fieldNames: fields };
     if (!d.has_more) break;
     offset += rows.length;
   }

   const outPath = path.join(outDir, "snapshot.jsonl");
   writeFileSync(outPath, records.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
   console.log(JSON.stringify({ snapshotPath: outPath, records: records.length,
     fieldCount: meta.fieldNames.length, fieldNames: meta.fieldNames,
     timezone: meta.timezone, rev: meta.rev, totalReported: meta.total }));
   ```
   Optional scoping flags (all verified; default is all records, all fields): `--field-id
   <name|id>` (repeatable) projects to specific fields; `--view-id` reads a specific view;
   `--filter-json` overrides the view's own filter, e.g.
   `{"logic":"and","conditions":[["Title","==","Launch plan"]]}` (equality),
   `[["Title","intersects","urgent"]]` (contains), `[["Score","==",95]]` (numbers unquoted);
   `--sort-json` (max 10 rules) overrides the view's sort, e.g.
   `[{"field":"Updated","desc":true}]`.

   Field-type mapping and value shapes in the snapshot:

   | Bitable field type | `--format json` value shape | Downstream `inspect` inference |
   | --- | --- | --- |
   | text, `style.type: plain/phone/email/barcode` | string | string |
   | text, `style.type: url` | **markdown link** `[display](url)`, not the raw URL | string — the markdown wrapper is part of the value |
   | number (plain/currency/progress/rating; `style` is display-only) | plain number | number |
   | checkbox | boolean | boolean |
   | select, `multiple: false` (single-select) | **single-element array** (e.g. `["paid"]`) | **`list`**, not string |
   | select, `multiple: true` (multi-select) | array of strings; **empty selection is `null`, not `[]`** | `list` (empty rows counted as missing) |
   | datetime (any `style.format`) | full ISO8601 string with offset; envelope `timezone` states the base timezone | datetime |
   | created_at / updated_at | full ISO8601 string | datetime |
   | auto_number | string (e.g. `NO.001`) | string |
   | created_by / updated_by | array of `{id, name}` user objects (single-element for one creator) | `list` |
   | location | object `{lng, lat, full_address}` | json/object |
   | link | array of `{id}` record refs (single-element for one link) | `list` |
   | attachment | `null` when empty (verified); non-empty values are out of scope | all-null column |
   | formula | **always a string, even for numeric results** (e.g. `"20"`) | string |
   | lookup | data-dependent: scalar string for a single `raw_value` match; list for multiple matches or a list aggregate | string or list |

   Warnings the mapping step must carry:

   - single-select columns infer as `list` (not `string`) because Bitable returns single-element
     arrays — surface this when the user confirms the mapping.
   - `created_by` / `updated_by` are **single-value** fields the API wraps in a one-element array
     of `{id, name}` user objects — surface this when the user confirms the mapping, and do not
     treat them as multi-value. The `id` is a Feishu open_id/user_id, not an AE identity; these
     are audit metadata. Default to excluding them, or import only `name` as a plain `string`
     property (after confirming with the user); do not map them to a `list` or an `{id, name}`
     `object` unless the user explicitly asks. A custom **person** field is different:
     single-person fields wrap the same way, multi-person fields are genuinely multi-value —
     confirm which before mapping.
   - `link` (single-link) columns infer as `list` because the API wraps a single link in a
     one-element array of `{id}` record refs — surface this when the user confirms the mapping,
     and do not treat them as multi-value. The `{id}` is the linked record's internal
     `record_id`, not a business value: exclude the column, or flatten the linked record's real
     fields via a `lookup`/`formula` on the source table instead of importing record_ids.
     A multi-link field returns multiple `{id}` refs per row; `+field-list` exposes no
     `multiple` flag for link fields, so distinguish single from multi by the value array
     length across rows, not by a field-list property.
   - `location` columns are objects `{lng, lat, full_address}` — mapping the whole column locks
     an `object` property type. Usually only `full_address` (a plain string) is meaningful;
     confirm whether to flatten it to that single string (or exclude) rather than default to
     `object`.
   - an empty multi-select is `null` (verified), so `inspect` counts those rows as missing — a
     null multi-select is "no selection", not data loss.
   - `url`-styled text fields come back as markdown links (`[display](url)`), not raw URLs —
     strip the wrapper (or re-key from a plain text field) before mapping to a URL property.
   - formula fields are always strings in the snapshot, even when the expression is numeric
     (e.g. `"20"`) — inspect infers `string`; do not expect a number column.
   - lookup value shape depends on the aggregate, the target field type, and the match count —
     a lookup to a person field returns `{id, name}` objects, to a select field returns option
     strings (possibly a list), to a scalar text/number field returns a scalar string or list —
     so confirm the target field type per-table before mapping.
   - attachment fields are kept as an all-null column when empty; downloading attachments
     (`base +record-download-attachment`) is out of scope for ingestion.
4. If pagination fails on a network error or times out mid-loop, treat the snapshot as unknown:
   do not write or keep a partial file; stop, and ask the user to confirm the base state before
   retrying — the same rule as a lost upload batch.

## Step 3 — Rejoin the local-file pipeline

Feed the snapshot as a local file and continue at [source-inspect.md](source-inspect.md):

```bash
ae-cli data-integration inspect --input-file '.ae-cli/data-integration/online/<fingerprint>/snapshot.jsonl'
```

The zip step prefixes each record with reserved `__record_id` — a stable per-record key from the
Bitable API, useful as a dedup key downstream. A source `record_id` column remains intact; a source
`__record_id` column blocks snapshot creation as a reserved-name collision. Expect the Step 2
inference notes to show up here: single-select columns surface as `list`, empty multi-selects as
missing rows. Everything downstream — business identification, tracking plan, transform, sink —
is unchanged. The snapshot lives under
`.ae-cli/data-integration/`, so [reuse](reuse.md) and [handoff](handoff.md) find it like any other
pipeline artifact; record in the handoff that the source was an online Feishu Bitable, the base
and table, and include the snapshot timestamp and base timezone.

## Error classification

The three pipeline classes in [error-handling.md](error-handling.md) are about rows, files, and
programs. Online-source problems land outside those three and must not be mislabeled as them:

| Problem | Class it is NOT | What to do |
| --- | --- | --- |
| `lark-cli` not installed | Not a parse error, not a data problem | Stop; give the install command |
| lark-cli not logged in / no user identity | Not a parse error | Split-flow authorization with the user |
| Missing scope (`permission_violations`) | Not a parse error | Incremental `auth login --scope` (user) or developer console (bot) |
| Base/table not accessible to the user's account | Not a scope problem | Ask the user to verify the link and their access |
| `+record-list` network failure / timeout mid-pagination | Same rule as a lost upload batch | Treat the snapshot as unknown; stop and confirm |
