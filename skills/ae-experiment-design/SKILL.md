---
name: ae-experiment-design
description: "Design AE/TE A/B experiments from a business goal through a reviewable draft. Use when the user asks to form an experiment hypothesis, assess metric readiness, choose or create metrics and Features, design groups or traffic, estimate sample size or duration, create an experiment draft, or run readiness and conflict checks. SDK guidance is a conditional branch: enter it only when the user explicitly asks about an A/B experiment SDK, client SDK integration, experiment SDK code generation, or SDK troubleshooting; do not include SDK work in an ordinary experiment-design or draft-creation request."
---

# AE Experiment Design and Integration

Turn a business objective into an evidence-backed experiment design, an implementation contract, and, when requested and supported, an AE experiment draft.

## Hard boundaries

- Use `ae-cli` for every AE/TE platform interaction. Do not substitute raw HTTP, browser automation, direct database queries, or application SDKs.
- Do not infer an SDK request from the fact that an experiment needs implementation. Load SDK references only when the user explicitly asks about an A/B experiment SDK or client SDK integration.
- Do not copy general tracking SDK documentation into this Skill. Route generic initialization, event reporting, `track`, user identity, user properties, data upload, LogBus, and REST questions to `ae-data-integration-helper` when that Skill is available.
- Use only the event-metric calculation contracts defined in
  `metric-readiness.md`. Bind one confirmed primary event metric and do not add
  unsupported metric roles.
- Never claim that a platform asset exists, was created, passed a check, or generated project code without a successful `ae-cli` response.
- Never invent platform IDs, schemas, SDK APIs, versions, defaults, or behavior.

## Progressive disclosure router

Read only the references needed for the current request:

| Request | Required references |
|---|---|
| Any AE/TE platform read or write | [`references/platform-operations.md`](references/platform-operations.md) |
| Create or reuse an experiment draft | [`references/experiment-creation.md`](references/experiment-creation.md) and [`references/platform-operations.md`](references/platform-operations.md) |
| Metric selection, feasibility, or creation | [`references/metric-readiness.md`](references/metric-readiness.md) |
| Explicit A/B experiment SDK or client SDK integration request | [`references/sdk-integration.md`](references/sdk-integration.md) |
| Exact SDK version, dependency, class, or source lookup | [`references/sdk-index.md`](references/sdk-index.md) |
| Cross-platform Feature, default, fetch, cache, or assignment behavior | [`references/experiment-sdk-contract.md`](references/experiment-sdk-contract.md) |
| Android, iOS, or JavaScript experiment SDK | [`references/client-experiment-sdk.md`](references/client-experiment-sdk.md) |
| Server-side assignment or evaluation | [`references/server-experiment-sdk.md`](references/server-experiment-sdk.md) |
| Server assignment with client rendering | [`references/hybrid-experiment-sdk.md`](references/hybrid-experiment-sdk.md) |
| Exposure design, deduplication, or metric join | [`references/exposure-contract.md`](references/exposure-contract.md) |
| SDK retrieval, default, identity, exposure, or debug issue | [`references/sdk-troubleshooting.md`](references/sdk-troubleshooting.md) |

References are a curated fast path, not the whole documentation set.

## Workflow

### 1. Frame the decision

Extract:

- business goal and desired direction;
- experiment variable and user-visible change;
- target population and exclusions;
- decision that the result must support;
- success threshold.

Convert these into a falsifiable hypothesis. Clarify only missing facts that materially change the design. For a conversion goal, establish the population, denominator or exposure behavior, numerator behavior, attribution window, and analysis unit.

Do not silently invent a target population, conversion definition, or technical platform.

### 2. Resolve the project and evidence

Pass the project gate in `platform-operations.md`. With `ae-cli`, establish candidate exposure and outcome events, assignment identity and join path, timestamps, exact saved-metric definitions, and—when available—baseline and eligible traffic.

If the project is unavailable, accept user-provided schemas or definitions and label all platform-dependent conclusions as unverified.

### 3. Assess metric readiness

Apply `metric-readiness.md`. Classify candidates as `recommended`, `available`,
`blocked`, or `unverified`; recommend one primary event metric and confirm its
calculation code before planning sample size or duration.

### 4. Design Feature, assignment, and groups

Define the Feature key, type, typed default, ownership, stable assignment unit, one control group, treatment groups, group values, traffic, allocations, layer, targeting, and exclusions.

Require allocations totaling `1.0`, experiment traffic in `(0, 1]`, type-correct values, a stable exposure-to-outcome identity join, and at least one primary metric. Resolve real Features and layers with `ae-cli` before reuse or creation.

### 5. Calculate sample size and duration

