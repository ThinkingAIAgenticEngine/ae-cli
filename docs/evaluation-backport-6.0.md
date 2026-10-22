# Evaluation backport to release/6.0

## Baselines and scope

- Target branch: `ferat/evaluation-backport-6.0`, based on `origin/release/6.0` at `b068c7c2` (6.0.55), fetched 2026-10-21.
- Source feature tip: `6c96a3666` on `feat/ae-evaluation-domain`; source feature baseline: `05339aa40`.
- Backported the final delta of 12 evaluation commits, including 121 commands, client/session transports, skill references, API inventory, tests and the dataset import Blob compatibility fix.
- All 144 new source feature files match the source tip byte for byte. Shared integration files retain the target baseline and add evaluation only. The two public README root-command tables also include evaluation.
- Package version, lockfile, existing commands, existing skills and other domains remain unchanged. The backport is isolated on its own branch; no pushes or release merges performed.

## Compatibility

The evaluation command paths, flags, risk levels, request shapes and ae-evaluation reference paths match the 6.1 feature. Existing 6.0 root commands remain listed and available; evaluation is the only added root command. Existing skill entry points retain their responsibilities. The separate ae-evaluation skill operates evaluation assets and agents under test; ae-agent continues to administer AE platform resources.

The target command loader retains its warning diagnostics. Existing error branches remain in place, with an additional EvalApiError branch. The output change normalizes undefined HTTP 204 payloads to null for jq; output and jq regression checks pass.

## Validation

Passed in the 6.0 worktree using its lockfile dependencies:

- npm run build
- npm run verify:evaluation-tools (121 registrations, client/binary download and command/platform contracts)
- node --import tsx tests/evaluation-sandbox-session.test.ts
- npm test (including README, dependency hygiene, sandbox, model context and analysis feedback checks)
- ./node_modules/.bin/tsc --noEmit
- npm run self-check: P1=0, P2=0; one existing P3 for missing package typecheck script
- npm run check:release (five checks)
- npm run check:agents-docs
- node --import tsx tests/output-contract.test.ts
- node --import tsx test/jq-output.test.mjs
- Built CLI dry-runs: +validate_run POST with no body; file download GET /files/{id}/content
- git diff --check

No live evaluation service requests were made. Cross-version server behavior and sandbox gateway deployment availability remain unverified; API coverage uses the checked-in operation inventory and mocked transport tests.
