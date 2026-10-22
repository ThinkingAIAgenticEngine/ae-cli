# Formula operand filters: implementation and verification

Date: 2026-10-20. Status: local verification complete; synchronization-2 deployment and end-to-end verification pending.

## Scope and baseline

- Backend: `.worktrees/weipai-1022-backend`, `cli/optimize-1022`, baseline `a324b51190c63933e7a21ae7c5e2ccdffa104331`.
- CLI: `.worktrees/weipai-1022-cli`, `cli/optimize-1022`, baseline `48f85b9016d76aa9df75b8765d2a3f5cfaabcf9d`.
- Both existing worktrees were clean and matched the remote branch at preflight. Main checkouts belong to another 6.1 task and were not switched or edited. No new worktree was created.
- No analysis frontend, `te-system-skills`, database migration, dependency version, account permission, business report, or `illegal getter` cold-start change is included.

## Root cause and contract

The old formula dependency model did not declare `filters` or `relation`. Strict decoding rejected these fields. The formula authoring compiler separately rebuilt native `customFilters` as an empty array. The native saved-formula branch could preserve filters, but supplying non-empty authoring dependencies selected the other branch. CLI definition transport was not trimming the conditions.

Each ordinary event dependency now accepts generic filter leaves (`field`, `operator`, `values`) and compound `items` / `relation` groups. Dependency `relation` defaults to `and`. Event properties, including inferred field types and explicit metadata resolutions, are resolved within that operand's event. User-property, tag, cluster, visibility, and authentication semantics reuse the existing resolver.

Numerator, denominator, metric-common, and definition-global filters are separate scopes. Never move one operand's conditions into a common scope to make a request pass. For boolean `win=true`, use `operator: "is_true"`; for false use `is_false`. Do not replace these operators with stringified booleans or unsupported `eq` conditions.

Formula expansion and index collection use one complete-operand scan matching native arithmetic and whitespace rules. Numeric constants do not occupy an analysis index. Repeated references do; different aliases for the same event remain independent. Native `customFilters` and `formulation.formulationDeps` follow expression occurrence order, not dependency declaration order or distinct event names.

### Compatibility and rejection policy

- Existing formulas without dependency filters remain valid; the native saved-formula path with omitted/empty dependencies is retained.
- Preserve returned `formulation` (including `appData`), `custom_filters`, descriptions, format, event type, UUID, per-occurrence time ranges, entities, and split indexes for unchanged saved formulas. Stage-summary UUID references must match the retained final event UUIDs.
- Non-empty authoring dependencies cannot be combined with populated native formulation metadata or non-empty `custom_filters`. Empty native containers remain compatible. Display metadata and supported number formats are preserved rather than rejected.
- Duplicate aliases, aliases that are numbers or contain operators/whitespace, undeclared operands, raw native-token authoring mixtures, and filtered dependencies absent from the expression fail explicitly. Native saved formulas are not subjected to the new authoring-only lexer.
- Non-empty filters on saved-metric operands are explicitly unsupported. A relation with no filters remains a no-op for compatibility. Existing saved-metric support is not extended to additional models.
- Event, retention simultaneous, revenue/cost, and ranking formula compilation share the operand-filter implementation while retaining each model's existing aggregation restrictions.
- Saved-report writes retain the one-compound-level page boundary. Ad-hoc analysis retains recursive filter support. Neither schema nor strict decoding permits unknown nested fields.
- CLI source transport does not change. `ae-analysis` remains the same Skill entry with version `4.2.37`; the event reference owns the detailed contract and other affected model references link to it. Customer README files are unchanged.

## Local evidence

Backend QA uses Java 11 at `/Library/Java/JavaVirtualMachines/jdk-11.jdk/Contents/Home` and the repository `scripts/qa/changed.sh` entry point. Backend implementation and QA are owned by one worker to avoid concurrent Maven reactors.

Observed RED cases before their corresponding fixes:

- Strict Jackson decoding rejected dependency `filters` as `UnrecognizedPropertyException` (`/tmp/weipai-formula-dependency-red.log`).
- Repeated references produced two formulation dependencies for three expression occurrences (`/tmp/weipai-formula-dependency-red2.log`).
- Event-property inference across two events, raw native-token mixing, operator-containing aliases, and stage-summary UUID preservation were covered by additional failing regressions before their fixes.
- Overlapping Chinese aliases produced three filter entries for two operands before whole-operand expansion (`RED6`, reported by the backend QA worker).
- The CLI Agent-guidance test first failed because its operand-filter contract/example was absent; after the reference update it passes.

CLI verification:

- `npm run qa-changed`: passed build, `npm test`, and selected analysis verification suites (`/tmp/weipai-formula-cli-qa.log`).
- `tests/analysis-report-presentation.test.ts`: 28 tests passed, including unchanged forwarding through report create/update and ad-hoc run/export in dry-run and execute modes. These use mocked transport, not a deployed backend.
- After the final model-reference edits: `verify:analysis-skill`, `verify:analysis-agent-contract`, `check:release`, and `verify:skill-reference-files` passed. Release gate: five checks passed.
- `git diff --check`: passed for CLI changes at the time of verification.

Backend final QA: **216 tests passed, zero failures/errors/skips**, reactor `BUILD SUCCESS` (`/tmp/weipai-formula-dependency-final-qa-green.log`). Surefire XML confirms `java.version=11.0.25` and the Java 11 home above.

Run from the backend worktree:

```bash
JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-11.jdk/Contents/Home \
PATH=/Library/Java/JavaVirtualMachines/jdk-11.jdk/Contents/Home/bin:$PATH \
scripts/qa/changed.sh --module ta-cli --test \
'AnalysisQpBuildServiceModelTest,AiQpDefinitionJsonDecoderTest,CapabilityInputSchemaContractTest,AnalysisReportManagementServiceTest,MetricCapabilityCatalogTest,MetricCapabilityServiceTest'
```

| Test class | Passed |
| --- | ---: |
| `AiQpDefinitionJsonDecoderTest` | 11 |
| `AnalysisQpBuildServiceModelTest` | 124 |
| `AnalysisReportManagementServiceTest` | 39 |
| `MetricCapabilityServiceTest` | 12 |
| `MetricCapabilityCatalogTest` | 3 |
| `CapabilityInputSchemaContractTest` | 27 |

The first full model run exposed one incorrect revenue status for filtered saved-metric operands. A narrow fix maps only the new unsupported-filter error to `invalid_argument` in revenue/ranking, preserving all existing status branches. The final run above includes that fix and all four-model rejection assertions.

Local compiler/service/schema tests are not a deployed query-engine or database test. Both repositories pass `git diff --check`.

## Independent shared-chain review

Separate Spec/shared and Standards reviews checked the full uncommitted diff against the fixed baselines, including a final follow-up for the two error-status branches. No actionable findings remain. The reviews independently identified and confirmed fixes for duplicate aliases, raw-token and overlapping Unicode alias misbinding, omitted-field-type event scoping, and retained UUID/stage-summary mismatch.

Callers reviewed include MCP builders, CLI ad-hoc run/export, report create/update, and metadata metric creation. Retention's independent dependency DTO converts the new fields; revenue/cost and primary/accompanying rank formulas use the shared compiler. Report writes continue through `reportEdit` → `checkAndParseReportParam` → `reportHelper.updateReport`; reads use existing model handlers, the AI-definition mapper, and public decoding.

Native page/OpenAPI/task entry points, authorization, transactions, and persistence APIs are unchanged. Existing resolver callers still pass no event scope; only the new dependency-filter path supplies the operand event. Native filter/time/entity/split indexing was checked against the original expression tokenizer and quota consumers. No database or migration change is needed. The review is source-level plus local regression evidence, not a claim that deployed native-page workflows have been tested.

## Deployment verification checklist

Run only after approval and deployment. Use a dedicated test project and test reports with a unique `cli_formula_filters_1022_` prefix. Do not edit customer or business reports, change account permissions, or work around unrelated environment/query failures.

| Case | Input variation | Expected evidence |
| --- | --- | --- |
| Numerator only | `a/b`, only `a` has festival and `is_true` filters | Native filter index 0; `b` has no copied condition |
| Denominator only | Only `b` is filtered | Native filter index 1; `a` remains unchanged |
| Different sides | Different conditions on `a` and `b` | Two independent groups with the correct values/relations |
| Same event | Different aliases/conditions for the same event | Neither alias nor its condition is deduplicated |
| Repeated alias | `b + 10*a/a`, dependencies declared `a,b` | Occurrence metadata `b,a,a`; constants consume no index |
| Unicode aliases | Overlapping Chinese aliases and full-width spaces | Two intended operands; no substring replacement or extra filters |
| Compound/boolean | Nested ad-hoc groups and `is_true` / `is_false` | Correct native comparator and grouping; unsupported boolean equality is rejected |
| Saved-report depth | One compound level versus a deeper tree | First accepted; deeper write rejected before persistence |
| Round trip | Get native formula, resubmit unchanged definition using its fresh version | Native filter values/indexes, UI metadata, format, time/entity/split and UUID remain intact |
| Mixed representation | New dependencies plus populated native formulation/custom filters | Explicit conflict; no successful response with silently cleared conditions |
| Invalid operands | Duplicate/operator/numeric aliases, missing alias, raw native token, unused filtered alias | Explicit validation failure, no created or modified report |
| Saved metric | Filtered saved-metric operand versus old unfiltered operand | Filtered shape explicitly rejected; existing supported unfiltered usage retained |
| Reused models | Retention simultaneous, revenue/cost and ranking formulas | Same operand scope; existing model restrictions still enforced |

Recommended sequence:

1. Inspect the deployed capability schema once to confirm dependency `filters` / `relation` support on the actual host.
2. Create dedicated formula reports using verified test-event/property metadata. Get each report and inspect the native occurrence filters; update only the intended operand, then get again with the new version.
3. Open each dedicated report in the analysis page. Confirm conditions are attached to the intended numerator/denominator and survive a CLI get/update cycle. Keep the native saved representation when only renaming a formula.
4. Query dedicated fixture data and compare with the same definition created through the native analysis workflow. For a simple completion-rate fixture, independently verify numerator and denominator counts; do not infer correctness only from a successful envelope or a plausible ratio.
5. Run rejection cases against dedicated assets, verify no write occurred, and record host, backend revision, CLI revision, request IDs, report IDs, native definitions, and query evidence. Retain test assets/evidence for review; remove them only with explicit cleanup authorization.

## Unverified combinations

- No synchronization-2 environment, customer environment, browser UI, live query engine, or real database was exercised for this fix.
- Current CLI with the patched backend is covered locally by separate transport/compiler/service tests, not full deployed end-to-end tests.
- CLI 6.0.48 against the patched backend has not been executed end-to-end. Its unchanged definition passthrough makes compatibility plausible, but this remains a deployment test rather than a claimed pass.
- A new CLI cannot supply missing compiler support on an old backend. The old strict contract's rejection was reproduced locally; silently removing filters is not an acceptable fallback.
