# capability run experiment.experiment.save-submit

Create or update a complete experiment and submit it in one call.

```bash
ae-cli capability run experiment.experiment.save-submit --input '{"project_id":1,"req":{...}}'
```

Input fields: `project_id` and `req`. The outer input is snake_case; fields inside `req` keep the native camelCase DTO shape.

Custom audiences use semantic `req.targeting.definitionRequest`. Never pass the
internal `targetConfig` field or hand-write `Cxx`/`Axxx` codes.

Response shape: `data.result`, with object keys recursively converted to snake_case.

Prefer `experiment experiment save` for progressive draft construction.

Feature requests may include optional `req.startTime` and
`req.expCycle={"cycleType":"time","fixedEndTime":"2026-11-08T16:00:00+08:00"}`.
Use ISO-8601 timestamps with timezone offsets. On approval-enabled servers,
initial submission and actual delivery changes create a pending approval;
read [server compatibility](experiment_approval.md#server-compatibility) before
using `experiment approval get`. On older servers, retain this save-submit call
and verify runtime detail without calling approval endpoints.
Do not submit the same saved draft again after this call. Approval can start a
due Feature experiment; a future start waits for the server's half-hour checks.
See [Feature timing](save_experiment.md#feature-timing) for
the draft, submission, manual-start, and deadline boundaries.

For external experiments on servers exposing `req.clearEndTime`, omitted or null
`req.endTime` preserves a saved deadline. Cancel it with `req.clearEndTime=true`
and no non-null `req.endTime`; this remains subject to approval for submitted
experiments. Copy an existing `req.startTime` exactly when retaining it; the
backend preserves that saved instant through review and application, including
seconds and milliseconds from manual activation. Other than adding this optional field, the native request is
unchanged. See [external deadline compatibility](save_submit_external_experiment.md#deadline-updates-and-server-compatibility)
before calling an older server. Never silently translate an unsupported clear
request into omission or retry a failed write through another path.
