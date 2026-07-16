# analysis drilldown-user-events export

Export the complete event sequence for one user from a drilldown context. Do not pass raw QP.

## Command

```bash
ae-cli analysis drilldown-user-events export \
  --drilldown-context-id <drilldown_context_id> \
  --user-id <user_id> \
  [--sort-order desc] \
  [--artifact-format jsonl] \
  [--timeout-seconds 21600]
```

Use identifiers returned by `analysis drilldown-users run` or its export artifact. Export does not accept `--limit`, `--page-num`, or `--page-size`; Common advances backend pages internally and writes one JSONL artifact.

Inspect the returned `run_id` with `analysis run inspect`, then download the completed artifact with `analysis artifact download`.

Output is an async run/artifact descriptor. The complete event rows exist only in the downloaded artifact.
