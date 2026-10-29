# Community Agent capability development

This policy applies only to community-domain changes. The preset community Agent is the designated user-facing Agent entry for community capabilities; CLI commands, dynamic capabilities, and scenario skills are its execution building blocks. Maintain one coherent product experience as coverage expands.

## Before implementation

1. Identify the concrete user task and maintained line: `release/6.0` or `release/6.1`. Community CLI work has no 5.0 development scope.
2. Read the relevant current product introduction, latest applicable release notes, and version-specific product documentation. Re-open the actual authoritative documents; a cached revision or a Git branch alone is not evidence of the latest shipped product.
3. Verify the relevant product UI and behavior in the named, authorized environment through read-only inspection. Record environment, product version, date, document revisions, and release/feature-state evidence. Do not trigger collection, processing, configuration changes, or other business writes merely to discover a feature.
4. Compare that evidence with the target backend/Gateway, CLI help and schemas, installed product/scenario skills, preset Agent behavior/tool discovery, and internal navigation. Record gaps and version differences before choosing the slice.
5. If current product evidence is unavailable, record the exact gap. Specifications and source investigation can continue, but do not claim current-product parity or pass the new-function predevelopment comparison. Resolve contradictions before implementing dependent behavior.

The cross-repository product record lives in `apollo_agent/docs/scenarios/community-agent-cli/CAPABILITY_EVOLUTION.md`; its Agent definition is under `agent/`, and user instructions are in `USER_GUIDE.md`. Resolve the coordinator repository from the current workspace registry. These are development sources, not content to expose to customer Agents.

## Decide what to expose

Prefer reusable tasks such as metadata discovery, custom queries, matching-scope detail, source evidence, status/result lookup, and validated configuration actions. Judge value by a complete user task, composability, evidence, authorization, cost, and testability rather than the number of command aliases.

- Use L3 dynamic capabilities by default. Apply [capability-command-admission.md](capability-command-admission.md) for L1 orchestration or L2 typed/output value.
- A UI feature may need several atomic capabilities or a reusable workflow. A purely presentational function may need a verified internal link instead of a redundant command.
- Record excluded or deferred functionality with the reason and the missing contract. Do not expose arbitrary internal APIs, SQL, or privileged actions to claim greater coverage.
- Preserve existing consumers and shared authentication/output behavior. Declare every shared touch point and validate it; do not promise zero side effects without evidence.

## Keep the delivery aligned

For every added, changed, or retired community capability, update a single version-specific coverage entry with:

- user task and current product/document evidence;
- backend/Gateway operation, stable capability/command, schema, risk and authorization;
- output semantics, empty/unknown/partial states, task result identity and relevant data freshness limits;
- product skill reference and selected scenario workflow;
- preset Agent discovery, behavior, allowed execution path, and minimum binding requirements;
- verified internal route, complete identifiers, link behavior and authorization boundary, or an explicit unavailable state;
- user documentation and representative business-task acceptance evidence;
- independent local, published, deployed, and accepted states for each maintained version.

Prompt wording alone cannot add a tool, enforce product purchase, or prove runtime compatibility. A new CLI command is not delivered to the preset Agent until the matching skill/runtime/backend is available and the task works through that Agent. Do not hardcode every command into the prompt: maintain discoverable schemas and task references, then update prompt-level behavior when semantics change.

For the current quality boundaries, read [community-data-quality.md](../skills/ae-community/references/community-data-quality.md): distinguish lag from business change, summary hints from confirmed irrelevant content, independent corroboration from reposts, and interaction snapshots from continuous tracking. Keep these behaviors synchronized with product changes.

## Verification and release record

Run affected CLI/contract checks and shared regressions appropriate to the change. Separately verify representative tasks through the preset Agent in the actual target runtime, including relevant permission failures, missing/partial data, source authority, and internal links. Model-task success is not established by unit tests, an HTTP 200, or prompt linting.

Track backend, CLI, system-skill, prompt and runtime versions together. Adapt and validate 6.0/6.1 independently; do not merge an entire maintained line as a shortcut. Code, tests, publication, deployment, UI-link behavior, and customer acceptance must have separate evidence. Follow repository authorization rules for external changes.

Product changes, discovered gaps, API/schema changes, and task failures trigger this comparison in the next relevant iteration. This rule does not create a scheduler, background monitoring task, or automatic publication.
