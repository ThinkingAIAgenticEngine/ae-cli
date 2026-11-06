# Experiment approval and approvers

Use these commands on servers exposing `experiment.approval.*` and
`experiment.approver.*`. All commands require a verified positive integer
`--project-id` (`-p`). Requests use the existing `engage` Capability Gateway route
and CLI token authentication; no direct Atlas REST calls are needed.

## Commands

| Command | Additional required flags | Risk | Response data |
| --- | --- | --- | --- |
| `ae-cli experiment approval get` | `--exp-id` | read | `item`: latest approval or `null` |
| `ae-cli experiment approval submit` | `--exp-id` | write | `result`: saved draft's experiment ID |
| `ae-cli experiment approval approve` | `--exp-id`, `--approval-id` | write | `result`: boolean |
| `ae-cli experiment approval reject` | `--exp-id`, `--approval-id`, `--reason` | write | `result`: boolean |
| `ae-cli experiment approval withdraw` | `--exp-id`, `--approval-id` | write | `result`: boolean |
| `ae-cli experiment approver list` | None | read | `items`, `total` |
| `ae-cli experiment approver add` | `--approvers` | write | `result`: boolean |
| `ae-cli experiment approver delete` | `--approver` | high-risk-write | `result`: boolean |

CLI segments map directly to the corresponding capability IDs, for example
`experiment approval approve` calls `experiment.approval.approve`.
Flags map to snake_case input fields. `--approval-id` must be a positive safe
integer from the exact reviewed proposal. Write `--project-id` and `--approval-id`
as decimal digits; fractions, exponent/hex notation, and unsafe integers are
rejected locally before numeric conversion can silently change a target ID.
`--reason` is trimmed, required for rejection, and limited to 72 UTF-16 code units
as in the backend. The Gateway does not expose optional approval/withdrawal remarks.
`--approvers` is a JSON array of 1 to 10 non-empty project member open IDs;
`--approver` removes one existing open ID. Do not invent IDs or infer eligibility
from membership in the Engage task approver list.

## Server compatibility

Before selecting approval commands for the active host, inspect metadata without
the project filter so project availability is not mistaken for an older server:

```bash
ae-cli capability inspect experiment.approval.submit
```

- Metadata returned: use the approval workflow below. For saved Feature drafts,
  either `approval submit` or the compatible `experiment experiment manage
  --target-status pending` submits once; do not execute both.
- An explicit `CAPABILITY_NOT_FOUND`, or a verified deployed release without
  approval support: keep the existing submission workflow below, and verify
  runtime status with experiment detail. Do not call approval commands.
- Authentication, permission, project, network, or business errors, an empty
  filtered catalog, and a generic HTTP 404 do not establish missing approval
  support. Resolve the error; do not switch write paths or infer approval is off.

Compatible saved Feature draft submission on older servers:

```bash
ae-cli experiment experiment manage --project-id 1 --exp-id exp_123 --target-status pending
ae-cli experiment experiment get --project-id 1 --exp-id exp_123
```

The same `manage` call still queues approval on approval-enabled servers; it
cannot bypass approval. When approval support is known, read the proposal after
this call instead of submitting again. External-experiment `save-submit` and
L3 `experiment.experiment.save-submit` retain their existing calls: read approval
on supported servers and runtime detail on older ones. New approval/settings
operations themselves require a backend upgrade when their capability is absent.
The CLI never automatically retries a failed approval write through `manage`
or direct REST, including capability-not-found, permission, and stale-round errors.

## Submit and review

1. Save the draft, complete readiness checks, and check traffic conflicts for a
   non-mutex traffic layer. A draft-only request ends after saving and verification.
2. When submission is requested, submit the saved draft:

   ```bash
   ae-cli experiment approval submit --project-id 1 --exp-id exp_123 --dry-run
   ae-cli experiment approval submit --project-id 1 --exp-id exp_123
   ae-cli experiment approval get --project-id 1 --exp-id exp_123
   ```

   The external-experiment `save-submit` command and L3
   `experiment.experiment.save-submit` already submit complete configuration;
   read approval afterward instead of submitting a second time.
