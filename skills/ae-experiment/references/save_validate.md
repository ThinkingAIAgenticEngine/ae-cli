# experiment save validate

Dry-run helper for save payloads. Does **not** persist data.

```bash
ae-cli experiment save validate --project-id <id> --operation-mode save_experiment --req '{"expName":"Demo"}'
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--operation-mode`: `save_feature`, `save_traffic_layer`, `save_experiment`, or `save_metric`.
- `--req`: Candidate save request object. **Must use native camelCase DTO keys.**

## CRITICAL — `valid: true` is not a save schema pass

`experiment.save.validate` checks operation-mode / outer helper contract. It does **not**
fully enforce the final save capability `input_schema`.

Consequences:

- `--req '{"exp_name":"Demo"}'` can return `valid: true`.
- The same payload fails on `experiment experiment save` with `unknown field exp_name`.

Rules:

1. Never submit snake_case DTO keys in `--req` (`exp_name`, `metric_id`, `feature_key`, …).
2. Do not trust `data.validation.example_args.req` key casing; rebuild with camelCase.
3. After `valid: true`, still use camelCase and prefer
   `ae-cli … save --dry-run` / `capability inspect` before a real write.
4. On final save `INVALID_CAPABILITY_INPUT` / `unknown field`, fix casing — do not widen
   the payload with more snake_case keys.

Response shape: `data.validation`.
