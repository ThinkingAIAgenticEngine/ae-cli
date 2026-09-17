# Sink — resolve destination and upload

## Resolve the destination

Use the current AE CLI project commands; never guess IDs:

The logical `analysis_common +list_projects` lookup is represented by `project info list`; the
logical `analysis_meta +get_project_config` lookup is represented by `project info get` plus
`project timezone get`. Do not invent or shell-execute the legacy tool labels.

```bash
ae-cli project info list
ae-cli project info get --project-id <project-id>
ae-cli project timezone get --project-id <project-id>
ae-cli config current
```

Resolve and show the project ID/name, APPID, receiver `/sync_json` endpoint, and project/source timezone. Prefer receiver configuration returned by the project capability. If it is missing, replacing `-web-` with `-receiver-` in the active SaaS host creates only a candidate; label it unverified and ask the user to confirm it. Never upload to that candidate automatically.

## Upload

Read [sync_json upload](sync-json-upload.md). Run dry-run with the exact final flags:

```bash
ae-cli data-integration upload \
  --ue-file '<run-dir>/valid.ue.jsonl' \
  --manifest '<run-dir>/manifest.json' \
  --endpoint '<https://.../sync_json>' \
  --appid '<appid>' \
  --batch-size 500 \
  --dry-run
```

Before the confirmation gate, re-check the project's **runtime-locked** property types. A `reuse` match skips the tracking-plan step, so this check is the one that must not be bypassed on any path — repeat it for every upload:

```bash
ae-cli analysis-meta property list -p <project-id> --table-type user
ae-cli analysis-meta property list -p <project-id> --table-type event
```

Diff each target property name against `select_type` (the locked type). A same-name property whose locked type disagrees with the mapping's type drops those values silently at ingest, even when the plan layer agrees — surface any such conflict in the confirmation gate (rename the target, or change the mapped type to match the locked one) before asking the user to confirm. This is a read-only check; do not run `ae-cli tracking plan sync-from-meta` here, which writes the plan.

Show the masked target, project, file fingerprint, record count, quarantined count, batch count, and persistence limitation. Re-state the system-field mapping first (`#type`/mode, `#account_id`, `#distinct_id`, `#time` + source timezone, `#event_name`), then re-list the final property mapping for every file or sheet being uploaded — source column → target AE name → type (+ `display_name`/`desc` when set), grouped into event properties (`track`) and user properties (profile modes), with each event's attached properties listed — never a counts-only summary. For a multi-sheet workbook, group by sheet. Wait for explicit confirmation. Execute the same command without `--dry-run` only after confirmation. For a blocked manifest, first show the quarantine statistics and separately ask whether the user accepts uploading only valid rows; add `--allow-clean-subset` only after a clear yes.

`status=receiver_accepted` means receiver acceptance only, not durable storage. Say that persistence remains unverified. Never report success on this status alone.

`upload` is **not idempotent** — every execution submits to the receiver again. Never re-run the
command to inspect a response: read the first run's saved JSON output instead. `--dry-run` only
previews the request it would send; it neither executes nor previews the receiver's real response.

The execute success response reports the receiver outcome under **different field names than the
dry-run preview** — do not reuse the dry-run names (`record_count` / `batch_count`) when reading
it:

| field | meaning |
| --- | --- |
| `status` | `receiver_accepted` (or `partially_delivered` when `--retry` salvaged some records) |
| `delivery_state` | `receiver_accepted` / `partially_delivered` |
| `submitted_records` | records submitted this run (equals `record_count - resume_from` on a clean run) |
| `submitted_batches` | batches sent this run |
| `resume_from` | zero-based offset this run started at |
| `request_bytes` / `response_bytes` | transport byte counts |
| `persistence_verified` | always `false` — receiver acceptance is not durable storage |
| `next_step` | the verification guidance |

`--retry` salvage additionally reports `failed_records` / `failed_count`. A lost batch is reported
as `delivery_state=unknown` in the error's `meta`, not in the success fields — see
[sync-json-upload.md](sync-json-upload.md) "Interrupted delivery".

## Verify the data landed

Ingestion is asynchronous — expect about a 1-minute delay between `receiver_accepted` and the data being queryable. Instead of telling the user to check in the console, offer to verify with ae-cli (control-plane commands; require the CLI to be logged in to the AE host and a project-id):

```bash
# Recent received data (closest to "did it land"):
ae-cli tracking live-data list -p <project-id>
ae-cli tracking live-data list -p <project-id> --data-type error   # only errored records

# Ingestion counts over a time window (better for bulk uploads):
ae-cli tracking ingest summary -p <project-id> --start-time '<YYYY-MM-DD HH:mm:ss>' --end-time '<YYYY-MM-DD HH:mm:ss>'

# Ingest errors for one event/property name (the silent-drop detective):
ae-cli tracking ingest-error list -p <project-id> --data-name <event-or-property> --start-time '<...>' --end-time '<...>'
```

Wait about a minute after `receiver_accepted` before the first check, then re-check once if the data has not appeared. `live-data list` only returns recent data, so for large or bulk uploads prefer `ingest summary` (counts over the upload window) or an `analysis query` on the event. Report what was verified and what was not; persistence is never established by `receiver_accepted` alone.

## Continue with the next file

After the verification confirms the data landed in AE, ask whether every file has been imported. If more files remain, batch them through one inspect and one convert — repeat `--input-file` and use a wildcard mapping plus `--type-resolutions` when conflicts were reported — which produces one manifest (and one `valid.ue.jsonl`) per file. Upload is always one manifest at a time: run a separate confirmed upload for each file's `valid.ue.jsonl`. Each upload keeps accumulating into the project's event/property metadata.
