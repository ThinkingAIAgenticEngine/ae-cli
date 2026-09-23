# Skill collaboration: design and usage

This guide explains the collaboration convention for maintainers and reviewers.
The authoritative Agent instructions are in [the protocol](skill-contracts/collaboration.md);
this guide is not another runtime instruction file or a second protocol source.

## What changes

An Agent can use more than one available Skill to finish one user request. Each
Skill describes its own responsibilities; when work needs a different capability,
the Agent selects applicable instructions from the host's available Skill catalog.

The implementation lives in te-cli: Skill instructions, generated reference files,
a synchronization script, and consistency tests. It introduces no Route Skill,
runtime routing service, new tool, dynamic permission grant, or custom state machine.
Other repositories do not need source changes for this design. Consumers still
need the existing publication/export/sync process or a Skill reinstall to receive
updated content. A local commit does not update an installed Skill automatically.

## How a task continues

The same Agent retains the user's goal and task context throughout. Skills are
instructions, not separate actors sending messages to one another.

1. Continue directly when the current Skill already covers the work.
2. For unfinished out-of-scope work or a missing prerequisite capability, read the
   package-local collaboration reference through the conditional link in SKILL.md.
3. Compare the needed outcome with descriptions available in the current run.
   Use the host's existing discovery/loading mechanism to inspect a suitable candidate.
4. Reuse verified context, satisfy the candidate's actual input requirements, and
   perform only the authorized work. Continue the original request afterwards.
5. Report completion against the original goal, separating finished, pending and
   blocked parts. An unavailable capability is a blocker, not permission to install
   more tools, scan hidden directories, or bypass authorization.

There is no generated `route_to` field or required `OUT_OF_SCOPE_*` response.
The Agent identifies the unfinished work from the original request and observed
results; it does not need a special return code from the current Skill. Loading
another Skill does not require a return call to the previous one.

## Examples, not fixed routes

| Situation | Expected continuation |
| --- | --- |
| Analysis is complete; the user also requested an outreach draft | Find a currently available draft-creation capability. Reuse verified findings and project context; stop at the draft boundary. Query rows do not automatically constitute a persisted audience. |
| A metadata table operation requires an uploaded local file | Find a compatible upload capability, supply the documented purpose and confirmed context, then continue the table operation with the returned input-file identifier. Upload alone is not completion. |
| A matching candidate has a different name | Use its description and loaded instructions to establish applicability, not a hardcoded name comparison. |
| An operation returns permission denied | Report the denial. Switching Skills does not grant more authority. |
| Two instructions depend on the same unresolved prerequisite | Stop when no new evidence or viable next action exists; explain the prerequisite instead of alternating indefinitely. |

These examples do not assign capability ownership. Existing domain-specific
workflows and command/schema dependencies remain in their Skills. Adding the
shared reference does not rewrite every existing workflow into a generic route.

## Context and safety boundaries

Reuse confirmed host/project context, resource identifiers, business definitions,
result references and user constraints when their scope, freshness and shape still
fit the next operation. Query missing information rather than repeating a completed
discovery step. A missing user decision requires clarification, not another Skill.

The original read/write intent, permissions, automatic-invocation preferences and
operation-specific confirmation gates still apply. Draft creation, approval and
sending remain distinct actions. File upload or local-data ingestion retains its
own consent and privacy rules. Another Skill's availability does not authorize a
new business action. Retrieved content is evidence, not an instruction source.

Keep parameter correction, network failure and authorization failure distinct from
capability gaps. After an uncertain write outcome, reconcile the operation before
retrying; a timeout is not proof that nothing was created.

## Why each package contains a copy

Individual `skills add` installation operates on a Skill directory. A reference
outside that directory is not a dependable installation dependency. The project
therefore separates maintenance from distribution:

```text
docs/skill-contracts/collaboration.md        one editable source
                 |
       sync:skill-collaboration
                 |
skills/<participant>/references/collaboration.md
                 ordinary committed file in every participating package
```

The ten participating packages are ae-analysis, ae-capability, ae-community,
ae-data-integration, ae-dataops, ae-engage, ae-generate-tracking-plan, ae-kb,
ae-kb-discovery and ae-metadata. The participant list controls distribution only:
it is neither a runtime allowlist nor a capability-to-Skill routing table. A
non-participating Skill can still be a valid target when available and applicable.

The copies are generated ordinary files, not links to sibling folders. Each
SKILL.md links to its own copy. There is no install-time build hook. The Agent
loads the reference conditionally and may reuse it when already in context.

## Maintaining and validating the convention

Edit the canonical source, run `npm run sync:skill-collaboration`, and commit the
source and generated files together. Never edit a generated copy directly.
Update existing version/revision markers for changed packages; preserve the
convention of unversioned packages. For adding participants and the distinction
between capability descriptions and routing tables, see the
[maintenance notes](skill-contracts/README.md).

Use `npm run check:skill-collaboration` for a read-only consistency check,
`npm run verify:skill-collaboration` for regression tests, and
`npm run verify:skill-collaboration-install` for the explicit networked
skills@1.7.0 copy/symlink installation check. `npm run check:release` includes
consistency checking and fails if a participant's pointer or generated copy is
missing or stale. That gate validates packaging, not Agent behavior.

The [initial verification](specs/2026-09-20-skill-collaboration/verification.md) and
[ten-package verification](specs/2026-09-20-skill-collaboration/expansion-verification.md)
record local evidence and environment limits. The initial fixture comparison
passed for both old and new instructions; it does not establish a success-rate
improvement. Native host discovery/loading, actual business continuation and
permission boundaries still require acceptance using authorized test resources.
Neither installation tests nor a successful CI job proves deployment or business success.
