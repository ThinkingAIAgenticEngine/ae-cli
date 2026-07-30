# Platform Operations

Read this reference before any AE/TE platform interaction.

## Hard boundary

All platform operations must use `ae-cli`. Do not call raw APIs, use browser automation, query a database, invoke te-mcp, or fabricate a platform result.

Use curated commands when their contract is known. Use the Capability Gateway for experiment capabilities that do not yet have a curated command:

```bash
ae-cli capability search "<terms>" [--project-id <id>]
ae-cli capability inspect <capability-id> --project-id <id>
ae-cli capability validate <capability-id> --input '<json-object>'
ae-cli capability dry-run <capability-id> --input '<json-object>'
ae-cli capability run <capability-id> --input '<json-object>'
```

Search and inspect before constructing input. Never guess capability IDs, fields, enums, resource IDs, or project IDs. Search with the narrowest useful terms, then inspect every plausible candidate.

Use at most one normal pre-check:

- use `validate` while correcting a complex nested payload;
- use `dry-run` for the final request when execution impact or deletion risk must be reviewed;
- do not routinely stack `validate`, `dry-run`, and `run`.

## Host compatibility

After every `ae-cli` invocation, inspect stderr and `_notice.host_compat`. If a notice exists, start the user-facing result with a version warning and reproduce its update command lines verbatim. A successful envelope does not cancel the notice.

## Project gate

Resolve an unverified project through:

```bash
ae-cli analysis project info list --query "<project name>" --fields '["project_id","project_name"]' --limit 20 --offset 0
```

Reuse a project only when its ID and host were verified in the same continuous conversation. If multiple projects match, stop and ask the user to choose.

## Metadata and metric evidence

Use these curated reads when applicable:

```bash
ae-cli analysis-meta event list --project-id <id> --query "<event>" --fields '["event_name","event_desc","authentication_status"]' --limit 20 --offset 0
ae-cli analysis-meta property list --project-id <id> --scope event --event-name "<event>" --limit 50 --offset 0
ae-cli analysis-meta property list --project-id <id> --scope user --limit 50 --offset 0
ae-cli analysis-meta metric list --project-id <id> --query "<metric>" --fields '["metric_id","metric_name","metric_desc","authentication_status"]' --limit 20 --offset 0
```

Use `ae-cli analysis-meta metric get` after list/search when the exact metric definition is required. Use `ae-cli analysis adhoc run|export` for historical baseline and eligible-traffic evidence, following the installed `ae-analysis` command reference. Do not infer a baseline from a metric definition.

For metric creation, use the curated `ae-cli analysis-meta metric create`
command only after the supported event-metric definition and calculation code
are exact. Use `--validate` while fixing complex metric input. Do not create a
metric from a prose-only definition.

## Experiment capability discovery

Discover, inspect, and select capabilities for the semantic operation. Typical search concepts include:

- experiment list, get, draft save, readiness, conflict, submit, start, pause, end, delete;
- Feature list, get, create, update;
- layer or bucket list and available traffic;
- experiment metric report, summary, trend, sample, group, or exposure.

Catalog wording and capability IDs may differ by deployment. The inspected `input_schema`, `risk`, auth requirements, output contract, and supported dry-run behavior are authoritative.

If search returns no supported capability, report `capability gap` and continue with an offline design. Do not convert an intended platform write into raw HTTP.

## Experiment detail link

After a successful experiment save or verified exact-match reuse:

1. Read the actual `expId` from the successful `ae-cli` result; do not use a proposed input ID unless the inspected output contract confirms that the save preserved it.
2. Prefer a canonical detail link returned by the inspected capability output contract.
3. When the result contains the actual `expId` but no link, use the verified relative frontend route:

```text
/#/atlas/experiment/detail?expId=<actual-expId>&currentProjectId=<actual-projectId>
```

The user-facing response must render this as a Markdown link with a localized label. Do not put it in a code block, output it as bare text, add a `{domain}` placeholder, or construct it when either verified ID is missing.

## Risk and lifecycle policy

- `read`: execute after project and target resolution.
- `write`: execute when it is directly requested and inputs are exact.
- `high-risk-write`: dry-run the final input, summarize target and impact, wait for a later explicit confirmation, then execute unchanged input with `--yes`.

Regardless of catalog risk, require a separate explicit confirmation before submitting, starting, changing live traffic, pausing, ending, or deleting an experiment. A request to design or create a draft is not authorization to launch.

## Envelope handling

- `ok: true` with empty data is a successful empty result.
- `ok: true` with `meta.partial: true` is partial success; preserve `meta.failures`.
- `ok: false` is failure; preserve error code, message, request ID, invocation ID, stage, and failures.
- Do not retry an unchanged failed request.
