# Experiment SDK Knowledge and Execution Router

Read this reference only when the user explicitly asks about an A/B experiment SDK, client experiment SDK integration, experiment SDK code, or SDK troubleshooting.

Do not read or apply this reference for a normal experiment-design, Feature-design, sample-size, readiness, or draft-creation request. An experiment requiring a product change does not by itself authorize or trigger SDK work.

Examples that activate this reference:

- “How do I integrate the Android experiment SDK?”
- “Generate the client SDK code for this experiment.”
- “Why does the experiment SDK always return the default?”

Examples that do not activate it:

- “Create an experiment for a blue versus green button.”
- “Design the groups and traffic for this Feature.”
- “Create an experiment draft.”

## Four-layer architecture

Use the following layers for different jobs:

1. **Skill workflow** — `SKILL.md` enforces the explicit SDK activation gate; this reference classifies the request as knowledge, client integration, project-bound generation, or generic data integration.
2. **Bundled references** — concise experiment contracts, platform notes, and troubleshooting answers. Read only the files required by the request.
3. **Local official Wiki** — use the synced official documentation for exact packages, imports, signatures, and version-specific behavior that is not covered by references.
4. **Dedicated generation capability** — use an inspected `ae-cli` capability to combine a real project, Feature, experiment, and SDK type into project-bound code.

References supply knowledge. A generation capability supplies project context and execution. Do not substitute one for the other.

## Request decision

| User intent | Route |
|---|---|
| “How does automatic exposure work?” | `experiment-sdk-contract.md` + `exposure-contract.md` |
| “How do I initialize Android/iOS/JS experiment SDK?” | `sdk-index.md` + `client-experiment-sdk.md`; consult the local Wiki main page when exact code is required |
| “Should assignment happen on client or server?” | `experiment-sdk-contract.md` + the matching client/server/hybrid reference |
| “Why do I always get the default?” | `sdk-troubleshooting.md`, then the verified platform main document |
| “Generate code for this project/experiment” | `platform-operations.md` + this reference; resolve real assets and use a dedicated inspected capability |
| “How do I call track/user_set or configure LogBus?” | Route to `ae-data-integration-helper` |

## Documentation source order

For SDK knowledge, search in this order:

1. Read the matching bundled reference.
2. If `~/.ae-cli/wiki/te-docs/index.md` exists, inspect it and the most relevant document under `synthesis/`.
3. Read the latest main document under `~/.ae-cli/wiki/te-docs/raw/`; ignore historical or versioned pages unless the user explicitly targets that version.
4. If the local mirror is absent or incomplete, use the verified official online document listed in `sdk-index.md`.

You may also use:

```bash
ae-cli tracking wiki search "experiment SDK"
ae-cli tracking wiki search "remote config"
```

Treat an empty search as a documentation gap, not proof that the product has no capability.

Do not hardcode a guessed Wiki path. Verify that an indexed local path exists before reading it. If the local page and bundled reference disagree, prefer the newer verified main document and disclose the conflict.

## Exact-code gate

Emit exact imports, packages, classes, methods, configuration keys, defaults, and version requirements only when all of the following are known:

- SDK platform and language;
- exact or compatible SDK version;
- verified main documentation;
- client, server, or hybrid ownership;
- assignment identity and Feature value type.

Otherwise provide architecture-level pseudocode and a verification checklist.

Application SDKs consume published configuration and report exposure or outcome events. They must not read or mutate AE platform configuration.

## Project-bound generation

For a request tied to a real project:

1. Resolve the project through `ae-cli`.
2. Resolve the exact experiment and Feature; do not accept a name-only guess.
3. Confirm target platforms and versions.
4. Search the Capability Gateway for experiment SDK sample generation.
5. Inspect every plausible capability and its input schema.
6. Validate or dry-run once when needed, then run the selected capability.
7. Return only artifacts and metadata present in the successful response.

Do not assume a proposed name such as `generate_experiment_sdk_sample` exists. If no dedicated capability is available, say so and provide a project-independent template with placeholders; do not call it generated project code.

## Required integration contract

Every SDK deliverable must define:

- architecture: client, server, or hybrid;
- initialization and dependency order;
- assignment identity and identity transitions;
- Feature key, value type, and typed default;
- fetch, cache, timeout, stale-value, and retry behavior;
- point where the assigned behavior becomes effective;
- automatic or manual exposure ownership;
- outcome event and identity join;
- debug/test procedure;
- acceptance checks.

Configuration retrieval is not exposure. Do not record exposure when the assigned behavior was never applied.

## Generic integration boundary

Do not duplicate generic SDK ingestion material here. When `ae-data-integration-helper` is bound, use it for:

- analytics SDK initialization unrelated to experiment ordering;
- `track`, user properties, identity APIs, and data validation;
- upload failures, LogBus, REST, and collection logs.

If it is not bound, answer the experiment-specific portion and state that the generic integration dependency is unavailable.
