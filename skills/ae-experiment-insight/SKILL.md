---
name: ae-experiment-insight
description: "Diagnose and interpret AE/TE A/B experiments from configuration and report evidence through a defensible decision. Use when the user asks what an experiment means, whether it can roll out, why a result is not significant, why group sizes or exposure are wrong, why treatment results conflict, whether the report is trustworthy, or what to do next. Covers SRM, duration sufficiency, novelty effects, metric conflicts, missing or anomalous data, design reasonableness, data reliability, metric interpretation, trend and segment analysis, root-cause hypotheses, and rollout recommendations. All platform discovery and reads must use ae-cli."
---

# AE Experiment Insight and Diagnosis

Validate the evidence before interpreting the effect. Produce a decision only when the experiment is trustworthy enough to support one.

## Platform and reference routing

Use `ae-cli` for every AE/TE platform interaction and follow
[`references/platform-operations.md`](references/platform-operations.md);
never substitute another platform access path.

For diagnosis, read
[`references/diagnostic-playbook.md`](references/diagnostic-playbook.md).
Before a rollout decision, read
[`references/decision-framework.md`](references/decision-framework.md).

## Workflow

### 1. Restore experiment context

Resolve the exact project and experiment. Collect:

- hypothesis and intended decision;
- control and treatment definitions;
- assignment unit, layer, targeting, traffic, and group allocation;
- Feature and group values;
- primary, secondary, and diagnostic metrics;
- planned MDE, alpha, power, duration, and stopping rule;
- actual start/end time and material configuration changes.

Without the original hypothesis or success rule, explain observed effects but do not retroactively invent success criteria.

### 2. Check run integrity

Establish the experiment's actual state, complete runtime periods, and material
mid-run Feature, traffic, audience, metric, or identity changes. Treat
configuration history as evidence. Evaluate allocation, exposure, sample
sufficiency, and design quality through the diagnostic playbook rather than
duplicating its rules here.

### 3. Run data diagnostics

Apply `diagnostic-playbook.md` in causal order and complete its diagnostic
checklist. Use
[`scripts/analyze_experiment.py`](scripts/analyze_experiment.py) for SRM and
group comparisons; do not calculate p-values or confidence intervals mentally.

### 4. Interpret effects

For each pre-registered metric, interpret the verified metric contract from
the diagnostic playbook and report:

- verified source event, aggregation, analysis unit, denominator or population,
  filters, and attribution window;
- control and treatment values;
- absolute and relative difference;
- confidence interval and p-value from deterministic calculation or the verified platform report;
- achieved sample versus planned sample;
- relation to MDE and business threshold;
- statistical and practical significance.

Distinguish:

- statistically significant and practically valuable;
- statistically significant but too small to matter;
- directionally positive but underpowered;
- no detectable effect within the current precision;
- significantly negative;
- invalid or inconclusive because of data quality.

Do not translate `p > alpha` into “no effect.” State that the current data did not establish an effect and describe the compatible interval.

### 5. Analyze trends and segments

Check trend stability and abnormal dates using complete comparable periods.
Apply the trend and segment rules in `decision-framework.md`.

### 6. Diagnose causes

For every suspected cause, provide:

- observed evidence;
- inference and uncertainty;
- competing explanation;
- the exact platform query or product check that would distinguish them;
- remediation if confirmed.

Do not produce a list of generic causes detached from evidence.
In the final report, express the distinguishing check as a concise user-facing
verification action. Include the raw `ae-cli` command only when the user
explicitly asks for commands, an audit trail, or debugging details.

### 7. Make the decision

Apply `decision-framework.md` and return one decision supported by the trust
assessment, primary effect, duration, trends, segments, and diagnostic results.

Never start, pause, end, change traffic, delete, or roll out an experiment unless the user separately asks for that platform action. Those actions are outside interpretation and require explicit target-and-impact confirmation.

## Output requirements

- Use the explicitly requested language, otherwise the language of the user's latest substantive message. Localize all user-facing prose, headings, labels, statuses, conclusions, warnings, limitations, and next actions; treat section names in this Skill as semantic guidance and remove unintended mixed-language output.
- Keep code, commands, raw IDs, event/property/metric names, Feature keys, SDK/API names, and official enum values unchanged when translation would alter their technical meaning.
- Lead with the decision status.
- Use an adaptive report, not a fixed numbered template. Organize the default
  user-facing hierarchy as: conclusion, core impact, experiment decision, and
  product optimization or next action.
- Keep data reliability, core metrics, and attention metrics inside the
  **core impact** section:
  - **Data reliability validation**: summarize the diagnostic checklist and
    state the overall result as reliable, limited, or unreliable. Keep normal
    checks compact and expand only warnings, failures, or unverified checks.
  - **Core metrics**: present the primary metric's control and treatment
    values, absolute and relative effect, interval and p-value, relation to MDE
    or the business threshold, and business meaning. Use causal wording only
    when the trust assessment supports it.
  - **Attention metrics**: present secondary and diagnostic metrics only when
    they affect the decision, explain the mechanism, or reveal material risk.
    Do not promote a post-hoc metric into the success criterion.
- For a brief answer, collapse these subsections into compact paragraphs under
  core impact; do not promote them into unrelated top-level sections.
- Treat labels such as `material blockers`, `trust blockers`, diagnostic
  severity names, and framework labels such as `Gate 1` or `Gate 2` as
  internal taxonomy. Never expose them as report headings or append their
  English forms after localized headings. Use natural
  user-facing wording such as “数据可靠性验证” or “当前为什么不能下结论” when
  those concepts need a heading.
- Place metric trends and metric-related segments under the relevant core or
  attention metric. Add broader context, cause diagnosis, assumptions, or
  limitations only when they materially change interpretation.
- Use a product-optimization section only when trustworthy evidence supports a
  specific product change. Otherwise use a next-validation or next-action
  section.
- Include only content supported by the request and evidence. Do not add a section merely because it appeared in a previous report.
- Separate platform observations, deterministic calculations, and inferred causes. State uncertainty and evidence gaps explicitly.
- Do not return an unexplained raw table.

## Failure behavior

- Ambiguous project or experiment: show resolved candidates and ask; do not guess.
- Missing report capability: preserve the `ae-cli` gap and request a platform export with required fields.
- Permission failure: stop dependent queries and report the missing permission.
- Empty successful report: say no matching data; do not relabel it as a transport failure.
- Partial success: use available evidence and enumerate failures.
- Conflicting sources: prefer raw assignment/exposure evidence for data-quality diagnosis and explain the discrepancy.
