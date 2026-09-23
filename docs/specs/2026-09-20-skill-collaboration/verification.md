# Verification — 2026-09-20

## Implementation

- One editable protocol; three committed regular-file copies with package-local links.
- Participants: ae-analysis 4.2.21, ae-metadata 1.0.2, ae-engage 1.0.1.
- Conditional collaboration and self capability contracts; no runtime router or host changes.
- Fixed-name property lookup instructions in two Engage references were aligned with the protocol.
- An existing draft workflow's unconditional approval step was made explicitly conditional on user intent. Ordinary writes still need no extra high-risk confirmation, but require the corresponding user intent.

## Deterministic and packaging checks

| Check | Result |
| --- | --- |
| `verify:skill-collaboration` | 9 passed; missing/drift, read-only check, preflight, symlink guard, standalone copies, draft boundary |
| `check:skill-collaboration` | Passed; no writes |
| `check:release` | All 5 checks passed |
| `verify:skill-collaboration-install` | All 6 passed: three packages, copy and symlink installation modes, actual skills@1.7.0 CLI |
| `verify:analysis-skill` | Passed, 345 registered commands |
| `verify:analysis-agent-contract` | Passed |
| `verify:metadata-capability` | 61 passed |
| `verify:engage-capability` | Command contract, semantic QP and Skill contract passed |
| `verify:skill-reference-files` | 5 passed |
| `verify:skill-version-management` | Passed |
| `build` and `npm test` | Passed with clean lockfile dependencies |
| `git diff --check` | Passed |

The actual installer was given individual local Skill directories, not a remote
Git source. This establishes the single-folder packaging behavior without requiring
publication. It does not establish a remote curator/export release or every Agent host.
Installation checks used disposable projects, not the user's regular Skill directories.

## Dependency environment

The original worktree has xlsx 0.18.5 installed, while package.json and package-lock.json
require the SheetJS 0.20.3 tarball. `npm ls xlsx` reports it invalid. CLI startup failed
with `TypeError: XLSX.set_fs is not a function`; metadata had 57 passes/4 failures and
Engage/smoke stopped at startup. The unmodified 43a53978 source reproduced the same
failure using those installed dependencies.

A temporary baseline snapshot was installed with `npm ci --ignore-scripts` using
the unchanged lockfile. A temporary copy of the candidate source used those clean
dependencies for successful build, smoke and domain regression runs. The user's
node_modules, package dependencies and lockfile were not modified. A rerun in the
original worktree will still need its dependency installation reconciled.

## Agent fixture comparison

The committed `evals/evals.json` contains eight scenarios: pure analysis, renamed
target with a misleading familiar name, upload prerequisite continuation, missing
capability, permission denial, no-progress stop, disabled automatic invocation,
and ambiguous write outcome with untrusted retrieved text.

Two context-isolated agents used the old snapshot and candidate content respectively.
Each processed one batch of eight scenarios. They received only fixture prompts,
not expected outputs or grading assertions, and wrote simulated decisions without
calling real business tools. Parent grading found all eight checks passed in both
configurations. Final draft/approval wording clarification was subsequently checked
by a red/green static regression; no new native business run was performed.

This is not evidence of improved success rate: prompts supply the inventory and
constraints, all assertions are non-discriminating in this sample, cases within a
batch are not independent, and there are no repeated trials. Time/token metrics
were unavailable and were not inferred. This also does not test actual Skill loading.
The generated local review viewer includes outputs, assertion evidence and these limits.

## Remaining acceptance and release boundary

- In an authorized native host, inspect actual load/tool traces for remaining-task
  continuation and upload-prerequisite continuation, including renamed/new candidates.
- Verify missing/disabled Skills and denied writes do not cause hidden discovery,
  privilege escalation, repeated switches or false completion.
- Verify draft-only work stops before approval/publication/sending using an authorized
  test project; do not exercise live campaign side effects merely for validation.
- No CI result, remote publication, deployment or real-user business acceptance is claimed.
- No push, MR creation, release, Feishu update, or te-claude/Sandbox change is included.

## Standards

Independent staged-diff review and final narrow re-review: 0 findings, no blockers.
Generated copies are intentional installable artifacts; the thin release-check adapter
follows the existing plugin contract. Repo English/source and narrow-scope rules hold.

## Spec

Independent staged-diff review and final narrow re-review: 0 actionable findings,
no blockers. The final draft workflow preserves user-intent boundaries. Native
business acceptance remains pending; fixture and package checks do not replace it.

Review target: staged diff against HEAD `43a539783cd0b483ae1dc1a135c99389e10a8dd4`,
restricted to the 20 task paths. Command: `git diff --cached HEAD -- <task-paths>`.
Standards: 0 findings, no worst issue. Spec: 0 findings, no worst issue.
