# experiment experiment get

Query full experiment detail.

```bash
ae-cli experiment experiment get --project-id <id> --exp-id <expId>
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--exp-id`: Experiment ID.

Response shape: the experiment is in `data.item`, with recursively snake_case keys such as `exp_id` and `feature_key_list`.
The effective traffic-layer routing mode is returned as `data.item.layer_type`
(`remote` or `local`).

On approval-capable servers, `status` remains the runtime state;
`mapping_status` is for display and `approval` describes the latest review.
An absent or null approval is valid for exempt experiments. Historical
rejected/withdrawn records can remain after a direct submission; read the
actual configuration and status rather than treating history as a new review.

Feature timing is exposed as `start_time`, `end_time`, and `exp_cycle` (including
`cycle_type`, `fixed_end_time`, and planned `end_time`). The top-level `end_time`
records actual completion. Check `scheduled_start_error` for an expired pending
window and `start_time_adjustment_required` before starting a scheduled experiment
early. Use returned `status` to verify execution; a successful save or submission
does not mean the experiment is running.

When targeting contains reversible QP, it is returned as
`targeting.definition_request` with `targeting.definition_status=AVAILABLE`.
An absent definition is `NOT_APPLICABLE`; a historical unsupported definition is
`UNAVAILABLE` with `definition_unavailable_reason`. The internal `target_config`
field is never returned.
