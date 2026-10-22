# Dashboard card geometry and saved-metric formulas

Branch: `cli/optimize-1022`, CLI and Common Service. Frontend changes and database migrations are not required. Deploy Common Service before using the new CLI geometry flags. The old event-card presentation request remains supported without a dashboard version.

## Local regression evidence

- The formula regression first returned two `AGGREGATION_REQUIRED` errors for saved-metric operands without an aggregation. The repaired Java 11 compiler model suite passes 112 tests, including a real native-QP validator call, mixed operands, definition round-trip, event required-field/type failures, and unchanged retention restrictions.
- CLI geometry regressions first failed for missing flags/request fields. All 25 repaired command tests pass, preserving legacy presentation-only bodies, exact zero coordinates/version, combined writes, conflict propagation without repeating a write, and saved-metric definitions across report create/update and ad-hoc run/export.
- Backend geometry: 59 tests pass (17 service, 11 layout boundaries, 2 real MyBatis XML/BoundSql, 10 CLI application, 19 catalog). Real H2 plus Spring transaction proxies verify combined commit and rollback of the layout/version when a mapping SQL write fails. Unknown fields including explicit null values, mixed report/note/tag identities, historical sizes and overflow boundaries are covered.
- CLI build, normal tests, analysis presentation/tools/Skill checks, compatibility regressions, README checks and release checks pass. Self-check reports no P1/P2 findings; the existing missing-typecheck-script advisory remains P3. Both worktrees pass `git diff --check`.
- Independent second review enumerated DTO/service/mapper callers and read/write paths. New layout SQL is CLI-only, the original analysis-page mutation method is unchanged, the old DTO constructor is preserved, and card-only changes retain board permissions without requiring source-report edit permission. Formula validation defers requirements only for event-model operands until visible metadata resolves saved metric versus event; other models retain their checks. No database schema/migration or source-report persistence changes are required. Independent CLI contract review also passes.
- Scope: local source tests only. No deployed UI/query verification, global CLI relink, customer data writes, permission changes, or push were performed. Local commits are made at the user's request. The two pre-existing user worktrees are retained; README simplification and its related guides/tests were withdrawn.

## Deployment fixtures

Use a test project and an editable analysis board with at least two reports, one note, and one tag card. Include an event report, a non-event report, an initialized layout, and a second board referencing the same source event report. Retain a snapshot of all card geometry/presentation and source definitions. Use a separate board with no saved layout for initialization tests.

Prepare an account that can edit the board while its source report is read-only, and another account with read-only board access. Do not change real customer permissions or use production boards for these cases.

Prepare two visible saved metrics with verified `metric_name` values. One should aggregate an amount, not a count, so a silent `total_count` substitution is detectable. Do not infer the metric's technical name from its Chinese display label.

## Card geometry cases

Read the card and copy its fresh `reports_version`:

```bash
ae-cli analysis dashboard-report get --project-id <project_id> --dashboard-id <dashboard_id> --report-id <report_id>
```