Follow this order: confirm the primary metric and calculation code → obtain its
baseline, MDE, and any required variance → calculate the sample target with
[`scripts/calculate_experiment_plan.py`](scripts/calculate_experiment_plan.py)
→ derive duration from the sample target and effective eligible daily units.
Apply the preregistered planning policy in `metric-readiness.md`. Use fixed
`alpha=0.05` and two-sided testing, policy-default `power=0.80`, and Bonferroni
planning for multiple treatments. Require the MDE type and direction; never
default MDE to 5% or assume variance for a continuous metric.

When experiment traffic is already confirmed, calculate its duration. When it
is not confirmed, obtain verified layer capacity and let the script recommend
the smallest absolute traffic candidate that reaches the target within the
maximum runtime. Default to at least seven days and full-week alignment. Return
the actual infeasible duration instead of truncating it. Explain the baseline,
MDE, power source, allocations, multiplicity rule, traffic evidence, sample
targets, duration adjustment, and any native-report mismatch. Do not return a
definitive plan when required evidence is unavailable.

### 6. Materialize the design

For an explicit draft-creation request, follow `experiment-creation.md` and `platform-operations.md`. Create only authorized draft assets, verify the saved result by reading it back, run supported readiness and conflict checks, and return the compact receipt and experiment link defined there.

Submitting, starting, changing live traffic, pausing, ending, or deleting requires separate explicit confirmation. Never turn draft creation into launch.

## Output requirements

- Use the language explicitly requested by the user. Otherwise, use the language of the user's latest substantive message.
- Localize all user-visible prose, including headings, table headers, field labels, status names, recommendations, warnings, assumptions, and next actions.
- Keep code, commands, raw IDs, event/property/metric names, Feature keys, SDK/API names, and official enum values unchanged when translation would alter their technical meaning.
- Treat section names in this Skill as semantic guidance, not literal output text. Do not copy an English heading into a non-English response.
- For a design request, lead with the experiment recommendation. For a creation, validation, or conflict-check request, lead with the operation outcome.
- Include only the smallest set of relevant sections; do not reproduce every workflow stage.
- Separate observed platform evidence, verified documentation, deterministic calculations, design judgments, and unresolved assumptions.
- Before responding, check every heading, table header, label, and status for unintended mixed-language output.

Treat project resolution, metadata discovery, candidate-event searches, metric comparison, Feature and layer inventory, capability discovery, schema inspection, and command execution as internal working context.

- Do not narrate the execution sequence in the final answer. Omit phrases such as "first load the reference", "now query in parallel", "verified with ae-cli", or "the evidence collection is complete".
- Do not expose raw commands, capability IDs, request schemas, full candidate lists, or a platform-evidence dump unless the user explicitly asks for the evidence, audit trail, or debugging details.
- Surface platform evidence only when it changes the design, blocks the operation, reveals a material semantic mismatch, or requires user confirmation. Summarize it in at most three concise bullets by default.
- Do not repeat the full experiment design after a creation request unless the user explicitly asks for the complete design.
- Do not expose hidden reasoning. Give the conclusion, the user-relevant basis, and the action result.

## Failure behavior

- Missing project or ambiguous host: show candidates and ask; do not guess.
- Missing metadata: return the required event, property, identity, and timestamp checklist.
- Experiment product unavailable:
  - State that the project has not enabled the experiment product only when an
    explicit platform entitlement result establishes that fact. A missing
    capability alone means the experiment capability is unavailable, not that
    the product was not purchased.
  - For a design request, tell the user that experiment design can continue,
    but Feature, layer, metric, and traffic details cannot be verified on the
    platform. Continue with an offline design and request the baseline, MDE,
    and eligible daily units when sample-size or duration planning needs them.
  - For a draft-creation request, lead with the outcome that the experiment
    draft was not created. Explain that Feature, layer, and draft creation are
    blocked, preserve the proposed design, and say that platform creation and
    readiness checks can continue after the product is enabled or the required
    access is granted.
- HTTP 403 or equivalent permission denial: state that the current account
  lacks the required experiment permission, stop dependent writes, and explain
  that this result does not establish whether the project purchased the
  experiment product. Ask the project administrator to check both product
  availability and the user's project permissions.
- Capability gap without an explicit entitlement or permission result: report
  that the current environment does not expose the required experiment
  capability, continue with an offline design when useful, and do not bypass
  `ae-cli`.
- For SDK gaps or conflicts, follow `sdk-integration.md`; do not invent exact code.
- Validation failure: correct documented input or ask for the missing value; do not retry unchanged input.
- Partial success: report created and failed assets separately and never imply atomic success.
