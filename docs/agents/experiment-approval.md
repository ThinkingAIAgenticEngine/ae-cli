# Experiment approval CLI implementation

## Scope and acceptance

Implement typed CLI commands and extend the existing `ae-experiment` Skill for
the Atlas approval contract. Acceptance requires a passing build, `npm test`,
`verify:experiment-tools`, release gates, and request/confirmation/error tests.
No production approval, roster change, database migration, or deployment is
part of this implementation.

## Inspected sources

Inspected the local working trees on 2026-10-30. Their HEADs were Hermes
`ab3c59233` and ta-multiverse `0624aed23a`; working-tree code is the contract
source, rather than assuming every frontend design note is current.

- Hermes `web/.../cli/business/experiment/config/ExperimentApprovalCapability{Definition,Catalog,Configuration}.java`:
  eight capabilities, input/output metadata, privileges, risks, and registration.
- Hermes `web/.../cli/business/experiment/application/ExperimentApprovalCapabilityService.java`:
  strict snake_case input, exact round IDs, semantic proposal output, and service delegation.
- Hermes `atlas/.../service/AtlasExperimentApprovalService.java` and
  `AtlasApproverService.java`: snapshot application, baseline/role checks,
  independent roster, and runtime state boundaries.
- ta-multiverse `apps/atlas/src/services/{experiment,approver}.ts` and
  `pages/experiment/detail/components/approval-review/index.tsx`: exact-round
  review and separate experiment approver settings.

## Admission and compatibility

The eight new commands are L2 wrappers owned by the Hermes Atlas experiment
module. The existing engage Gateway supplies schema, permissions, preview, and
execution. Typed flags, positive safe integer IDs, bounded reasons/rosters, and
the existing destructive-write confirmation provide the CLI value. No REST
fallback or duplicate service implementation is introduced. IDs above the
JavaScript safe integer range are rejected instead of silently rounded.

Numeric ID parsing checks the original trimmed decimal digit string before
converting to a number. Fractional inputs such as `41.9999999999999999` cannot
round into another approval ID. Tests exercise all three approval actions
across validation, dry-run, and execution, zero gateway calls on invalid input,
the shared project-ID check before delete confirmation, and exact safe-integer
boundaries. Leading zeroes and surrounding whitespace retain their prior meaning.

Existing commands, flags, capability IDs, request builders, and output envelopes
are retained. Changes to existing command code only update help text. Existing
`manage --target-status pending` still sends exactly the old request. On the
approval-enabled backend, draft submission now queues a proposal; that behavior
belongs to the server, and the Skill/help/READMEs explain the distinction from
runtime status. The CLI does not manufacture a pending or running result.

The compatibility review found that changing the generic scheduling examples to
`approval submit` broke guidance for older backends. Local Hermes `release/6.1`
at `078648ea7` retains `experiment.experiment.manage` without approval capabilities.
The README, save/manage help, and Skill now retain `manage --target-status pending`
as the compatible submission path. Dedicated approval commands are selected only
after metadata confirms support. An explicit `CAPABILITY_NOT_FOUND` or a verified
older deployed release permits the legacy workflow; authentication, permission,
network, generic HTTP 404, filtered discovery, and business failures do not.
No command adds automatic write retries, fallback, or a second submission.

The existing `ae-experiment` entrypoint and reference paths remain available;
its version increments from 1.0.5 to 1.0.6. Approval is part of experiment
management, so it reuses that Skill instead of adding a fragmented entrypoint.
One reference covers the multi-step approval workflow and typed commands.

## Verification and limits

`verify:experiment-tools` includes the existing save, native request, timing,
status, external experiment, whitelist, and structured-error regressions plus
the new approval tests. New tests cover all eight commands across validation,
dry-run, and execution, real CLI flag parsing, exact round preservation,
reason/roster bounds, unsafe IDs, null approvals, independent runtime status,
non-interactive delete confirmation, and stale/baseline/permission failures.
Transport tests use deterministic responses and local test credentials.

Validation results: `npm run build`, `npm test`, the existing experiment command
contracts, all ten approval regression groups, all five Skill reference file
tests, the five release gates, and 18 local Skill documentation links passed.
`git diff --check` passed. The optional `tsc --noEmit` check reports the existing
TS2571 at `external-experiment/save-submit.ts:70`; running it against a temporary
archive of unmodified HEAD reproduced the same sole error. This implementation
does not change that line or its behavior.

These checks validate new and existing CLI requests against the inspected
contract with mocked transport. Old CLI against a deployed approval backend,
new CLI against older deployed servers, database concurrency, real project
permissions, and Feature/RCC effects still require environment integration.
The new approval commands require a backend exposing the eight capabilities;
they do not attempt a bypass on older servers.

The generic skill-creator Python validator could not start because available
Python runtimes lack PyYAML. The repository release gate validates the existing
Skill frontmatter format, including its preserved top-level version field.
