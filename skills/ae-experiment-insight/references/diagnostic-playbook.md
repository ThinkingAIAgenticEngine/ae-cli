# Diagnostic Playbook

Validate the experiment in causal order. A downstream report cannot repair an upstream assignment or exposure failure.

## Contents

- [Identity through report aggregation](#1-identity)
- [Seven-part diagnostic checklist](#diagnostic-checklist)
- [SRM and deterministic analysis](#srm-interpretation)
- [Diagnostic fields](#diagnostic-fields)

## 1. Identity

Check:

- assignment identity is stable;
- anonymous and logged-in identities are reconciled as designed;
- server and client use the same subject;
- account or device switching cannot move a subject across groups;
- exposure and outcome events contain the join identity.

Evidence of identity instability invalidates naive group comparisons.

## 2. Configuration retrieval and assignment

Check:

- eligible subjects could retrieve configuration;
- assignment was deterministic;
- one subject maps to one group;
- configured allocation matches observed assignment;
- cache or fallback behavior did not concentrate users in control.

Apply the SRM rules in checklist A to the observed assignment.

## 3. Feature value and treatment activation

Check:

- group value matches the saved experiment configuration;
- treatment code applied the returned value;
- fallback/default behavior is observable;
- no code path fetched a value but failed to activate treatment.

## 4. Exposure

Check:

- exposure fires when treatment becomes effective, not merely on configuration fetch;
- one subject is not counted repeatedly unless the report definition expects repeated exposures;
- exposure coverage is comparable across groups;
- exposure timestamp precedes attributed outcomes;
- exposure delay and ingestion delay are understood.

## 5. Outcome

Check:

- source event, aggregation, analysis unit, numerator/value,
  denominator/population, filters, and attribution window match the registered
  metric;
- attribution window is complete;
- post-treatment filtering does not redefine the population;
- outcome identity joins exposure;
- metric instrumentation did not change mid-run.

When the metric name or description conflicts with its saved configuration,
interpret the saved configuration and flag the mismatch. Do not translate an
aggregation code into “conversion rate,” “per-user count,” or another business
meaning unless the report contract verifies its unit and denominator.

## 6. Report aggregation

Check:

- report version, time zone, filters, identity, and experiment version match the design;
- incomplete dates are excluded when required;
- sample-ratio and deduplication rules are understood;
- a platform backfill or data delay is not mistaken for a treatment effect.

## Diagnostic checklist

Run all seven checks when their required evidence exists. Use semantic results
equivalent to `normal`, `warning`, `failed`, or `unverified`. Do not turn a
missing input into a passing result.

### A. SRM monitoring

- Compare true assignment counts with configured allocations using a
  chi-square goodness-of-fit test.
- Use the pre-registered or platform threshold when available. Otherwise use
  `alpha_srm = 0.01` as the diagnostic default.
- Treat `p < alpha_srm` as a failed allocation-quality check and downgrade the
  overall conclusion.
- When assignment counts are unavailable, mark SRM as unverified; do not use
  exposure, analysis, or outcome counts as substitutes.

### B. Duration sufficiency monitoring

- Compare achieved sample per group with the pre-registered required sample
  and planned duration.
- Warn prominently when achieved sample is below `80%` of the requirement;
  keep `80%` to below `100%` classified as incomplete rather than sufficient.
- Treat reaching the sample target as sample sufficiency only; it does not
  prove trend stability or practical significance.
- When MDE, alpha, power, variance, or the planned sample is unavailable, mark
  the check as unverified instead of back-solving from the observed effect.
- When a valid traffic forecast exists, report the estimated date on which the
  required sample will be reached.

### C. Novelty-effect monitoring

- Run only after at least seven complete days of comparable trend data.
- Compare the treatment-versus-control effect in the first and second halves
  of the observed period.
- Warn when the early relative lift is greater than `1.5` times the late lift
  and the late-period effect continues to decline.
- Use absolute difference instead of relative lift when the control value is
  zero or relative lift is not meaningful.
- Treat this rule as a diagnostic heuristic, not proof that novelty caused the
  decline. Show the early/late values and the trend evidence.

### D. Metric-conflict monitoring

- Use the verified metric contract from the Outcome check; treat any unresolved
  definition mismatch as a metric-conflict warning.
- For two or more treatment groups, compare each treatment with control using
  the pre-registered multiple-testing policy.
- Warn when at least one treatment is significantly positive and another is
  significantly negative on the primary metric.
- Do not infer heterogeneous user response as the cause without segment or
  implementation evidence.

### E. Missing- or anomalous-data monitoring

- Inspect daily assignment, exposure, and metric sample counts for nulls,
  unexpected zeros, gaps, abrupt discontinuities, and group-specific loss.
- With enough complete dates, calculate the daily mean and standard deviation;
  mark dates outside `mean ± 3σ` as anomalous.
- Raise a data-anomaly warning when more than two dates are anomalous.
- Do not use the `3σ` rule on a short or structurally changing series. Mark the
  check as unverified and describe the missing evidence instead.

### F. Design-reasonableness monitoring

Verify that:

- the hypothesis names one interpretable treatment contrast and decision;
- control, treatment values, default behavior, targeting, and exclusions are
  explicit;
- group allocations sum to the configured total;
- the primary metric is sensitive to the intended treatment and matches the
  intended decision;
- MDE, alpha, power, planned sample or duration, and stopping rule exist when
  the decision requires them;
- multiple treatments use an explicit multiple-testing policy;
- expected interactions with concurrent experiments are considered.

### G. Overall data reliability

Synthesize the preceding checks:

- **Unreliable**: confirmed SRM, critical identity/assignment/exposure failure,
  invalid primary-metric definition, or broken report aggregation prevents a
  causal comparison.
- **Limited**: no critical failure is confirmed, but duration, novelty,
  conflict, anomaly, design, or required evidence remains unresolved.
- **Reliable**: design and metric definitions are coherent, SRM is verified and
  not triggered, achieved sample is sufficient, and no unresolved diagnostic
  issue can materially change the decision.

In the user report, state the overall reliability and give one-line results
for the executed checks. Expand only failed, warning, or unverified checks.

## SRM interpretation

An SRM alert identifies imbalance, not its root cause.

Investigate:

- targeting evaluated differently by group;
- assignment or hashing bug;
- identity migration;
- fallback concentrated in one group;
- group-specific exposure loss;
- bots, QA users, or exclusions applied after assignment;
- early stopping or staggered ramp.

## Deterministic analysis

Use `scripts/analyze_experiment.py` for SRM and group comparisons:

```bash
python3 scripts/analyze_experiment.py '{
  "metric_type": "binary",
  "control": "control",
  "expected_allocations": {"control": 0.5, "treatment": 0.5},
  "groups": [
    {"name": "control", "assigned": 10000, "sample_size": 9200, "successes": 1104},
    {"name": "treatment", "assigned": 10050, "sample_size": 9250, "successes": 1203}
  ],
  "alpha": 0.05,
  "alpha_srm": 0.01
}'
```

The script uses assignment-count chi-square SRM, a pooled two-proportion
z-test for binary metrics, Welch's t-test for continuous metrics, and
Bonferroni correction across treatments by default. Set `multiple_testing`
only to the pre-registered policy. It does not implement sequential tests,
CUPED, clustered variance, ratio-metric variance, or regression adjustment.

## Diagnostic fields

Use `Stage`, `Observation`, `Source`, `Severity`, `Inference`,
`Verification`, and `Remediation` to structure the analysis. In the final
report, present only findings that affect the decision. Use a table only when
the diagnosis is detailed enough that a table materially improves clarity.

Use severity:

- `critical`: invalidates the causal comparison;
- `material`: can change the decision and must be resolved;
- `warning`: limits precision or generalization;
- `informational`: useful context without changing validity.
