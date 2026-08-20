# UE routing

Use this reference after `data-integration inspect`.

## Route to UE ingestion

All of these must hold:

- A real `#account_id` or `#distinct_id` source is present.
- A real time column is parseable; no synthetic time is permitted.
- The records are event facts or user-property snapshots rather than aggregates.
- Field-level records can be represented without losing essential meaning.

Classification order:

1. A legal explicit `#type` wins (all eight record types — `track`, `user_set`, `user_setOnce`, `user_add`, `user_unset`, `user_del`, `user_append`, `user_uniq_append`).
2. An event/action field implies `track`.
3. Repeated users across a time series imply `track`; without an event field, propose a normalized file/Sheet name and require review.
4. One row per user with snapshot-like fields implies `user_set`.
5. Rows that mix track and user-profile facts in one file use `mixed` with a `record_type_field`; require explicit review.
6. Low-confidence output is a proposal, never silent approval.

Aggregated metrics, pivot tables, cross-tabs, model outputs, free-form documents, and records without real identity/time should normally use local analysis.

## Route to local analysis

Choose local analysis when:

- The user wants insights, not project ingestion.
- UE identity or time prerequisites are missing.
- Each row is an aggregate rather than a user/event record.
- Conversion would invent semantics or discard important structure.
- The user declines an uncertain mapping or destination.

Explain the reason briefly. Do not frame local analysis as an error.
