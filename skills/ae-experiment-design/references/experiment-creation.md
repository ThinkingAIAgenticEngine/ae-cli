# Experiment Draft Creation

Use this reference when the user asks to create, save, or reuse an A/B experiment draft.

## Execution boundary

- Perform every platform read or write through `ae-cli`.
- Discover and inspect the current capability before constructing input.
- Do not assume Feature, layer, metric, group, targeting, duration, or traffic fields before inspecting the current schema.

## Creation contract gate

Before writing a draft, establish the minimum semantic contract:

1. verified project ID and host;
2. experiment variable and the user-visible or system behavior that changes;
3. experiment goal and one primary metric with an exact feasible definition;
4. target population and material exclusions;
5. stable assignment unit and identity join path;
6. one control group and at least one treatment group, with typed Feature values and allocations totaling `1.0`;
7. experiment traffic, targeting, and a resolved layer or explicit new-layer plan;
8. Feature ownership, key, type, and typed default;
9. when the draft requires a duration, a confirmed sample target and
   formula-derived duration.

Do not create a prose-only shell that leaves the experiment variable, group behavior, primary metric, target population, or assignment identity undefined. Ask one focused question at a time when a missing answer materially changes the draft.

## Design heuristics are not platform facts

Use these only as recommendations and verify that the identity exists and remains stable:

- pre-login experience: usually `#distinct_id` or a stable device identity;
- authenticated user experience: usually `#user_id`;
- account-wide B2B behavior: an account identity;
- device-specific rendering or performance: a device identity.

Do not silently choose an assignment identity. Explain the material identity risk and obtain confirmation when more than one viable identity changes who receives a consistent experience.

## Authorization gate

A draft write is authorized when either condition holds:

- the user reviewed the proposed design and then explicitly asked to create or confirmed creation; or
- the user's current request explicitly says to create and already provides an exact, complete creation contract.

If the design contains recommended or inferred choices that the user has not reviewed and those choices materially affect assignment, audience, behavior, metrics, or traffic, show a compact plan summary and ask for confirmation before writing.

Do not ask for redundant confirmation when the user has already confirmed the unchanged plan. Design-only language is not authorization to create. Draft authorization never authorizes submit, start, live traffic changes, pause, end, or delete.

## Resolution and idempotency

Before creating assets:

1. resolve the project;
2. search for exact or likely duplicate experiment drafts;
3. inspect any likely duplicate before deciding to reuse it;
4. resolve the exact Feature, layer, and metrics;
5. verify definitions, types, defaults, ownership, status, and remaining traffic;
6. identify existing active or draft experiments that may interact with the same Feature, layer, audience, or identity.

Reuse only an exact semantic match. Similar names are not enough. If an exact-match draft already exists, reuse it and report that outcome instead of creating a duplicate.

An empty list is not proof of no conflict. Only a supported conflict check can justify a user-facing "no conflict" result.

## Materialization sequence

Use the inspected schemas and execute only the steps required for this design:

1. create or reuse an exact metric when its definition is complete;
2. create or reuse an inactive Feature with the correct type and default;
3. create or reuse a compatible layer with verified assignment identity and sufficient traffic;
4. assemble experiment name, falsifiable hypothesis, Feature bindings, groups, allocations, traffic, targeting, metrics, and any required schedule fields;
5. validate or dry-run once when appropriate under `platform-operations.md`;
6. save the experiment as a draft;
7. read back the draft and verify its persisted fields;
8. run supported readiness and conflict checks;
9. return a concise creation receipt and experiment-detail link.

Do not claim atomic success when supporting assets were created but the experiment save failed. Report created, reused, failed, and unresolved assets separately.
Immediately before saving, revalidate the creation contract against the inspected schema and ensure no proposed ID is being presented as an existing platform ID.

## Post-save verification

A successful write response is not sufficient by itself. Read back the saved or reused draft and verify, when returned by the platform:

- actual experiment ID and name;
- project ID;
- draft status;
- Feature and layer bindings;
- group names, values, and allocations;
- experiment traffic and targeting;
- primary event metric and calculation code.

Run readiness and conflict checks only when supported. Report each check separately and do not translate "not run" into "passed".

## User-visible completion

Return an operation receipt, not the discovery log. Include:

- created, reused, partially completed, blocked, or failed;
- experiment name, actual ID, and draft status;
- control and treatment values and allocations;
- experiment traffic and primary metric;
- readiness and conflict results that actually ran;
- at most three material blockers or semantic risks;
- the clickable experiment-detail link required by `SKILL.md`.

Do not expose raw candidate lists, capability discovery, request schemas, commands, or internal execution narration unless the user explicitly asks for an audit or debugging view.
