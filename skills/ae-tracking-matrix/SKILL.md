---
name: "ae-tracking-matrix"
description: "MANDATORY ENTRY POINT for any tracking-related work — invoke this skill FIRST, before reading any tracking plan file, querying any tracking data, or producing any tracking analysis. Applies to generate, audit, review, optimize, increment/supplement, adjust, Q&A, data verification, troubleshooting (an event has no data / stopped reporting / data looks wrong), and TRACKING CODE GENERATION — requests like 'give me Android/iOS/Unity tracking code' or 'how do I write tracking code' MUST enter here first; this skill runs the four-step identification and then routes to the code-generation execution skill, so naming pre-checks and plan-consistency rules apply. Do NOT invoke execution skills (code generation, plan generation, verification) directly from the user request, and do NOT open tracking xlsx files with openpyxl/pandas or start ad-hoc log/file spelunking, before loading this skill. It holds the canonical naming dictionary, object-group validation rules, 29 category Markdown assets (including partial/shared caches), the no-data diagnosis flow, and the lint script that catches TE platform-import failures — none available outside this package, so ad-hoc work misses import-blocking issues and blind alleys. Costs 1-2 extra turns but prevents invalid plans and misdiagnosis. Trigger words: tracking, tracking plan, event design, tracking audit, tracking review, tracking optimization, supplement, increment, SDK tracking, tracking code, code generation, integration code, data verification, PRD, troubleshoot, diagnose, no data, missing data, event not reported."
---

# Tracking Matrix · Identification + Routing Foundation

> Position: The Tracking Assistant Agent covers **generate + audit + optimize + upload**. Present a reviewable plan overview from the same canonical JSON in the conversation first, then ask the user to choose **direct structured sync to Tracking Management** or **a local 11-sheet Excel**. The sync branch creates no Excel; the Excel branch starts only after selection. After target/baseline/semantic validation, one explicit confirmation authorizes only the displayed remote scope via `references/workflows/validated-upload.md`. No automatic upload, hidden Excel intermediate, implicit deletion/overwrite, or invented UI button.
> **Language**: this skill's main text is English; all user-facing replies (including routing, questions, review and acceptance) and newly authored business descriptions follow the user's language. Template-owned Chinese sheet names, headers and type labels remain unchanged. Do not call this an all-English template.
> This SKILL.md keeps only the "identify + route" logic (≤200 lines); execution flows are offloaded into in-package workflow references (`references/workflows/*.md`), loaded by route after identification. (v2.0: the nine former execution skills were merged into this package as workflow references — routing no longer depends on separate skill descriptions; only the two system skills `ae-generate-tracking-code` and `te-user-id-debug` remain external.)

The `te-user-id-debug` handoff requires the system Skill supplied by the Agent environment; ae-cli does not install it. If it is unavailable, report the missing Skill before starting the deep investigation.

## 0. Trigger Boundary

Enter this flow when the user's request involves any of the following:

