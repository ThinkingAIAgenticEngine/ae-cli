# Evaluators and calibration

Commands use `ae-cli evaluation +<command>`. Read the shared endpoint, authentication, and mutation rules in [SKILL.md](../SKILL.md). Use command `--help` for optional flags.

### Evaluators and templates

```bash
ae-cli evaluation +list_evaluators [--search <text>] [--cursor <cursor>] [--page-size 50]
ae-cli evaluation +get_evaluator --id <evaluator-uuid>
ae-cli evaluation +create_evaluator --name "<name>" [--description "..."] [--category SAFETY] \
  [--prompt "...{{input}} {{output}}..."] [--variables '["input","output"]'] \
  [--model-config-id <uuid>] [--template-code <code>] [--template-locale zh|en]
ae-cli evaluation +update_evaluator --id <evaluator-uuid> --name "<name>" --model-config-id <uuid> \
  [--description "..."] [--category "..."] [--prompt "..."] [--variables '[...]'] --lock-version <n>
ae-cli evaluation +delete_evaluator --id <evaluator-uuid> --lock-version <n>
ae-cli evaluation +transfer_evaluator_owner --id <evaluator-uuid> --owner-user-id <user-uuid> --lock-version <n>
ae-cli evaluation +list_evaluator_templates [--locale zh|en]
ae-cli evaluation +create_evaluator_template --name "<name>" --category "<category>" --prompt "<prompt>" [--description "..."] [--variables '[...]']
ae-cli evaluation +disable_evaluator_template --id <template-uuid>
ae-cli evaluation evaluator-template enable --id <project-template-uuid>
ae-cli evaluation +list_evaluator_versions --id <evaluator-uuid>
ae-cli evaluation +publish_evaluator_version --id <evaluator-uuid> --lock-version <n>
ae-cli evaluation +get_evaluator_health --id <evaluator-uuid>
ae-cli evaluation +optimize_evaluator_prompt --model-config-id <uuid> --prompt "<prompt>"
ae-cli evaluation +list_calibration_suites --id <evaluator-uuid>
ae-cli evaluation +create_calibration_suite --id <evaluator-uuid> --name "<name>" [--description "..."]
ae-cli evaluation +list_calibration_cases --id <suite-uuid>
ae-cli evaluation +create_calibration_case --id <suite-uuid> --variables-json '{...}' --expected-score 0.8 --tolerance 0.1 --tags-json '["golden"]'
ae-cli evaluation +delete_calibration_case --id <case-uuid> --lock-version <n>
ae-cli evaluation +start_calibration_run --id <suite-uuid>
ae-cli evaluation +get_calibration_run --id <calibration-run-uuid>
ae-cli evaluation +list_calibration_results --id <calibration-run-uuid>
```

- `+create_evaluator` without `--model-config-id` creates a draft; binding a model config via `+update_evaluator` activates it.
- Prompt placeholders `{{name}}` must match `--variables`.

### Calibrate an evaluator

```bash
ae-cli evaluation +list_calibration_suites --id <evaluator-uuid>        # use the default suite
ae-cli evaluation +create_calibration_case --id <suite-uuid> \
  --variables-json '{"input":"...","expected":"..."}' \
  --expected-score 0.8 --tolerance 0.1 \
  --tags-json '["golden"]'
ae-cli evaluation +start_calibration_run --id <suite-uuid>
ae-cli evaluation +get_calibration_run --id <calibration-run-uuid>      # poll until terminal
ae-cli evaluation +list_calibration_results --id <calibration-run-uuid>
ae-cli evaluation +get_evaluator_health --id <evaluator-uuid>
```

Prompt optimization consumes model quota and returns a preview; it never overwrites the evaluator. Prefer the default calibration suite; create extra suites only for a concrete need. Template creation and disabling require ADMIN.

### Template language and process scoring

List built-ins with `+list_evaluator_templates --locale en` and create from them
with `+create_evaluator --template-code <discovered-code> --template-locale en`.
Both language options accept zh/en and default to zh. Project templates keep
their original language; an omitted description uses the localized built-in
description when creating from a built-in. Existing evaluators are unchanged.

`TOOL_TRACE_REASONABLENESS` evaluates recorded tool choices, arguments, step
relationships and evidence consistency using `input`, `output`, `execution_trace`.
Discover the template and publish/pin its evaluator version. Map execution_trace
using FIELD_MAPPING_V6 as shown in [runs.md](runs.md); pair it with a task-completion
evaluator when final-answer quality also matters. `EVALUATOR_VARIABLES_V3` and
`EVALUATOR_SNAPSHOT_V3` carry the new process-evidence source types. Create/update
still use the public `--variables` array of names; do not send the versioned
snapshot object as that flag.

`evaluator-template enable` is administrator-only, bodyless and idempotent.
Only project templates can be re-enabled; built-ins and out-of-scope IDs are not
found. New evaluators use the latest enabled project template version.

Transition status: transitional
Owning module: Agent Evaluation evaluator templates
Current transport: authenticated POST /agenteval/api/v1/evaluator-templates/{id}/enable
Gateway target: TBD (evaluation template lifecycle)
Review after: 2027-01-21
Exit condition: replace with L3 when an equivalent capability exists, or retain
L2 only if typed inputs and compatibility provide additional value.
