# Feature fixed values

Use the existing `ae-experiment` skill for these L2 commands. Typed flags, strict validation,
explicit confirmation and stable reset tracing add value beyond a raw capability invocation.
They use Hermes Capability Gateway through the `engage` route and require the deployment that
provides `experiment.feature.update_fixed_value` and `experiment.feature.reset_fixed_value`.
An older server may report an unknown capability; do not fall back to internal REST or report success.
Existing commands, flags, response envelopes and skill responsibilities remain unchanged.

| Command | Purpose | Risk |
| --- | --- | --- |
| `ae-cli experiment feature update-fixed-value` | Enable or disable fixed results | high-risk-write |
| `ae-cli experiment feature reset-fixed-value` | Clear all users' fixed results | high-risk-write |

## Read and confirm

```bash
ae-cli experiment feature get --project-id 1 --feature-key button_color
ae-cli experiment feature list --project-id 1
```

Read `data.item.fixed_value_enabled` or `data.items[].fixed_value_enabled`. If an older server omits
this field, do not assume it is false. Check deployment compatibility. Both new commands are
`high-risk-write`: confirm the exact project, Feature and operation before using `--yes`.

## Enable or disable

```bash
ae-cli experiment feature update-fixed-value --project-id 1 --feature-key button_color --enabled true --dry-run
ae-cli experiment feature update-fixed-value --project-id 1 --feature-key button_color --enabled true --yes
ae-cli experiment feature update-fixed-value --project-id 1 --feature-key button_color --enabled false --yes
```

`--enabled` is required; `false` is a real value. Enabling fixes each unified user's first valid
remote Feature result, whether from an experiment or the default. Disabling clears all users'
fixed results and resumes normal evaluation. The business service preserves ownership checks,
archive restrictions, version publication and audit logging. Related experiment status does not block the operation.

Gateway input: `project_id`, `feature_key`, `fixed_value_enabled`. Output: `data.result` (Boolean).

## Reset while keeping fixing enabled

```bash
ae-cli experiment feature reset-fixed-value --project-id 1 --feature-key button_color --reason 'Restart rollout' --request-id reset-20261106-1 --dry-run
ae-cli experiment feature reset-fixed-value --project-id 1 --feature-key button_color --reason 'Restart rollout' --request-id reset-20261106-1 --yes
```

Reset requires fixing to be enabled and clears all users' fixed results for this Feature.
The next request follows normal evaluation and fixes the next valid result. Experiment sticky
assignments remain, so users can still receive the same experiment group. Fixing remains enabled.

- `--reason` is optional, up to 500 characters, and is stored in the existing successful-operation audit log.
- `--request-id` is optional, non-blank and up to 64 characters. The CLI generates one when omitted
  and prints it to stderr on execute. It is a tracing ID, not an idempotency key.
- Every execution, including reuse of the same ID, resets again. Never automatically retry a timeout
  or failed reset: the server may have already executed it. Inspect the operation log and service state first.
- `--feature-key` is non-blank and at most 80 characters. Project IDs are positive 32-bit integers.

Gateway input: `project_id`, `feature_key`, `request_id`, optional `reason`. Output: `data.result` (Boolean).
Dry-run and validate check input and gateway authorization without publishing or calling RCC; they
are not proof that current ownership, archive state, enabled state or RCC availability will allow execution.
Both storage cleanups must be confirmed before reset succeeds. Errors remain failures.

## Default changes and compatibility

Changing an enabled fixed Feature's default value also clears all users' fixed results, including
experiment-derived ones; the next request fixes a newly evaluated value. Explain this effect before
using the existing `experiment feature save` command. A default change while fixing is disabled does
not require fixed-result cleanup. This addition does not alter existing save flags or confirmation behavior.

Read successful reset reasons through `experiment feature operation-log query` (`remark` in the
structured operation content). Reset does not create a new Feature version; toggle publication
follows the existing Feature lifecycle. No client round or Feature instance ID is needed.