| Case | Action | Expected |
| --- | --- | --- |
| G01 | Set `--frame-size medium` with the fresh `--reports-version` | Frame becomes medium, effective initialized geometry is 10x10; source definition/chart and other boards are unchanged. |
| G02 | Set `--frame-size large`, optionally move to a fitting empty destination in the same request | Width becomes 20; height follows the supported large-card rules; note/tag content and unknown layout fields remain intact. |
| G03 | Move with paired `--position-x` / `--position-y` and a fresh version | Persisted target coordinates change; no cards are added/removed and other entries are preserved. Refresh the page and account for its normal vertical compaction. |
| G04 | Choose a destination overlapping a report, note, or tag | Explicit failure and no size/layout/presentation changes. The CLI does not silently push other cards. |
| G05 | Reuse a stale layout version, including a combined chart/size/position write | Conflict and no partial writes. Reread before a deliberate new request; never automatically retry against another version. |
| G06 | Omit a coordinate/version, pass fractions/negative/unsafe numbers, x=20, y=10001, or x+width>20 | Validation error before persistence; version zero and coordinates zero remain valid when applicable. |
| G07 | Change only size on a board with no initialized layout | Size is saved without fabricated positions or loss of other UI settings. Position writes require a valid initialized layout. |
| G08 | Use malformed, duplicate, or incomplete saved layout data | Geometry writes fail safely. Legacy presentation reads/writes must not be broken by unrelated layout problems. |
| G09 | Change size/position on an existing non-event report card | Geometry works; event chart/table flags remain unsupported for that model. |
| G10 | Board edit + source read-only; board read-only; cross-project IDs | The first is allowed, the others rejected without mutation. No source-report edit permission is added to a card-only change. |
| G11 | Legacy `--chart-type table --table-layout event --date-outside false`, no layout version | Existing event-card behavior remains valid. No implicit frame or position changes. |
| G12 | `--dry-run` or `--validate` with a geometry patch | Same validation/scope as execution, no writes. Do not stack both modes. |

Grid units are not pixels or ordinal report indexes. The board has 20 columns; the CLI y safety range is 0..10000. Medium cards fit x=0..10, large cards require x=0. An occupied destination is not an instruction to reorder the entire board.

## Formula cases

Use an event definition with bare aliases and no dummy aggregation on the saved-metric dependencies:

```json
{
  "time_range": {"mode":"previous","unit":"day","value":7},
  "metrics": [{
    "formula":"third / total",
    "dependencies":[
      {"alias":"third","event":"<verified_third_party_metric_name>"},
      {"alias":"total","event":"<verified_total_metric_name>"}
    ]
  }]
}
```

| Case | Action | Expected |
| --- | --- | --- |
| F01 | Run an event ad-hoc analysis with the two saved-metric operands | No `AGGREGATION_REQUIRED`; resolved names and result match the analysis page's saved-metric formula on the same scope. |
| F02 | Mix a saved-metric dependency with an event dependency | Saved metric keeps its own definition; event still needs its real aggregation/property/percentile. |
| F03 | Omit event aggregation, sum property, or percentile; use sum on text | Existing argument/type failures remain, with actionable field paths. |
| F04 | Missing/inaccessible metric, or a metric/event name ambiguity | Normal visibility/clarification handling, without silently choosing or rewriting the calculation. |
| F05 | Create an event report, get it, update the returned definition, then run it | Formula, saved-metric references, component filters and formatting survive; numerators/denominators retain their calculation definitions. |
| F06 | Open the created report in the analysis page and save without changing the formula | Both saved metrics render as selectable operands; formula and results remain intact after another CLI get/run. |
| F07 | Run existing saved-formula and ordinary-event report regressions | Existing round-trip fields, errors, permissions and non-event model restrictions are unchanged. |

This feature concerns formulas inside event reports/ad-hoc analysis. It does not expand `analysis-meta metric create` or saved-metric support in retention/ranking/revenue formulas.

## Verification commands

From the CLI worktree:

```bash
npm run build
npm test
npm run verify:analysis-four-modules
npm run verify:analysis-contract-regressions
npm run verify:analysis-agent-contract
npm run verify:analysis-tools
npm run verify:analysis-skill
npm run check:release
npm run self-check
```

From the backend worktree, with Java 11:

```bash
scripts/qa/changed.sh --module ta-mcp --test AnalysisQpBuildServiceModelTest
./mvnw -q -pl ta-cli -am \
  -Dtest=DashboardReportPresentationCliTest,DashboardReportLayoutCliSqlTest,CliDashboardReportLayoutTest,AnalysisDashboardReportPresentationServiceTest,AnalysisReportCapabilityCatalogTest \
  -DfailIfNoTests=false test
```

Do not label deployment cases above PASS until the deployed backend and matching CLI have actually been exercised. Deploy Common Service first, then install/link the matching CLI through the repository's normal local-link workflow; no global installed command was changed during this implementation.
