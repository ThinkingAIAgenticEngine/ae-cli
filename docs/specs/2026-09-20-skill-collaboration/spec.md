# Skill collaboration convention

Status: implemented and locally verified; native-product behavioral acceptance pending.
The user approved the design in this conversation. See [verification](verification.md).
Delivery base branch: `integration/6.0-20260923` at `7ba5f69a`.
Delivery work branch: `feat/skill-collaboration-integration`.
Initial development used `release/6.0` at `43a53978` on `feat/skill-collaboration`;
that branch is preserved. Only this feature's commits were replayed onto the
user-requested integration baseline, excluding unrelated release history.
Tracking: this local spec; no remote issue or Feishu update in this delivery.

## Contract

The Agent uses native Skill discovery to fill capability gaps while preserving the
original task. Skills describe themselves, not a fixed graph of other Skills.
The participants are ae-analysis, ae-capability, ae-community, ae-data-integration,
ae-dataops, ae-engage, ae-generate-tracking-plan, ae-kb, ae-kb-discovery and ae-metadata.
They are a distribution list, not a runtime allowlist or routing table.

- Maintain one name-independent collaboration protocol in
  `docs/skill-contracts/collaboration.md`.
- Generate committed, regular-file copies at each participant's
  `references/collaboration.md`. Git-based individual installation must not need
  the repository's docs directory, sibling Skills, symlinks or an install hook
  to read the collaboration protocol.
- Each participant has a conditional protocol pointer and documents its own capabilities
  and boundaries. The original three have explicit capability-contract summaries;
  the additional seven retain their existing descriptions and domain workflows.
- Descriptions expose discoverable capabilities. Replace fixed cross-Skill
  routing instructions with capability needs; retain real command/schema dependencies.
- Preserve confirmed context, resource identifiers, user intent and write gates.
  Resume unfinished work after prerequisites; distinguish capability gaps from
  missing user decisions, permission, network and parameter errors.
- No Route Skill, runtime resolver, grant, custom tool, state machine, database,
  telemetry change, or te-claude/Sandbox modification. Product tracking: not applicable;
  existing actual-load and run evidence remain the observable sources.

## Verification boundaries

1. Sync/check CLI and release gate: fresh copies, idempotence, drift/missing-file
   detection, read-only check mode, invalid inputs, and package-local references.
2. Independently installed Skill folder: protocol remains readable with no sibling
   packages or source docs. Exercise the actual `skills` installer in a temporary
   project where available; never install into the user's normal Agent directories.
3. Agent evaluations: pure-domain, remaining task, prerequisite return, renamed/new
   target, misleading candidate, unavailable target, no-progress and write boundaries.
   Compare baseline and modified content; distinguish fixture reasoning from native
   product execution, and do not claim performance improvements from static tests.
4. Existing release, analysis, metadata, engage, build and smoke checks.

## Delivery and rollback

Publish through the existing Skill distribution workflow only with separate user
authorization. Commit generated copies with their source so `skills add` needs no
build step. Updating the shared source requires resync and participant patch-version
bumps where version/revision markers already exist. Roll back via a forward Skill
release restoring previous content; no migration.
Implementation completion and real-product behavioral acceptance are separate gates.

## Approved expansion

The follow-up request extends only distribution to the ten Skills above. Add the
same conditional pointer and generated file to the seven additional packages;
preserve the protocol, the first three packages, business workflows and safety gates.
Update the existing sync, release and standalone-install checks to cover all ten.
No other repository needs a source-code change for this design. Existing publication,
Skill sync/export or user reinstallation is still needed before consumers receive it;
those external distribution actions are not part of this local change.
See [expansion verification](expansion-verification.md) for this follow-up's evidence.