3. Read `data.item.approval_id`, `state`, `configuration`, and available actions
   `can_approve`, `can_reject`, `can_cancel`. `item=null` means no approval history,
   not an approved experiment. Read `experiment experiment get` separately for
   the runtime status and current effective configuration.
4. Review the actual proposed configuration before approval. Apply only the
   user-requested action to that exact round. The commands never discover and
   substitute another approval ID automatically.

For example, after discovering and reviewing approval ID `42`:

```bash
ae-cli experiment approval approve --project-id 1 --exp-id exp_123 --approval-id 42 --dry-run
ae-cli experiment approval approve --project-id 1 --exp-id exp_123 --approval-id 42
```

Alternative actions on a verified pending round:

```bash
ae-cli experiment approval reject --project-id 1 --exp-id exp_123 --approval-id 42 --reason 'Reduce traffic before launch'
ae-cli experiment approval withdraw --project-id 1 --exp-id exp_123 --approval-id 42
```

Run only the selected action, then re-read approval and experiment detail. A
dry-run checks the input contract without applying configuration; it does not
prove current approver eligibility, an unchanged baseline, resource readiness,
or that the real approval will succeed.

## State and configuration boundaries

- First submission remains `status=draft` with `approval.state=pending_review`.
  `mapping_status` is a display status; it does not replace the runtime `status`.
- Submitted delivery changes queue an immutable proposal while the current
  configuration and runtime state continue to apply. This includes changes
  submitted through existing save commands; a successful boolean save is not
  proof that the new delivery configuration is effective.
- Name, hypothesis, and other display-only changes normally save directly.
  A pending review freezes editing and deletion; withdraw it before editing.
- Rejection or withdrawal preserves the effective configuration. If revising
  a rejected/withdrawn proposal, read its `configuration` as well as experiment
  detail. Rebuild a valid camelCase write request from the save contract;
  never send the read-only snake_case snapshot directly as `--req`.
- Approval applies the stored snapshot and rechecks project access, submitter
  access, approver eligibility, configuration baseline, resources, and time.
  It can start a due Feature experiment and synchronize Feature/RCC. A future
  start remains pending; audience subscription can also delay startup. A running
  or paused experiment keeps its lifecycle and original start time.
- No configured eligible approver does not skip approval: submission stays
  pending until a valid approver is added and processes the existing round.
  Never add the caller as an approver just to bypass a pending review.
- External experiments also use approval; after approval their time range
  determines pending/running/ended. They do not synchronize Feature/RCC.

## Approver settings and permissions

Experiment approvers are project-scoped and independent of Engage approvers.
List responses include `approver`, `approver_name`, `creator_name`, `create_time`,
and `eligible`. Use verified project member open IDs for additions.

```bash
ae-cli experiment approver list --project-id 1
ae-cli experiment approver add --project-id 1 --approvers '["open_id_1","open_id_2"]' --dry-run
ae-cli experiment approver delete --project-id 1 --approver open_id_1 --dry-run
```

List before and after a requested settings change. Deletion keeps historical
approval records and requires confirmation; non-interactive execution requires
`--yes` after authorization. Ordinary writes do not prompt.

Reads require `engage:read` and experiment view permission. Writes require
`engage:write`. Approve/reject additionally require current experiment approver
eligibility, but do not require experiment edit permission. Submit/withdraw
require the creator's experiment edit permission or experiment management
permission; approver settings changes require experiment management permission.
The server enforces permissions and project/resource ownership.

## Failures and older servers

- `EXPERIMENT_APPROVAL_STALE`: re-read the latest round; do not silently approve
  a replacement proposal or retry a finished action.
- `EXPERIMENT_APPROVAL_BASELINE_CHANGED`: re-read approval and effective detail.
  Withdraw and submit a corrected proposal when authorized.
- Invalid/ineligible approvers or permission errors: correct the roster or
  permissions through the requested settings workflow; do not retry blindly.
- After a timeout or uncertain write result, read both records before deciding
  whether another write is needed.
- Existing `experiment experiment manage --target-status pending` remains
  supported on older and approval-enabled servers. Select the workflow using
  [server compatibility](#server-compatibility), before writing. An approval
  failure never authorizes bypassing it through direct REST or a status change.
