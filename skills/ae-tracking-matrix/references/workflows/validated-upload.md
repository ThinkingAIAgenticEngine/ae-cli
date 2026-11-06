# Conversation overview → delivery choice → validated delivery

## Contract and scope

The primary review surface is the **conversation**, not a download-only response. Show the complete plan in the user's language, then ask for one delivery method:

1. **Sync directly to ThinkingData Tracking Management** — use canonical JSON and `tracking.plan.save_items`; do not create a local, hidden or temporary Excel workbook.
2. **Generate a local Excel file** — only after this choice, create the complete 11-sheet XLSX from the same canonical JSON and run strict lint.

Do not generate both by default. All views and payloads derive from one normalized source. The local compatibility template retains Chinese sheet names, headers and type enums; business text and the conversation follow the user. Do not change the user's AE profile language.

This workflow implements Agent-mediated confirmation, not a new AE frontend widget. Use an available question/confirmation card or explicit text. Never display a fake HTML button. A delivery choice is not permission to delete, replace, publish skills, modify unrelated metadata or write a different project/revision.

## 1. Prepare conversation-only review

After business questions that materially affect the plan are resolved, create normalized plan JSON according to `references/plan-generation/export-schema.md` and run:

```bash
python3 scripts/prepare_delivery.py --plan work/plan.json \
  --output-dir work/delivery-r1 --language zh --conversation-only
# Use --language en for an English conversation.
```

The output directory must be new. It contains:

- `plan.normalized.json`: authoritative plan revision.
- `conversation.md`: complete review text, actual counts, event/property definitions, Notes/Timezone, TBC and two delivery options. **Display this content**, not only a link; paginate large plans without silently omitting modules.
- `validation.json`: `review_ready_delivery_choice_pending`, source/conversation fingerprints and `delivery_choice_pending: true`.
- `semantic-review.template.json`: fifteen **pending** checks, not acceptance.

There is no `plan.xlsx` and no `lint.txt`. The deterministic renderer supports Chinese and English; do not claim other languages are validated.

## 2. Review semantics before any remote write

Use `references/business-semantic-checks.md` with real requirements evidence. Keep required checks pending when context is missing; never auto-mark all checks passed. Review E1 ad-failure/revenue callback or TBC, E2 first-touch attribution, actual counts, object versus object-group, identity, reporting authority and user-update semantics.

For direct sync, also verify canonical JSON → payload parity: event names, display names, descriptions, tags, collection sides, event-property associations, common properties, user properties, types and update methods. The structured interface currently supports `user_set`, `user_setOnce` and `user_add`; the adapter stops on `user_append` rather than silently changing semantics. Collection-side values are accepted only after the deployed dry-run validates the exact payload.

## 3A. Direct structured sync — read-only preflight

Resolve the real AE project and endpoint through installed AE skills. Never default to a demo project. Maintain `.ae/cli-agent-context.json` as required, and do not store credentials in the plan or payload.

```bash
python3 scripts/sync_plan.py --delivery work/delivery-r1 \
  --project-id VERIFIED_PROJECT_ID --host VERIFIED_AE_ORIGIN \
  --preflight --output work/delivery-r1/preflight.json
```

The adapter:

- requires a conversation-only delivery and rejects any `plan.xlsx` or `lint.txt`;
- builds `sync-payload.json` directly from normalized JSON;
- inspects installed command help and `tracking.plan.save_items` identity, `write` risk and input schema at the confirmed target;
- reads the existing plan and preserves its baseline fingerprint;
- runs one dry-run on the exact payload and requires the normalized input to match;
- writes no project data during preflight.

Inspect baseline conflicts before review: same-name property types/meanings, event associations, collection-side responsibility and preservation of unrelated existing items. An auth error, timeout, missing pool or unknown response is not an empty project. Complete a NEW `semantic-review.json` bound to the source/conversation fingerprints, verified target and exact `baseline_sha256`; set passed/conflicts resolved only when true.

## 3B. Local Excel branch

Only after the user selects local Excel, generate a new workbook from the same JSON:

```bash
python3 scripts/finalize_plan.py --plan work/plan.normalized.json \
  --template assets/埋点模版.xlsx --output work/NEW_plan.xlsx
python3 scripts/lint_tracking_plan.py --input work/NEW_plan.xlsx \
  --strict-delivery --template assets/埋点模版.xlsx
```

The workbook has four data sheets plus seven unchanged instruction sheets. If repair is needed, show a diff and obtain confirmation, save to a new file, recheck read-only and synchronize approved changes back to canonical JSON/conversation. Do not overwrite originals or claim lint is semantic acceptance.

If the user later requests Excel-import upload, use the legacy guarded adapter `scripts/upload_plan.py` with its own Excel-containing delivery, strict lint, preflight and review. Its `--lang zh` applies to the Chinese workbook, independent of conversation language.

## 4. One explicit target/scope confirmation

After all relevant gates pass, show a compact confirmation in the user's language:

> **Ready to sync to Tracking Management**  
> Target: verified project name / ID and environment.  
> Revision: source fingerprint; actual event/property counts.  
> Validation: structured dry-run passed; semantic review passed; baseline conflicts resolved.  
> Effect: create/update only the displayed plan items; no deletion or replacement.  
> Options: **Confirm sync** / Continue editing / Keep local only.

An earlier “generate a plan”, “support sync”, or delivery choice is not confirmation to write a specific project/revision. Once the user explicitly confirms this displayed target and scope, run:

```bash
python3 scripts/sync_plan.py --delivery work/delivery-r1 \
  --project-id VERIFIED_PROJECT_ID --host VERIFIED_AE_ORIGIN \
  --preflight-file work/delivery-r1/preflight.json \
  --review work/delivery-r1/semantic-review.json --confirm
```

The adapter rechecks fingerprints, payload, review, capability contract and current baseline, then freezes the reviewed JSON in a private read-only snapshot. Changed artifacts or project baselines invalidate approval. `sync-attempt.json` prevents blind repeated dispatch; uncertain outcomes require readback, never automatic retry. No delete/replace action exists.

## 5. Verify persistence and provide the page link

Exit code **3** and `sync_accepted_readback_requires_review` mean the write was accepted but persistence comparison remains pending. They do not mean failure, full acceptance or permission to retry. Recognized item errors produce `sync_reported_errors_require_review`.

Inspect `sync-result.json` and compare readback against source and baseline: intended event names, property names/types, event-property associations, collection sides where exposed, display names and preservation of unrelated existing items. Do not infer persistence from `ok=true` or totals alone. If comparison passes, report synced and verified, name the project and provide the verified origin plus `/#/data/plan`. Otherwise state exactly which evidence remains pending.

For the Excel-import compatibility path, the equivalent states are `import_accepted_readback_requires_review` and `import_reported_errors_require_review`, with evidence in `upload-result.json`.

## Verification boundary for v2.0.2

Offline tests cover conversation-only output, structured payload mapping, dry-run/consent/fingerprint/baseline gates, fake-CLI dispatch and pending readback states. They do not prove live model routing, remote persistence, permissions or UI cards. Live acceptance requires an authorized target and separate explicit project-write confirmation. Historical v1.5 “12/12”, v2.0 isolated tests and v2.0.1 results must not be relabeled as v2.0.2 acceptance.
