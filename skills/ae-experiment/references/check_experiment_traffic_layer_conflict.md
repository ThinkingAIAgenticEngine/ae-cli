# experiment experiment conflict-check

Pre-submit check for cross-layer Feature conflicts on a **non-mutex** traffic layer.

Reuse the existing Hermes `trafficLayerConflictCheck` API. Do **not** call this command for mutex traffic layers.

## Workflow

1. Ensure you already have the Feature keys for the current experiment:
   - Editing an existing draft: call `experiment experiment get` and read `feature_key_list`.
   - Creating a new experiment: reuse the Feature keys already chosen in the current workflow.
2. Call conflict-check with the selected non-mutex `traffic-layer-id`.
3. Interpret the response before `save-submit`:
   - `data.features` non-empty: some Features are not enabled.
   - `data.experiments` non-empty: same Features are active on other traffic layers.
   - both empty: no conflict signal from this check.

```bash
ae-cli experiment experiment conflict-check \
  --project-id <id> \
  --feature-key-list '["checkout_color"]' \
  --traffic-layer-id <layer-id>

ae-cli experiment experiment conflict-check \
  --project-id <id> \
  --feature-key-list '["checkout_color"]' \
  --traffic-layer-id <layer-id> \
  --exp-id <exp-id>
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--feature-key-list`: Required JSON string array of Feature keys selected by the current experiment.
- `--traffic-layer-id`: Required selected non-mutex traffic layer ID.
- `--exp-id`: Optional current experiment ID when editing an existing draft (excludes self from conflicts).

Response shape: `data.experiments` and `data.features`, with recursively snake_case item keys.
