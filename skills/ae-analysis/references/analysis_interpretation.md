# Analysis interpretation

Consult the relevant section for an unfamiliar aggregation, cohort or attribution rule. Query/result handling follows [the retrieval reference](analysis_data_retrieval.md#preserve-and-interpret-results).

## Scope and evidence

Compare the same metric definitions, populations, filters, time grain, timezone and physical route. Check executed windows once: use equal complete, non-overlapping periods or an explicit exposure normalization; label partial periods. Overlapping rolling windows and cumulative stocks are not independent flows. Correct the selected `model_type` branch of schema errors; other model branches do not add requirements.

Use actual titles, row/column metadata, scope and completeness fields. Null, missing, failed, unauthorized, partial, truncated and not-yet-observable values are unknown, not zero. A successful empty query means no matches only in its verified effective scope. A failed item does not invalidate independent successful evidence.

Use completed values with their reported units; round only for display.

## Populations, ratios and grain

Identify the numerator, denominator, analysis unit and eligibility rule before calculating. Weighted overall rates use matching denominator weights; a zero denominator is undefined. For nullable measures, compare source-row and non-null-value coverage. An observed-value average need not describe the whole population.

A share or conversion rate requires a verified subset relationship. Counts from different events may be reported as counts, or explicitly as a ratio of counts; they do not establish user composition. Equal counts do not establish equal sets. A larger count rules out only the direction of containment contradicted by that inequality.

A sum of daily active users is user-days, not distinct period users. Use independent distinct totals for overlapping dates, groups or event sets. Never add totals to detail rows. Before joining sources, verify business keys, join cardinality, unmatched keys and duplicate amplification; display names and row positions are not stable keys.

For compound conditions, preserve unknown: AND is false if any condition is confirmed false, true only if all are true; OR is true if any is true, false only if all are false. Otherwise the result is unknown, including negated unknown.

## Absolute contribution for additive metrics

Use matching, exhaustive, non-overlapping groups for amounts, event counts or verified disjoint counts:

```text
delta_total = total_comparison - total_baseline
delta_dimension_i = value_i_comparison - value_i_baseline
contribution_i = delta_dimension_i / delta_total * 100%
```

Reconcile group deltas to the independent total, then rank by `abs(delta_dimension_i)` with its sign. Report baseline, comparison, absolute and relative changes. Positive/negative contributions can exceed 100% when they offset. A zero baseline makes relative growth undefined; a zero total delta makes contribution shares undefined. Explain unmatched scope or residuals; derive rounding tolerance from displayed precision, not an arbitrary percentage.

## Ratio and conversion decomposition

Use only when structural attribution is requested and groups are exhaustive and mutually exclusive. Show underlying numerators and denominators; weights are denominator shares:

```text
rate_effect_i = ((weight_i_baseline + weight_i_comparison) / 2) * (rate_i_comparison - rate_i_baseline)
composition_effect_i = ((rate_i_baseline + rate_i_comparison) / 2) * (weight_i_comparison - weight_i_baseline)
```

The effects sum to the total rate change. Base-weight/base-rate formulas require the interaction term separately or split equally as above. An undefined subgroup rate cannot be replaced with zero; report unmatched groups or a justified common partition. Percentage-point changes differ from relative percentages. Multiplying a fixed denominator by a rate change is a conditional arithmetic scenario, not observed incremental users or causal impact.

## Retention and mature cohorts

The initial window selects entry-date cohorts. Daily D1 needs return observations through the day after the final entry date. Keep the requested entry window unchanged; adding a day adds a cohort and moves the required observation end.

Report the observed Dn numerator and denominator from actual count rows. Select the cohort set once and sum both counts over that same set:

```text
rate_n = sum(retained_count_d_n for d in selected_cohorts) / sum(initial_count_d for d in selected_cohorts)
```

Never average daily percentages, mix excluded cohorts into either side, add stage totals to details or reconstruct exact counts from rounded rates. Cohort memberships across entry dates are not period-distinct users. A stage initial total may include cohorts outside a particular Dn denominator. Read the actual labels and columns; these formula variables are not JSON field names.

Call a rate mature only with evidence of both elapsed observation time and complete data arrival. `has_more=false` concerns truncation and `data_time_range` concerns returned cohort dates; neither is an arrival watermark. Without arrival evidence, say **observed Dn rate; data completeness unverified**. This is a usable observation, not proof of churn. Past dates, repeating the query, or dropping the last cohort do not establish complete arrival. Missing returns from an incomplete observation window are not confirmed zero or churn; returned values remain observations. D1 does not establish cross-week retention or the composition of weekly active users.
