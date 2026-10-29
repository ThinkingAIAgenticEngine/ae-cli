# Metric Readiness

Use this checklist to decide whether a candidate metric can support an experiment decision.

## Contents

- Supported experiment metric contract
- Preregistered planning policy
- Evidence levels
- Feasibility gates
- Role selection
- Common blockers
- Required output

## Supported experiment metric contract

Use event metrics only. A platform enum or API field is not evidence that
another metric kind is implemented in the report calculation path.

Use only these event calculation codes:

| Code | Calculation | User-level value | Planning type |
| --- | --- | --- | --- |
| `A101` | Triggered users | Whether each user triggered the event; compare group trigger rates | `proportion` |
| `A100` | Total times | Each user's total event count; compare group user-level means | `continuous` |
| `A201` | Days | Each user's distinct active-event days; compare group user-level means | `continuous` |
| `A103` | Sum | Each user's sum of a numeric event property; compare group user-level means | `continuous` |
| `A104` | Average | Each user's average numeric event-property value; compare group user-level means | `continuous` |
| `A106` | Maximum | Each user's maximum numeric event-property value; compare group user-level means | `continuous` |
| `A108` | Distinct count | Each user's distinct count of one event property; compare group user-level means | `continuous` |

Require a numeric event property for `A103`, `A104`, and `A106`, and an exact
event property for `A108`.

The current report calculation uses a two-sided Z test for both planning
types, returns p-value, lift, and a 95% confidence interval, and uses
`p < 0.05` plus confidence-interval direction and goal direction to label a
positive or negative significant result.

## Preregistered planning policy

Fix the family-wise significance level at `alpha=0.05`, the confidence level
at `0.95`, and the test direction at two-sided to match current reporting.
Use `power=0.80` as the explicit planning-policy default when the user does not
provide power, and label its source as `policy_default`.

Require the MDE before definitive planning. Record whether it is `relative` or
`absolute` and whether the desired effect is an `increase` or `decrease`; never
silently substitute a 5% lift. Require observed user-level standard deviation
for continuous metrics; never substitute an assumed coefficient of variation.

For one control and multiple treatments, treat each treatment-versus-control
comparison as one member of the same family. Use Bonferroni planning:
`alpha_per_comparison = 0.05 / number_of_treatments`. Return the family alpha,
adjusted alpha, method, and comparison count. The current native report still
labels significance with unadjusted `p < 0.05` and a 95% confidence interval,
so use raw p-values against the preregistered adjusted threshold for the final
decision and disclose that native-label mismatch.

Use a minimum runtime of seven days and align recommendations to full weeks by
default; permit explicit overrides when the decision context justifies them.
When traffic is not fixed, evaluate absolute experiment-traffic candidates no
greater than the verified layer capacity and choose the smallest candidate
that reaches the sample target within the maximum runtime. If none is feasible,
return the true duration at maximum available traffic and mark it infeasible;
never truncate the duration to the maximum.

Do not add ad hoc missing-value imputation, winsorization, truncation, or
post-treatment exclusions. Use the exact platform metric definition and
preregister any supported filtering or data-quality rule before the run.

Call `calculate_experiment_plan.py` with `metric_type`, `baseline`, `mde`,
`mde_type`, `effect_direction`, `allocations`, and `daily_eligible_units`.
Pass `standard_deviation` for a continuous metric. Pass `experiment_traffic`
when traffic is confirmed; otherwise pass `max_available_traffic` and
optionally `traffic_candidates` to request a recommendation. `power`,
`min_runtime_days`, `max_runtime_days`, and `align_to_full_weeks` may override
their policy defaults. Do not pass `confidence_level` other than `0.95`.

Do not create or recommend a metric outside this contract. If the requested
business outcome cannot be expressed by one supported event calculation,
state that it is unavailable and propose the closest valid event metric
without representing it as equivalent.

## Evidence levels

Label every statement:

- `verified`: supported by current `ae-cli` platform output;
- `provided`: supplied by the user but not verified on the platform;
- `assumed`: introduced for design or sensitivity analysis;
- `missing`: required evidence is unavailable.

Only `verified` or explicitly accepted `provided` evidence can support a final readiness decision.

## Feasibility gates

A metric is feasible only when all applicable gates pass:

1. **Contract**: event, supported calculation code, required property, goal
   direction, filters, and attribution window are explicit.
2. **Source**: required events and properties exist or are supplied as a concrete schema.
3. **Identity**: assignment, exposure, and outcome share a stable join path.
4. **Ordering**: outcome is attributed after exposure or treatment activation.
5. **Population**: pre-treatment eligibility and exclusions are reproducible.
6. **Planning evidence**: baseline, MDE and its type and direction, eligible
   daily units, verified layer capacity when recommending traffic, and—except
   for `A101`—user-level standard deviation are available before a definitive
   sample or duration calculation.
7. **Stability**: collection and definition are not expected to change during the experiment.
8. **Sensitivity**: the metric can plausibly respond to the treatment.

Block or mark unverified when any required gate lacks evidence.

## Role selection

### Primary

Choose one supported event metric closest to the hypothesis and decision.
Confirm its calculation code and direction, then establish its baseline and
minimum business-relevant effect. Do not calculate a definitive duration
before the metric contract is confirmed.

## Common blockers

- missing exposure event or treatment-activation marker;
- assignment uses `user_id` while outcomes only have `device_id`;
- anonymous-to-login identity cannot be reconciled;
- cross-device identity is unstable;
- outcome precedes exposure;
- denominator is filtered by post-treatment behavior;
- event volume is too low;
- metric definition or instrumentation changed during the run;
- cross-platform events use incompatible identities or semantics.

## Required output

For each candidate, return:

| Metric | Status | Event | Calculation | Property | Direction | Join identity | Window | Evidence | Reason or remediation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

When blocked, give the smallest concrete instrumentation or identity change that would make the metric measurable.