- Tracking plan: generate / optimize / audit / increment / adjust / upload
- Requirements document (PRD) → tracking suggestions
- SDK tracking code, integration, reporting Q&A and troubleshooting
- Tracking data verification (quality validation, plan acceptance — against the customer's real reported data)

- Audit/review of an existing plan counts in ALL cases — even "just take a look". Never read a tracking xlsx with openpyxl/pandas before completing the four-step identification.
- **Tracking code generation counts too** — "give me Android/iOS/Unity tracking code", "写埋点代码", "接入代码" all enter here first. After the four-step identification, this skill routes to the code-delivery execution skill (code_delivery). Never hang the code-generation skill directly from the user request: the identification step carries the naming dictionary and plan-consistency constraints that keep generated code aligned with the plan.

For unrelated requests, exit without forcing a route.

### Audit & Lint Hard Rules

- Any audit / review / optimize deliverable for an xlsx plan MUST include the machine-check section produced by `scripts/lint_tracking_plan.py` in read-only check mode. An audit reply without the lint results section is invalid and must be redone.
- Lint flow is read-only first: run the check, present findings and suggested fixes, wait for user confirmation, then write to a NEW file — never overwrite the user's original file.
- The plan_optimization dispatch table in references/scene-routing.md assigns a single owner per sub-intent; follow it, do not improvise.

## 1. Four-Step Identification Mechanism

After receiving a tracking request, execute these four steps in order, then compose them for execution.

### Step 1 · Intent Recognition (what they want to do)

Don't rely on trigger keywords alone; judge the user's action from semantics:

| Intent | Typical Phrasing | Execution Mode |
|-|-|-|
| Audit | "Take a look / check / review this plan", "Don't modify the file" | Read-only check (audit_only), outputs issue list |
| Optimize | "Help me optimize / improve this plan" | Modifies file and outputs diff list (optimize_xlsx), no upload |
| From-scratch design | "Create a tracking plan", "Design from 0" | Full generation flow (generate) |
| Incremental design | "Add 3 events to the payment module", "Add tracking for XX feature" | Design only the specified module, append to existing plan |
| Adjustment | "Change the property type of event X", "Modify event XX" | Modify + conflict check |
| Q&A | "What to do when reporting has no data", "How to integrate the SDK" | FAQ-style answer, no plan changes |
| Data verification | "Verify if data is reported correctly", "Is event X tracked properly" | Quality validation / plan acceptance against real reported data. **Data seeding and presales demo-data generation are OUT OF SCOPE for this customer-facing assistant** — customers generate their own real data via test devices / debug mode; if asked to fabricate data, decline and redirect to the verification flow |

Different intents within the same container scenario have different execution modes (e.g. in "plan optimization" scenario: audit = read-only, optimize = modify file, incremental = design only the specified module), so lock the intent before routing.

### Step 2 · Category Recognition (for whom)

Match against the 24 categories + 1 supplemented category (`interactive_video`) in `references/category-registry.md`. The 29 local Markdown assets are not 29 complete category routes; `idle_card` has a documented cache gap and uses confirmed Idle + Card composition:

- **Hit** → inject that category template's business semantics (what to track)
- **Fuzzy** → list the 2–3 closest candidates and let the user confirm; do not pick on your own
- **Missing** → design using the general spec + standard-base, and at the end of the output remind the user "this category can be deposited as a new category template"

### Step 3 · Scenario Recognition (which stage)

Match against the 6 scenario workflows in `references/scene-routing.md`:

| Scenario ID | Scenario Name | User Intent |
|-|-|-|
| demand_understanding | Requirements Understanding | PRD / requirements doc → tracking suggestion sheet |
| plan_generation | Plan Generation | 0→1 conversation overview → direct sync or optional 11-sheet Excel; confirmed remote write |
| plan_optimization | Plan Optimization | Incremental / audit / optimize, output diff list |
| code_delivery | Code Delivery | SDK samples / tracking code |
| integration_qna | Integration Q&A | SDK integration / reporting / pipeline Q&A and troubleshooting |
| data_verification | Data Verification | Quality validation / plan acceptance (customer's real data; no seeding) |

Scenario is jointly determined by "intent × input form": for the same word "plan", with an existing plan file → plan_optimization; with an empty project and a one-liner → plan_generation.

### Step 4 · Interactive Confirmation (avoid off-topic answers)

Once positioning is done and before execution, generate **differentiated key-detail questions** keyed on "intent × category × scenario" to confirm with the user.

- Principle: ask only high-impact details (questions that affect whether metrics can be computed and whether the event chain closes). Do not run a fixed 5-step confirmation.
- Example: Interactive Film Game × Plan Optimization → What's the hierarchy of the storyline chain nodes? What's the object-group structure of mail rewards? What's the attribution data source?
- When info is unclear → record as "To-be-confirmed", **do not fabricate**.

## 2. Composition and Execution

```
Cell = Category Template (what to track) × Scenario Workflow (how to track)
```

Load the corresponding workflow reference by `references/scene-routing.md` — all execution workflows live in-package under `references/workflows/`; **read the workflow file before executing, its hard rules apply**. For how to read category templates see `category-registry.md` (**prefer the local cache at `references/categories/`; for cached categories, do not go to Feishu/Lark**). When a category template is missing, use the standard-base foundation (`references/standard-base/` local cache, 12 sheets; prefer local reads).

### Naming Precheck Before Generation (mandatory before writing the plan JSON, prevents post-lint rework)

Before generating plan content, read the "Standard Event Verb Suffix Table", "Property Name — Display Name — Type Validation Matrix", and "Forbidden Synonym Table" in `references/naming-dict.md`, and cross-check each event/property as you generate:

- Within each validation domain, same property name → unique display name + type; different property names → different display names. Event + common properties share a domain, while user properties are independent. Review cross-domain meaning separately; do not claim lint enforces global cross-sheet uniqueness.
- Event names use standard verb suffixes (`_get`/`_consume`/`_click`, etc.); do not use forbidden forms
- **Names starting with `#` are system preset properties** (`#country`/`#duration`/`#ip`/`#os`/`#account_id`/`#distinct_id`, etc.), auto-collected by the SDK, **forbidden in the custom property tables** (`#事件数据`/`#公共事件属性`/`#用户数据`). When copying properties from a category template or the naming dictionary, auto-skip anything starting with `#` (this is the main source of lint error E01)
- **Object group modeling (C6)**: same parent property name with the same child-property structure → reuse one parent property; same parent property name with different structure (e.g. "Mail Reward" vs "Leaderboard Reward") → **split into two different parent properties**; do not shoehorn fields together to force isomorphism
- **Common-property judgment (E1)**: do not mechanically "promote to common property once it appears in 3+ events"; a common property must "apply to nearly all events + have a stable value at trigger time + be a globally high-frequency filter dimension", otherwise keep it as an event property (to avoid null pollution)
- **Paired events (E1)**: start/end, request/result and other paired events only need to share a **correlation key** (e.g. `stage_attempt_id`, `order_id`) + common context; the object-group structure does **not** need to be fully isomorphic
- **Dual-side deduplication (D4)**: a single business fact **keeps only one authoritative report point** (either client or server, pick one); do not split into two records just because both ends emit. When dual-side reporting is truly required, dedupe with `#uuid` or a business request ID; retries on failure reuse the same `#uuid`

This precheck reduces avoidable conflicts; only actual checks and semantic review establish whether a specific plan passes.

### Plan Output Spec (generation/optimization scenarios)

- **Conversation first, then delivery choice**: run `scripts/prepare_delivery.py --conversation-only` from canonical JSON and show the complete review, including actual counts, metric mapping, Notes/Timezone and TBC. This mode writes no `plan.xlsx` or `lint.txt`. After overview Q&A, ask the user to choose direct sync or local Excel; never default to both.
- **Direct sync, no Excel**: retain the conversation-only directory and follow `references/workflows/validated-upload.md` with `scripts/sync_plan.py`. It maps the same JSON to inspected `tracking.plan.save_items`, performs read-only baseline/dry-run checks and requires a separate explicit target/scope confirmation before writing. No hidden workbook or Excel lint is involved.
- **Excel only after selection**: generate from that same JSON with `python3 scripts/finalize_plan.py --plan <plan.json> --template assets/埋点模版.xlsx --output <NEW.xlsx>`, then run `lint_tracking_plan.py --strict-delivery` read-only. The v2.0.1 template retains 11 sheets, official Chinese nine-column event headers with `采集端` at E, and seven unchanged instruction sheets. Do not add custom sheets or overwrite inputs/outputs.
- On repair, show a diff and obtain confirmation; save to a new file and recheck. Synchronize approved changes to canonical JSON, conversation and only the selected branch artifacts. First-run failure remains visible even if repaired-final passes.
- **Discovery**: use known package paths; for unknown CLI/capability contracts use targeted `--help` or discovery + `inspect` before composing inputs. Never guess fields or loop on probes. Local lint/dry-run alone is not remote acceptance.

## 3. Cross-Cutting Concerns (across scenarios, do not occupy cells)

1. **Multi-attachment parsing**: when the user uploads multiple attachments at once, each one must be identified and listed. (Known bug A1: multi-attachment only recognizes one. Before it is fixed, manually confirm every attachment was read.)
2. **Mounting custom skills**: handled by route — Route A (cloud preset Agent) does not open this capability (A5); redirect to the cli + local agent route. Route B (cli + local agent, on-machine) **supports mounting**: drop the custom skill into `.claude/skills/` (project level or user level), then wire it up in one of three places — `category-registry.md` / `scene-routing.md` / project `CLAUDE.md` (category route / scenario route / global constraint) — declaring when the skill must be loaded.
3. **Deliverable output**: plan output includes a "Notes" + "Timezone" section by default, aligned with the standard-base foundation (A7).

## 4. Global Constraints

- **No upload by default**: only enter the upload flow when the user explicitly asks for "upload to AE".
- **The original plan is a baseline, not the truth**: in optimization scenarios, the user-confirmed business design can override the original plan, but a diff list must be emitted (light-orange mark / change log / to-be-confirmed items).
- **Non-standard input is not an error**: a regular Excel / Feishu sheet / screenshot / PRD is read as a business draft; identify event blocks / property blocks / requirement notes and convert to a standard Draft; do not flag severe errors directly.
- **Task mode separation**: audit_only (check only) / optimize_xlsx (produce a new Excel) / update_existing (continuous iteration) / upload (only after explicit request).
- Business-design-layer mandates: metric→event mapping, a scoped property registry (`references/naming-dict.md`), and all 15 checks in `references/business-semantic-checks.md`. These are **manual/model-assisted semantic review**, not implemented automatic scoring. Verify E1 `ad_fail` + callback/TBC, E2 `first_media_source` / `first_campaign`, actual event counts, and language following in generation, review and acceptance.

## 5. References

**Workflows (execution flows, load after routing):**

- `references/workflows/plan-generation.md` — From-scratch / full-refactor plan generation (absorbed from `tracking-plan-generator-en`)
- `references/workflows/plan-lint.md` — Upload-rule validation & auto-fix, E01–E10 (absorbed from `tracking-plan-linter-en`)
- `references/workflows/plan-review-optimize.md` — Semantic audit / optimize / increment of existing plans (absorbed from `ae-tracking-plan-en`)
- `references/workflows/feasibility-analysis.md` — Analysis-requirement coverage & feasibility assessment (absorbed from `te-feasibility-analyzer-en`)
- `references/workflows/prd-to-suggestions.md` — PRD / requirements doc → tracking suggestion table (absorbed from `prd-tracking-analyst-en`)
- `references/workflows/data-verification.md` — Data quality validation / plan acceptance (absorbed from `te-data-verifier-en`; SQL checks in `references/data-verification/`)
- `references/workflows/integration-qna.md` — SDK integration & reporting Q&A (absorbed from `data-integration-assistant-en`; knowledge base in `references/sdk/`)
- `references/workflows/troubleshooting.md` — Read-only diagnosis triage (condensed from `diagnose-studio-en`; local Web Studio engine is Route-B only)

**Knowledge bases and dictionaries:**

- `references/category-registry.md` — 24 base categories + 1 supplemented interactive_video; local-cache first, one Feishu-fallback and a documented Idle Card gap
- `references/scene-routing.md` — 6 scenarios × workflow route; official CLI/capability discovery before unknown input, no guessed fields or endless probes
- `references/workflows/validated-upload.md` — conversation overview → direct structured sync or selected Excel → explicit scoped confirmation/read-back; no unrequested workbook, implicit delete or overwrite
- `references/business-semantic-checks.md` — 15 manual/model-assisted checks, not automated scoring
- `references/eval-cases.md` — Seven acceptance cases; historical isolated v2.0 results separated from unrun v2.0.1 runtime status, D1 routing and C5 deployment permissions
- `references/naming-dict.md` — Global property registry (event verb table + property-name/display-name/type matrix + forbidden synonym table; authoritative naming across all scenarios; addresses C3)
- `references/te-field-translations.md` — Field translation table (full 1791-line version, merged from the former feasibility package in v2.0; the pre-v2.0 copy in this package was a 34-line stub)
- `references/ae-capabilities.md` — AE capability quick reference (v2.0: canonical copy taken from the former solution-builder package — verified against official docs, more complete)
- `references/optimization-checklist.md` — Optimization & acceptance checklist (absorbed from `ae-tracking-plan-en`)
- `references/system-fields.md` — System preset fields reference for analysis models (absorbed from `system-field-reference-en`)
- `references/categories/` — 29 local Markdown assets, including shared modules and the incomplete Idle Card cache; presence is not proof of complete business coverage
- `references/standard-base/` — Standard-base foundation 12-sheet local cache (2026-09-20, prefer local; see mapping table in category-registry.md)
- `references/plan-generation/` — Generation-domain deep references: `reference.md` (SDK auto-collection, object-group rules, revenue-model rules), `naming-dict` usage, `template-catalog.md`, `module-baseline.md`, `export-schema.md`
- `references/sdk/` — Integration knowledge base (client-sdk / server-sdk / faq / integration-tools / te-data-rules, absorbed from `data-integration-assistant-en`)
- `references/data-verification/` — Verification SQL library: `sql_checks.md`, `diagnosis_kb.md`, `tracking_plan_comparison.md`

**Scripts:**

- `scripts/lint_tracking_plan.py` — Plan upload validation (10 rule classes E01-E10; canonical copy, matched to the Chinese deliverable template)
- `scripts/export_tracking_plan.py` — Compatibility CLI alias (`--input`, `--output`) to the same 11-sheet finalizer; no standalone four-sheet mode or overwrite flag
- `scripts/finalize_plan.py` — Template-fill path from JSON to the repaired 11-sheet Chinese template; output must be new
- `scripts/build_template_catalog.py` — Reads actual category Markdown metadata only; `--output NEW.md` required, never overwrites curated business summaries
- `scripts/plan_types.py` — Shared property-type and update-method alias normalization; no guessed semantics
- `scripts/plan_contract.py` — Shared local plan/template contracts
- `scripts/prepare_delivery.py` — with `--conversation-only`, produces JSON, conversation and validation/review artifacts without XLSX; omit it only for the explicitly selected Excel path
- `scripts/sync_plan.py` — guarded no-Excel structured sync through `tracking.plan.save_items`, with dry-run, target/version/scope confirmation and read-back evidence
- `scripts/upload_plan.py` — legacy guarded Excel-import adapter; not used by the direct-sync branch
