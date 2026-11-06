# Tracking Assistant Evaluation Case Set (eval-cases)

> v2.0.2 acceptance specification, not a pass certificate. Historical checkmarks were case registrations, not proof that this version passed. Automated business-semantic scoring (A6) is pending engineering; the [15 semantic checks](business-semantic-checks.md) are manual/model-assisted.
> Historical evidence: read-only audit and 2026-10-28 isolated v2.0 regression report (glm-5.3, personal copy, simplified prompt). Those results do not prove company deployment or v2.0.2 runtime behavior. Delivery-choice and structured-sync acceptance require new runs.

## Case Overview and Evidence Boundaries

| # | Scenario | v2.0 isolated result (2026-10-28) | v2.0.2 runtime status |
|---|---|---|---|
| E1 | Match-3 / WeChat / IAA / no account | Partial: final 28 events, 11 sheets, lint passed after repair; missing ad_fail and callback/TBC | Not run |
| E2 | SLG / IAP / multi-role / Korea | Partial: final 53 events; first_* mismatch, English-to-Chinese drift and first-run lint failures | Not run |
| E3 | Card | Partial: final 42 events; first-run 181 E09 errors | Not run |
| E4 | Merge | Passed isolated v2.0: 25 events, 90 event-property rows, 6 common and 11 user properties | Not run |
| E5 | Livestream voice chat | Partial: final lint passed after type mapping | Not run |
| E6 | Jingchuan file increment + review | Blocked: original attachment unavailable | Not run; original attachment required |
| E7 | Project 9 cloud adjustment | Read-only/dry-run only; no real save/delete/change-log closure | Not run; separate scoped authorization required |

- **D1 routing**: three historical first-call routes (English review, Chinese troubleshooting, code generation) passed in the isolated v2.0 environment. Language/counting deviations still existed. D1 is not the seven-case content acceptance.
- **Seven cases (E1–E7)**: track first-run lint separately from repaired-final lint, per-case business semantics, language and evidence. Never collapse partial/skipped/dry-run into pass.
- **C5 non-owner permissions**: the historical test passed visibility/read/runtime for existing **company v1.5**, not company v2.0 or v2.0.1. New company deployment and post-deployment C5 remain untested.
- Record package version/hash, model, original vs simplified system prompt, environment/scope, case input, first/final lint results, actual event count, artifact/evidence and remaining gaps for each new run.

## General Validation Points (each "from-scratch generation" case must pass)

| Dimension | Validation Point | Pass Criterion |
|---|---|---|
| Format | Complete 11 sheets | 4 data + 7 instruction; instruction sheets are unchanged |
| Format | Styles inherit template | Deep-blue header #2F75B5, no fill in body, borders, merged cells |
| Naming | Display names unique per validation domain | Event+common share a domain; user properties independent; semantic cross-domain conflicts reviewed separately |
| Naming | `#` preset properties not in custom tables | lint E01 does not report "#xxx invalid" |
| Naming | Standard verb suffixes | No forbidden forms like `_receive` / `_success` |
| Validation | First-run strict lint passes | Run `--strict-delivery --template assets/埋点模版.xlsx`; record actual exit/output and first-run vs repaired-final results separately |
| Validation | Semantic review | All 15 manual/model-assisted items have evidence; no pending required item, no claim of automatic scoring |
| Delivery | Choice and source parity | Reviewable online plan shown first; user then chooses direct structured sync or local Excel. Sync creates no workbook; Excel supplies complete 11 sheets only after selection. Actual distinct event counts agree with the canonical JSON, not property rows |
| Language | Follow the user's language | Route opening, questions, review and authored business descriptions follow user language; Chinese template labels/types unchanged, not an all-English workbook |
| Interaction | Scoped confirmation | Ask only missing high-impact facts; explicit repair-before-save-as and one later validated-upload confirmation cannot be skipped for a turn-count target |
| Speed | No Feishu calls | lark-cli calls = 0 for locally cached categories |
| Discovery | Bounded official discovery | Prefer known local paths; targeted `--help` or capability discovery + `inspect` when contract is unknown; never guess fields or repeat probes indefinitely |
| Upload | No automatic or destructive upload | New validated-upload workflow; no implicit delete/overwrite, no invented UI button, verify persistence beyond success envelope |

## Case Highlights

### E1 Match-3 (WeChat Mini Game · IAA · no account)
- Input: "Create a tracking plan for a Match-3 casual game"
- Key fields: stages (level_start/success/fail), ads (ad_show/complete/reward/fail), stamina, items
- Validation points: explicit `ad_fail` and complete IAA chain, confirmed `openid` guest-ID strategy, no-account `account_id` null not automatically High, unavailable ad revenue labelled requires ad-platform callback / TBC. No invented callback. Verify actual event count and language in both views.

### E2 Jiu Mu Zhi Ye SLG (Three Kingdoms · IAP · single account multi-role · Korea)
- Input: "Create a Three Kingdoms SLG tracking plan"
- Key fields: Hero progression / City building / Alliance behavior / War battle / Payment five-tier + AppFlyer attribution
- Validation points: single-account multi-role ID system (`#account_id = role_id`, account ID stored as user property), alliance war active/passive sides emit a single event, attribution fields `first_media_source` / `first_campaign`

### E3-E5 Card / Merge / Livestream Voice Chat
- Validation points: after category-template hit, read local cache (0 Feishu); naming precheck in effect; lint passes on first run.

### E6 Jingchuan Project Adds User-Acquisition Fields (incremental · file-upload path)
- Input: "Add user-acquisition tracking to this plan + audit the existing plan" (uploads `Jingchuan_tracking_plan_20260422.xlsx`)
- Validation points: read original xlsx attachment → add user-acquisition fields (`media_source` / `campaign` / `revenue_value`) → fix lint errors → output new xlsx + diff list without overwriting the original.

### E7 Project 9 Cloud Adjustment (incremental · cloud path)
- Input: "Add event X and deprecate event Y in Project 9's tracking plan"
- Validation points: discover official current read/write/delete contracts → read actual existing baseline → naming/type and semantic conflict check → separately scoped authorization for any actual add/update and deletion → execute only authorized actions → read-back and real change-log evidence. E7 deletion is not bundled into one-click upload; no hard-coded project 9 default or guessed capability fields. A dry-run cannot close this full case.

## Local Test Gate vs Runtime Acceptance

Run the maintained local suite with `python3 -m unittest discover -s tests -v` in the package root, and record its actual output/exit code with the release. `tests/test_package_contracts.py` checks the 29-md inventory, registry paths, curated-catalog preservation/new-file safety, shared semantic-review IDs and documentation contracts; it does not execute remote commands or certify business semantics.

The other local suites cover their stated generator/lint/upload-adapter contracts. A fake CLI, synthetic fixture or local render test is not E1–E7 runtime acceptance, D1 original-systemPrompt routing, C5 company deployment permissions, D4 real dual-side dedup, or proof of a native UI button. Keep these evidence classes separate. Required runtime re-tests remain **Not run** until an authorized real run supplies evidence.

## Cases To Supplement (need engineering / real scenarios)

- D4 dual-side dedup: needs a real "client + server dual-report" project to validate `#uuid` dedup and authoritative report point.
- A1 multi-attachment: once engineering fixes the bug, add a "two attachments uploaded together, both recognized" case.
- A5 mounting custom skill: once the capability is opened, add a "plan picks up business context after customer injects a business skill" case.
