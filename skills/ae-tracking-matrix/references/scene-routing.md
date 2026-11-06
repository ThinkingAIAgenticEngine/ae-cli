# Scenario Routing

> Scenario answers "how to track". It is jointly determined by "intent × input form"; after routing, load the corresponding **workflow reference** under `references/workflows/` (v2.0: former execution skills were merged into this package as workflow references; only the two system skills remain external).

## 6 Scenarios × Associated Workflows

| Scenario ID | Scenario Name | User Intent | Associated Workflow | Readiness |
|-|-|-|-|-|
| demand_understanding | Requirements Understanding | PRD / requirements doc → tracking suggestion sheet | `references/workflows/prd-to-suggestions.md` | ✅ in-package since v2.0 |
| plan_generation | Plan Generation | 0→1 conversation overview → user chooses direct sync or local 11-sheet Excel; confirmed remote write | `references/workflows/plan-generation.md` then `references/workflows/validated-upload.md` | Packaged; runtime acceptance tracked separately |
| plan_optimization | Plan Optimization | Incremental / audit / optimize, output diff list | Single owner per sub-intent — see dispatch table below | ✅ |
| code_delivery | Code Delivery | SDK tracking code / LogBus2 config / debug scripts | `ae-generate-tracking-code` (system skill, external) | ✅ |
| integration_qna | Integration Q&A | SDK integration / reporting / pipeline Q&A and troubleshooting | `references/workflows/integration-qna.md` (knowledge base under `references/sdk/`); `references/workflows/troubleshooting.md`; `te-user-id-debug` (system skill, external) for ID fragmentation | ✅ |
| data_verification | Data Verification | Quality validation / plan acceptance against the customer's real reported data | `references/workflows/data-verification.md` (SQL checks under `references/data-verification/`) | ✅ references merged in v2.0 |

**Out of scope (removed in v1.4)**: data seeding (`dataseed-en`) and presales demo-data generation (`presales-datagen-en`) are internal/presales tools and are NOT mounted in this customer-facing assistant. Customers produce real data with their own test devices / debug mode; if the user asks the assistant to fabricate or seed data, decline in one line and redirect to the verification flow above.

**Presales solution building** (customer-facing HTML decks, deep-use cases) is OUT OF SCOPE for this assistant: the former `thinkingdata-ae-solution-builder-en` skill was unmounted on 2026-10-27. If the user asks for presales decks or deep-use case documents, decline in one line and explain that this assistant covers the tracking lifecycle only.

### plan_optimization Dispatch (single owner per sub-intent)

| Sub-intent | Owner workflow | Notes |
|-|-|-|
| Semantic audit / review of an existing plan | `references/workflows/plan-review-optimize.md` | MUST include a read-only machine check via `scripts/lint_tracking_plan.py` for xlsx inputs; deliver findings + diff, never overwrite the original |
| Optimize / improve an existing plan | `references/workflows/plan-review-optimize.md` | Emits diff list; write-back only after user confirmation, save-as new file |
| Incremental supplement (add events / module) | `references/workflows/plan-review-optimize.md` | Append-only vs the existing plan; naming precheck via `references/naming-dict.md` |
| .xlsx upload-rule validation / auto-fix | `references/workflows/plan-lint.md` | Read-only check first; fixes require confirmation and save-as |
| Coverage of analysis requirements / feasibility | `references/workflows/feasibility-analysis.md` | Assessment report only |
| New build or full refactor | `references/workflows/plan-generation.md` | — |

Ambiguity rule: if several rows seem to match, pick exactly one owner by the user's primary verb (review → audit row; add → increment; validate → lint), state the choice in one line, and proceed.

## Intent → Scenario Decision Rules

| Input Form | Intent | Scenario |
|-|-|-|
| One-liner business description, no existing plan | From-scratch design | plan_generation |
| PRD / requirements doc (docx/pdf/md/screenshot) | Produce suggestions | demand_understanding |
| Existing plan file + "optimize / audit / take a look" | Audit / Optimize | plan_optimization |
| Existing plan + "add N events / add module" | Incremental design | plan_optimization |
| Existing plan + "change property of event X" | Adjustment | plan_optimization |
| "Generate XX platform tracking code" | Code delivery | code_delivery |
| "Reporting has no data / SDK error / how to integrate" | Q&A | integration_qna |
| "Verify data / accept plan" | Data verification | data_verification |
| "Upload to AE" / confirm validated upload | Validated upload | `references/workflows/validated-upload.md`; one explicit scoped confirmation, no automatic upload |

