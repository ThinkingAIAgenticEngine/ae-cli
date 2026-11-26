# Decision Framework

Apply this framework only after the diagnostic playbook produces an overall
data-reliability assessment.

## Gate 1: Trust

If a critical identity, assignment, exposure, metric-definition, or report-integrity issue remains unresolved, choose `invalidate because of data quality` or `insufficient evidence to decide`. Do not recommend rollout.

## Gate 2: Primary effect

Evaluate all four:

- direction;
- confidence interval and p-value;
- relation to the pre-specified MDE;
- practical business value.

Possible interpretations:

- interval supports a valuable positive effect: rollout candidate;
- significant but below business threshold: keep control or redesign;
- interval includes meaningful positive and negative effects: continue to the planned sample if allowed;
- precise interval excludes a worthwhile effect: keep control or redesign;
- meaningful negative effect: stop or keep control.

Do not use observed power as a substitute for the confidence interval.

## Gate 3: Duration and stopping

Follow the pre-specified stopping rule. Avoid declaring success at a convenient intermediate date. Continue only when:

- the experiment has not reached planned sample/duration;
- data quality is acceptable;
- extension does not introduce an unplanned peeking rule.

Recommend more runtime only when additional observations can resolve the
remaining uncertainty. More time does not repair an invalid metric definition,
missing decision-critical evidence, identity or exposure defect, or
instrumentation mismatch.

Do not recommend changing a running experiment's primary metric definition as
a retroactive repair. Analyze a newly added metric as exploratory, or
recommend a corrected confirmation experiment when the pre-registered
decision contract must change.

## Gate 4: Trends and segments

Require stability across complete time periods. Treat post-hoc segment wins as exploratory unless they were pre-registered and multiple testing was controlled.

Without complete trend evidence, describe only the current cumulative
direction. Do not label the effect stable, robust, sustained, expanding, or
decaying.

Recommend segment rollout only when the segment definition is operationally reproducible and the evidence is independently credible.

## Decision statement

Include:

- chosen action;
- trust status;
- primary effect and interval;
- diagnostic summary;
- business threshold comparison;
- unresolved uncertainty;
- exact next platform or engineering action.

Use `insufficient evidence to decide` when evidence is missing. Do not force every experiment into ship/no-ship.
