# Source — online document, manual export (Tencent Docs / DingTalk / WPS)

## When this branch applies

The input is a **URL** that points to an online document on a platform other than Feishu:
Tencent Docs (`docs.qq.com`), DingTalk docs, WPS / Kingsoft Docs (`kdocs.cn`), Google Sheets,
Notion, and the like. These platforms have **no CLI read path** in this phase — only Feishu has
one, via lark-cli (see [lark-sheet-source.md](lark-sheet-source.md) and
[lark-bitable-source.md](lark-bitable-source.md)). There is therefore no automatic snapshot here:
the user exports the document to a local file themselves, and the pipeline rejoins at the
local-file flow unchanged.

## Safety rules

- The URL and every exported cell value are sensitive. Never print source values while
  inspecting; summarize types, ratios, counts, and fingerprints only.
- The export is a point-in-time copy made by the user on the source platform. State the export
  timestamp, and note that the import reflects the exported moment only — a document edited
  mid-run is imported as of the export, not live.
- The export is the user's own action on the source platform. Do not automate it, and do not ask
  for that platform's credentials — there is no Feishu-style OAuth to run on this branch.

## Step 1 — Recognize the platform and route

Inspect the URL's host to confirm it is not Feishu. Feishu hosts (`feishu.cn`, `larksuite.com`)
route to the two lark source pages instead of this one; any other online-document host
(`docs.qq.com`, `kdocs.cn`, a DingTalk docs host, etc.) lands here. If the host is ambiguous,
ask the user which platform the link belongs to rather than guessing.

## Step 2 — Guide the user to export

Ask the user to export the document from the source platform's own UI to a local file, and to
name the file so its origin is traceable. Give only the general route — the exact menu labels
differ by platform and change over time, so follow the platform's current export UI rather than a
memorized click path:

- open the document, then use the platform's export / save-as / download action;
- choose **XLSX** (Excel workbook) where offered, not CSV — CSV flattens types, may round long
  ID-like numbers to scientific notation, and loses multiple sheets. This is the same reason the
  Feishu sheet flow snapshots XLSX, not CSV (see
  [lark-sheet-source.md](lark-sheet-source.md));
- if the platform only offers CSV, accept it but flag the type-flattening risk to the user, and
  watch for ID-like columns that must stay text;
- ask the user to place the file under the pipeline's working directory (e.g.
  `.ae-cli/data-integration/manual/<fingerprint>/<name>.xlsx`) so [reuse](reuse.md) and
  [handoff](handoff.md) find it like any other pipeline artifact.

Export-time caveats to surface to the user — platform-dependent, and the same rules as a local
file:

- **multiple sheets** — the export may contain several sheets; confirm which one is the data set,
  mirroring `--data-set` on a local workbook.
- **formulas** — an exported formula cell may carry only its text, not the cached computed result;
  `inspect` flags such cells as missing. The skill never evaluates a formula or guesses its value.
- **hidden rows/columns/sheets** — the platform may drop or keep hidden content depending on its
  export; `inspect` excludes what it can detect (hidden sheets appear under `excluded_sheets`),
  but ask the user to confirm the export contains what they expect before profiling.
- **dates / encoding** — prefer a UTF-8 export; if dates arrive as text, say so rather than
  silently coercing them.

## Step 3 — Rejoin the local-file pipeline

Feed the exported file as a local file and continue at [source-inspect.md](source-inspect.md):

```bash
ae-cli data-integration inspect --input-file '<exported-file>'
```

When the export holds multiple sheets, pass `--data-set '<chosen-sheet>'` using the sheet the
user picked in Step 2. Everything downstream — business identification, tracking plan, transform,
sink — is unchanged. Record in the handoff that the source was a manually-exported online
document, name the platform and the export timestamp, and include the exported file path.

## Error classification

The three pipeline classes in [error-handling.md](error-handling.md) are about rows, files, and
programs. Manual-export problems land outside those three and must not be mislabeled as them:

| Problem | Class it is NOT | What to do |
| --- | --- | --- |
| Platform only exports CSV; types flatten | Not a parse error | Flag the risk; watch ID-like columns |
| Export is missing sheets / rows the user expects | Not a data problem yet | Ask the user to re-export or confirm the data set |
| URL host is unrecognized and not Feishu | Not a routing failure | Ask the user which platform the link belongs to |
