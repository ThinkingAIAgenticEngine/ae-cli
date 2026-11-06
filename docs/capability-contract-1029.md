# CLI contract repairs 1029

Scope: MP-09, QT01, QT06, QT07 and QT08, plus A05/A06 documentation. Source is based on release/6.0@3f53da9f and edited only in the isolated fix/capability-contract-1029 worktree. The primary checkout, global ae-cli link/build and installed Skills were not changed.

| Issue | Reproduced behavior | Repair | Regression |
|---|---|---|---|
| MP-09 | Explicit empty event/property/metric remark was omitted | Reuse existing optionalStringPreserveEmpty for those three clearable flags only; omitted and nonempty behavior unchanged | metadata-empty-remark.test.ts: 9 cases; baseline 3 failures, fixed all pass |
| QT01 | Successful curated validate/dry-run and project asset package metadata disappeared | Use existing WithEnvelope helpers and output metadata carrier; retain original business data and intent metadata | capability-preflight-metadata.test.ts: baseline 5 failures, fixed 5 pass |
| QT06 | Active inspect could outlive timeout/abort and return late success | Remaining-time request cancellation, boundary recheck, bounded transient backoff, cancellable download headers; do not cancel remote run | analysis-wait-cancellation.test.ts: 6 cases including actual loopback HTTP, fake-clock boundary and Node 20 API compatibility |
| QT06 renewal | Token renewal connection remained active after the function timed out | Optional signal through transport and getCliToken; shared renewal waiter accounting, abort underlying request only when every waiter leaves | cli-token-renew-cancellation.test.ts: baseline 5 failures, fixed 6 pass; real child process exits without waiting for delayed renewal |
| QT07 | Empty/custom gateway domains produced incorrect preview and inspect hints | Reuse canonical URL builder for input file inspect/upload and ID-import previews | input-file-root-gateway.test.ts: baseline 3 failures, fixed 4 pass |
| QT08 | Query cancellation skipped the established high-risk confirmation gate | high-risk-write, aligned server risk, retained validate/dry-run, updated explicit confirmation examples | query-cancel-confirmation.test.ts: baseline 2 failures, fixed 2 pass including non-interactive command runner |
| A05/A06 | Settings help advertised no-op fields; daily report help advertised arbitrary minutes | Preserve published flags, document settings deprecations and server metadata warnings; describe whole-hour forms | Existing generated-index/agent-contract/release gates |

## Validation

32 newly added CLI regression cases pass. npm build, npm test, gateway API, metadata, analysis-four-modules, analysis-contract-regressions, analysis-system, analysis-agent-contract, project-semantic export and release-gate checks pass. Existing token-validation and external-token authentication regressions each pass 11 cases. Detailed local red/green evidence is retained under the workspace .scratch/common-service-cli-contract-audit-1029/fixes/.

The first existing capability-command run inherited an unrelated workspace Agent context and failed two exact-body assertions. The QA runner disables that implicit context only in its child environment and reruns the unchanged assertions; all pass. It does not edit the shared context file. The generated command index was refreshed after the risk/help changes.

## Compatibility

No published commands, flags, Skill names or responsibilities were removed. ae-analysis retains its entry point and advances from 4.2.52 to 4.2.53. No new Skill was added. Missing server metadata still returns the original data shape. The new transport/token signal parameters are optional trailing arguments; ordinary callers retain renewal deduplication and best-effort failure. Node >=20.0.0 support is preserved without AbortSignal.any.

Cancellation confirmation intentionally changes the previous erroneous risk behavior: scripts need global --yes after explicit authorization. Empty remarks are now sent only when explicitly provided; omission still preserves saved values. No blanket optionalString behavior was changed.

No global CLI installation, release/6.1 checkout switch or installed-Skill sync was performed. Backend integration and sync2 verification are recorded in the workspace repair matrix and original test document.
