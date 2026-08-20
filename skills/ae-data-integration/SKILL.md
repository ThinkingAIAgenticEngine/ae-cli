---
name: ae-data-integration
description: "Bring local CSV, TSV, TXT, JSON, JSONL (NDJSON), XLS, and XLSX files into AE end-to-end: identify the source's business meaning, generate and confirm a tracking plan, transform rows into UE records, and upload. Also supports privacy-preserving local analysis and handing a small file to AE Agent. Use whenever a user wants to import offline/local data into AE or analyze a file without uploading it."
---

# AE Data Integration

Turn local/offline files into AE data through one fixed pipeline of four submodules: **Source → Tracking plan → Transform → Sink**. A file is never uploaded merely because it is present: its business meaning is understood, confirmed once by a human, and only then ingested. The tracking plan is generated and confirmed **before** ingestion (data governance shift-left) — see [references/tracking-plan.md](references/tracking-plan.md).

Two entrances lead here: the AE Agent dialog (attach / plus-button upload) and `ae-cli`. Two sink paths exist: RESTful API for one-time/small loads (current phase), and LogBus / DataX for recurring/high-volume loads (next phase). Source and Sink are pluggable — adding one does not change the main pipeline.

## Mandatory safety rules

- Treat file paths, receiver endpoints, APPIDs, mappings, generated artifacts, and raw rows as sensitive.
- Do not print source values while inspecting. Summarize types, ratios, counts, warnings, and fingerprints only.
- Inspect samples are bounded but still sensitive. Summarize them; never paste raw sample values into a chat summary.
- Do not invent account IDs, distinct IDs, event times, event names, projects, APPIDs, receivers, or timezones.
- `value_mapping` and `random_pool` are explicit user decisions. Never invent them.
- Never auto-fill a missing time for `track`/`track_*` rows. A missing time on user-profile rows may be filled with the current time only by setting `missing_time: 'now'` and only after the user explicitly confirms it.
- Do not read or send an AE access token or CLI token to `/sync_json`. The receiver request uses only APPID and UE data.
- Never execute `data-integration upload` until the user has seen the target, mapping, valid/quarantined counts, batches, and dry-run and has explicitly confirmed that upload.
- A blocked manifest requires a second, explicit clean-subset decision. Never add `--allow-clean-subset` implicitly.
- If a batch times out or loses the network, treat that batch as unknown. Stop. Ask the user to verify receiver/AE data before the user chooses `--resume-from`; never resume automatically.
- Local analysis stays local. AE Agent attachment is a separate, confirmed branch with a 50 MB per-file limit.

## Workflow

Walk the four submodules in order. Each submodule is its own reference; follow it and come back here for the next step.

1. **Source — business identification.** Read [references/source-inspect.md](references/source-inspect.md). Profile every file fully, infer its business meaning using business-doc / user-prompt priors, then pick a branch via [references/ue-routing.md](references/ue-routing.md).
2. **Reuse check.** If a `.ae-data-integration/index.json` exists and the profile is `ue_eligible`, read [references/reuse.md](references/reuse.md) and match the recommended mapping against the handoff index. A match proposes a frozen package; after one explicit confirmation, run the returned `transform.mjs` command and jump to Sink (step 5). No match → continue.
3. **Tracking plan.** Read [references/tracking-plan.md](references/tracking-plan.md). Generate the event/property plan from the profile and get a single explicit confirmation from the user before touching data. The plan is a separate, required deliverable from the transform mapping: a user who supplies a column→field mapping directly has **not** completed this step, so build the plan from the confirmed mapping anyway. `user_set` still requires a plan (no events; every property becomes a user property). This step runs for **every** file: a second or later file merges its new events and properties into the existing project plan (tracking-plan.md step 4) — an existing plan is never a reason to skip it.
4. **Transform.** Read [references/transform.md](references/transform.md). Map columns to AE system fields and properties, convert, and quarantine dirty rows per [references/ue-mapping.md](references/ue-mapping.md).
5. **Sink — upload.** Read [references/sink-upload.md](references/sink-upload.md). Resolve the destination, dry-run, confirm, then upload per [references/sync-json-upload.md](references/sync-json-upload.md). `receiver_accepted` is not persistence: after a ~1-minute ingestion delay, verify the data landed with ae-cli (`tracking live-data list` / `tracking ingest summary` / `tracking ingest-error list`) rather than telling the user to check the console.
6. **Handoff.** Read [references/handoff.md](references/handoff.md). Export the reusable package (frozen mapping + transform script + plan reference) so the next same-shape file skips the full pipeline.

## Local analysis branch

When UE prerequisites fail, the file is an aggregate/analytical table, or the user wants analysis rather than ingestion, use [references/local-analysis.md](references/local-analysis.md) instead of the ingest pipeline.

## Optional AE Agent attachment handoff

Offer this only when the user asks to continue in AE Agent. Explain that the file leaves the local machine and ask for explicit privacy confirmation.

- Reject files over 50 MB; suggest local analysis or user-controlled splitting.
- Read the `ae-agent` `+add-attachment` reference before calling it.
- Dry-run first, show file name/type/size, and wait for confirmation.
- Then run `ae-cli agent +add-attachment --file '<path>'`.
- Return the attachment result, a copyable analysis prompt, and directions to open AE Agent.
- Do not create or execute an Agent conversation.

## Completion response

State which submodules ran, source fingerprint and selected data set, the tracking plan status, generated artifact paths, mapping confidence, valid/quarantined counts, and upload/attachment status. Keep facts separate from recommendations and clearly state whether persistence was verified.
