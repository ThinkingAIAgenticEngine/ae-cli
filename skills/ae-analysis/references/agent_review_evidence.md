# analysis-meta agent-review evidence

Use this to read current Common evidence for one resolved asset before drafting its review explanation. This read does not create a batch, write review records, notify, or certify. It does not run report queries. Do not use it as proof of a submitted proposal or approval. The proposed CERTIFY action selects the same snapshot handler used by creation; it is not executed by this command.

L2 admission: owned by Common ta-cli / AgentReviewService. Typed project validation, lossless string target keys and fixed governance defaults avoid constructing a mutation-shaped JSON payload manually. This command is the read-only evidence step of the report-review workflow, not an alternative submission command. It uses `metadata.agent_review.evidence` through the analysis Gateway, CLI-token authentication, `metadata:read`, and the exact project function `assetAuthentication`.

```bash
ae-cli analysis-meta agent-review evidence \
  --project-id <project_id> --target-type <target_type> --target-key '<exact_target_key>'
```

Resolve the project and target first; placeholders are not literal values. Target keys remain strings, including report/dashboard IDs above JavaScript's safe-integer limit and nonnumeric metadata names. Common determines which target types it supports; the CLI does not invent new types or coerce keys to numbers.

Input contains `project_id`, `review_type:ASSET_GOVERNANCE`, `target_ref:{type,key}`, `action_type:CERTIFY`, and `proposal_payload:{authentication_status:1}`. There are no decision, source, or submission flags. `--validate` and `--dry-run` use their separate nonmutating Gateway endpoints; neither is an evidence fetch unless the returned contract explicitly includes the snapshot. Use normal read execution to obtain current evidence. Permission or unsupported-capability failures stop the dependent proposal; do not use a direct backend call or a dummy submission to obtain evidence.

Output `data` contains `schema_version:"1.0"`, `review_type`, `target_ref`, `evidence_snapshot`, `evidence_hash`, and `target_revision`. Preserve the server snapshot and revision/hash as returned; do not compute authoritative hashes from CLI-reformatted JSON. This is a current read, not a lock or submission. Common create stores the submitted snapshot; it does not refresh it or restore omitted fields. Record gap-only evidence responses in the source ledger and follow [independent Agent preflight](agent_review_preflight.md) before declaring a draft ready. Detail readback checks that the submitted evidence and interpretation survived storage, not that Common regenerated them.

`evidence_hash` includes collection time and can change across evidence reads even when business facts are unchanged. Do not use the full snapshot hash to detect cross-scan business changes or trigger another submission/notification. `target_revision` identifies the saved definition and can confirm its configuration version; it is not a revision of all sampled usage/signals. Compare material facts and proposal content separately, preserving unknown versus zero/false. Evidence reads do not submit: preserve the chosen source response and compare important stored facts with the exact reviewed draft, rather than relying on full-snapshot hashes from different collection or serialization stages.

## Report Analysis Fields

For reports, inspect `data.evidence_snapshot.analysis`. The AI's `evidence_refs` are rooted at `evidence_snapshot.analysis`, without the CLI envelope's `data` prefix. The table describes the current schema, not guaranteed populated facts for every model. Use only paths that actually exist in the response and support the stated fact. A present key with null is unknown, not zero, false, no filter, or an execution default. Empty collections may reflect unavailable extraction, not absence of a business rule. Read `limitations` and parse status before interpreting them.

| Field under `evidence_snapshot.analysis` | Meaning and boundary |
| --- | --- |
| `schema_version`, `scope`, `kind`, `model`, `model_type` | Analysis version and saved report model. `scope:SAVED_REPORT_ONLY` excludes effective dashboard overrides and runtime execution. |
| `raw` | Original saved `events`, `event_view`, and `visual_view` configuration. These may be strings, structured values, or null; do not replace them with invented normalized content. |
| `query_config` | Decoded `events`, `event_view`, and `visual_view`; decoding failure is a limitation, not an empty successful query. |
| `normalized_definition` | Native converter output when available, including model-specific metrics, time configuration, SQL or `params` only when actually returned. It is not a guarantee of resolved runtime parameters. |
| `measures` | Ordered model-specific statistical measures. Event measures may expose `aggregation`, `aggregation_code`, `aggregation_name`, `distinct`, `formula`, `formula_dependencies`, and per-measure `filters`. SQL measures are the extracted aggregate projections; they are not all output columns. |
| `dimensions` | Saved event grouping or SQL grouping syntax, not executed rows or proven complete column lineage. |
| `filters` | Saved report/common filters or extracted SQL WHERE/HAVING with their scope. Inspect per-measure filters as well. Do not infer absent constraints from a null or empty extraction. |
| `time_range` | Saved `recent_day`, `start_time`, `end_time`, `time_particle_size`, comparison fields and related period settings. Interpret the actual saved range; do not replace it with asset-usage window days or today's date. |
| `timezone` | Execution timezone is not established by the current report extractor. Null remains unknown; do not assume a user, project, dashboard, or local-machine default. |
| `sql` | SQL-only `raw`, `parse_status`, `select_columns`, `select_distinct`, `from`, `where`, `group_by`, `having`, `order_by`, `limit`, and `offset`, subject to parse status and limitations. |
| `sources`, `limitations` | Source provenance and explicit extraction boundaries. Preserve unsupported models, unexpanded dependencies, dashboard overrides not applied, and unresolved runtime conditions. |

`source_path` is provenance, not an automatic replacement for AI `evidence_refs`. For example, a measure's source path can identify the saved configuration blob while the factual explanation cites the actual returned `evidence_snapshot.analysis.measures[0].aggregation_name`. Use that example only if index 0 and the nonnull field really exist and support the statement. Never mechanically copy source paths, generate indexes from expected fields, or claim reference resolution proves the statement's meaning.

## SQL Interpretation Boundaries

For `PARSED` output, explain each actual `sql.select_columns` entry in source order, keeping its `index`, alias/name, expression, distinctness and supported aggregation/formula evidence. Duplicate aliases remain separate columns. `columns` contains syntactic references, not verified table lineage or runtime types. `PARTIAL` and wildcard entries require explicit coverage limits; never expand `SELECT *` by guessing.

When Common returns `DYNAMIC`, cite `evidence_snapshot.analysis.sql.raw` and, only if present, `evidence_snapshot.analysis.normalized_definition.params` for an explicitly labeled original-text interpretation. Describe visible template text and unresolved parameters, not substituted SQL or effective output. Do not invent `select_columns`, substitute runtime values, or claim an empty projection list proves there are no columns. Do not fill factual query-column sections from a guessed parse. `UNAVAILABLE` or `UNSUPPORTED` similarly retains only what the response actually proves; report the limitation rather than claiming a complete calculation review.

None of these reads proves query execution, returned rows, complete business semantics, approval, or certification. Complete the normal sequence in [submit-to-page](agent_review_submit_to_page.md): resolve/export, read every report, fetch evidence, draft supported AI explanations, submit only with authorization, then compare detail readback.
