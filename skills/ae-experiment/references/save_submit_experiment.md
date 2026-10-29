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
Use ISO-8601 timestamps with timezone offsets. Submitting a Feature draft
places it in `pending`; with a start time, the server checks it every half hour
for automatic start. See [Feature timing](save_experiment.md#feature-timing) for
the draft, submission, manual-start, and deadline boundaries.
