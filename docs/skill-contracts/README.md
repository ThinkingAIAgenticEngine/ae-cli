# Maintaining the collaboration convention

For the design rationale, task examples and rollout boundaries, read the
[collaboration guide](../skill-collaboration.md). This directory holds the authoritative
protocol source and its maintenance instructions.

`collaboration.md` is the only editable protocol source. Runtime decisions remain
with the Agent and the host's existing Skill discovery, loading and authorization.

Run `npm run sync:skill-collaboration` after editing the source. Commit its generated
copies with the source and bump each changed Skill's existing version/revision marker.
Preserve the convention of packages without a version marker; do not invent a prior version. The
release gate checks copies without rewriting them. Git-based `skills add` consumes
committed folders, not a local build or npm install hook.

The participant list in `scripts/sync-skill-collaboration.mjs` controls only which
packages receive the document. To opt in another Skill, retain or add its capability scope,
the conditional package-local link, and its name to that list. Existing Skills do
not gain a new target name or route. An available non-participant may still be a
useful target; the host's current catalog is the discovery boundary.

Existing descriptions and domain workflows may already define a Skill's capabilities
and boundaries; opting into the shared protocol does not require rewriting them into
a new heading or replacing their specialized procedures.

Keep the protocol free of business Skill names and capability-owner tables. Put
discoverable capabilities in each Skill's description and operation-specific
inputs/outputs/boundaries in its body. Command/schema dependencies remain local
technical documentation, not mandatory cross-Skill routing.

Use `npm run check:skill-collaboration` for a read-only consistency check and
`npm run verify:skill-collaboration` for deterministic regression tests. See the
implementation spec and evaluation cases for behavioral acceptance. Package
consistency alone does not establish native discovery or business-task success.