## code_delivery Execution

SDK code generation goes through the mounted system skill `ae-generate-tracking-code`: load it and follow its interactive workflow (tracking plan → platform selection → insert/snippet mode → code + LogBus2 config + debug scripts). Do NOT use the legacy capability `tracking.sdk_sample.generate` — deprecated (samples only, no retrievable artifacts).

## Validated Upload and Remote Adjustment

All upload intents route to [Validated Upload](workflows/validated-upload.md), including plans produced by generation or optimization. That workflow owns current CLI discovery, upload compatibility, target/conflict checks, the single scoped confirmation, execution and read-back verification. No write occurs merely because a plan was generated or lint passed.

1. Present the reviewable conversation plan first and retain pending facts visibly. Then ask for one delivery choice: direct structured sync or local 11-sheet Excel. Sync uses canonical JSON directly and creates no workbook; Excel is generated only after its branch is selected.
2. Before remote adjustment, read the existing target through a discovered read-only interface; do not assume it is empty. Check naming/type conflicts in the event+common domain and independently in the user domain; also review semantic cross-domain consistency.
3. Prefer current official curated CLI documentation. If an interface has not been discovered, use targeted `--help`, or capability discovery followed by `inspect` for its schema/risk/auth contract. Never guess capability IDs, field names, flags, IDs, or permissions from these historical references.
4. Use validate **or** dry-run when needed by the discovered interface; do not stack both or probe indefinitely. A repeated schema/auth failure must be reported with the concrete prerequisite, not retried blindly.
5. After local and upload-specific validation, show the destination and exact add/update scope. One explicit confirmation authorizes only that checked version and scope. Deletion, replacement, overwrite and baseline conflicts need separate explicit resolution; “one click” is not consent to them or proof of an existing UI button.
6. Return real execution evidence and verified target result only after success. No local-only work, dry-run, or file creation counts as uploaded. If CLI/auth/network access is unavailable or remote work is disallowed, deliver local artifacts and state upload is unexecuted.

## Scenario Test Matrix (S1–S10) Mapping

| Test Scenario | Routed Scenario |
|-|-|
| S1 Empty-project generation | plan_generation |
| S2 Requirements-doc suggestions | demand_understanding |
| S3 Add tracking / S4 Adjust tracking / S9 Optimize existing plan | plan_optimization |
| S5 SDK sample | code_delivery |
| S6 Integration Q&A | integration_qna |
| S7 Multi-attachment / S8 Mount custom skill / S10 Plan deliverable | Cross-cutting (not a scenario cell) |

## Known Gaps

- v2.0 merge: the 9 former execution skills (`tracking-plan-generator-en`, `tracking-plan-linter-en`, `ae-tracking-plan-en`, `te-feasibility-analyzer-en`, `prd-tracking-analyst-en`, `data-integration-assistant-en`, `diagnose-studio-en`, `te-data-verifier-en`, `system-field-reference-en`) were merged into this package as workflow references; `requirement-collect-en` (internal Meegle demand-pool tool) and `thinkingdata-ae-solution-builder-en` (presales tool) were both unmounted from the customer-facing assistant on 2026-10-27.
- `diagnose-studio-en`'s local Web Studio engine (JumpServer SSH, sub-agent orchestration) only exists in Route B (cli + local agent); the cloud agent uses `references/workflows/troubleshooting.md` for conversational triage only.
- System skills remain external and unchanged: `ae-generate-tracking-code` (code delivery), `te-user-id-debug` (ID fragmentation deep-dive).
- Skill capability-pool sync between Route B (cli + local agent) and Route A (cloud preset Agent) is undefined.
- Deliverable language: replies and authored business content follow the user language. Only the optional Excel branch retains Chinese sheet/header/type labels and uses workbook upload language `zh`; direct structured sync has no workbook language flag. The deterministic conversation renderer supports zh/en; other language runtime rendering is not claimed tested.
- Nine packaged workflows still serve six business scenarios; the added validated-upload workflow is a gated handoff, not a seventh business scenario. Availability marks above mean packaged routing, not successful live v2.0.2 tests.
