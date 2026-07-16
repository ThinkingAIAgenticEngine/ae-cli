# analysis drilldown-user-events run

Query event sequence details for one user after `analysis drilldown-users run`.

Use this only after `analysis drilldown-users run` returns a `drilldown_context_id`.

Do not pass raw QP.

## Command

```bash
ae-cli analysis drilldown-user-events run \
  --drilldown-context-id <drilldown_context_id> \
  --user-id <user_id> \
  [--sort-order desc] \
  [--limit 100] \
  [--timeout-seconds 120]
```

## Input

- `--drilldown-context-id`: returned by `analysis drilldown-users run`.
- `--user-id`: user id returned by `analysis drilldown-users run`.
- `--properties`: optional backend property request object array. Omit this in normal agent calls and use the default returned columns. Do not pass string-name arrays such as `["event_time"]`.
- `--sort-order`: `asc` or `desc`.
- `--event-name-filter`, `--time-filter`, `--time-filter-before-nums`, `--time-filter-after-nums`: optional event sequence filters.

Do not use raw QP, `query_context_id`, or guessed user IDs for this command.

The `drilldown_context_id` must come from a `drilldown-users` target that includes date context, such as `drilldown_date` or `target_dates`. A context created from `include_total` alone can list users, but may fail event-sequence lookup with `TARGET_DATES_REQUIRED`.

## Output

The response contains at most `limit` event rows. When `truncated=true`, use `analysis drilldown-user-events export`; do not attempt to fetch another page.
