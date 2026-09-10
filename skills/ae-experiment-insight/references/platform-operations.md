# Platform Operations

Read this reference before retrieving any AE/TE experiment evidence.

## Hard boundary

Use `ae-cli` for all platform discovery and reads. Do not call raw APIs, use browser automation, query a database, or invent report values.

Use the Capability Gateway when no curated experiment command exists:

```bash
ae-cli capability search "<terms>" --domain <domain> [--project-id <id>]
ae-cli capability inspect <capability-id> --project-id <id>
ae-cli capability run <capability-id> --input '<json-object>'
```

Never guess a capability ID, schema field, enum, resource ID, project ID, or experiment ID. Search, inspect, then construct input from `input_schema`.

## Host compatibility

After every `ae-cli` invocation, inspect stderr and `_notice.host_compat`. If present, open the user-facing result with a version warning and reproduce the update command lines verbatim.

## Resolution gates

When the user supplies a project ID, resolve it directly:

```bash
ae-cli project info get --project-id <id>
```

When the user supplies only a project name, search and disambiguate:

```bash
ae-cli project info list --query "<project name>" --fields '["project_id","project_name"]' --limit 20 --offset 0
```

Then discover experiment list/get capabilities and resolve the exact experiment by verified ID or exact-match name. If multiple candidates remain, ask the user.

Reuse IDs only within the same verified host and continuous conversation.

## Evidence acquisition order

Discover and inspect capabilities for:

1. experiment configuration and current state;
2. Feature and group values;
3. allocation, targeting, and layer;
4. configuration or lifecycle change history;
5. assignment and exposure summary;
6. primary and other requested metric reports;
7. sample-size or achieved-power report;
8. metric trends;
9. pre-registered or requested segments.

Typical catalog search concepts include `experiment get`, `experiment report`, `experiment metric`, `experiment trend`, `experiment sample`, `experiment exposure`, `experiment group`, and `experiment history`. Catalog wording varies by deployment; inspected metadata is authoritative.

Use `ae-cli analysis adhoc run|export` only when the platform experiment report lacks the raw evidence needed for a diagnosis and the required events/identities are known. Follow the installed `ae-analysis` reference and preserve the exact query definition.

## Safe read behavior

- A successful empty response means no matching data.
- Preserve report time zone, attribution window, filters, metric definition, identity, and aggregation unit.
- Preserve request and invocation IDs with failures.
- Do not retry an unchanged failed query.
- Do not combine values from different project IDs, hosts, experiment versions, or metric definitions.

## Capability gaps

When a required read is unavailable:

1. preserve the `ae-cli` capability or permission error;
2. name the missing evidence and the decision it blocks;
3. request a platform export containing the minimum fields;
4. label subsequent analysis as based on user-provided data.

Do not bypass `ae-cli` with a direct platform endpoint.

## Lifecycle boundary

Insight work is read-only by default. For a lifecycle action, follow the
authorization boundary in `SKILL.md` and the risk contract of the inspected
platform capability.
