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

## Current approval policy

These rules require the backend with the updated approval policy:

| Experiment / project roster | First submission and delivery changes |
| --- | --- |
| External experiment, any roster | Apply through the existing submission/save path without a new approval |
| Feature experiment, empty roster | Apply through the existing submission/save path without a new approval |
| Feature experiment, non-empty roster | Queue approval; keep effective configuration until approval |

A non-empty roster enables Feature approval even when all listed members have
lost eligibility. Only an empty roster disables it; a failed list request is
not an empty roster. Draft saves and display-only edits retain their existing
rules. Pause, resume, end, manual start, scheduling, and lifecycle validation
remain unchanged. Exempt Feature first submissions enter pending and use the
existing manual or future scheduled start; exemption does not grant the
approval-specific automatic startup or subscription continuation.

Deleting the last approver disables approval for subsequent submissions and
delivery changes. Adding an approver enables it without requiring retrospective
approval of effective configurations. Existing pending reviews and history are
preserved, including legacy external proposals. They are not applied automatically;
an authorized editor can withdraw and resubmit under the current policy. Do not
change the roster merely to work around an outstanding review.

## Server compatibility

Before selecting approval commands for the active host, inspect metadata without
the project filter so project availability is not mistaken for an older server:

```bash
ae-cli capability inspect experiment.approval.submit
```

- Metadata returned: approval commands are available, but this alone does not
  identify the policy version or enable approval for a project. Older
  approval-capable servers may still review external experiments and empty-roster
  submissions. Verify the deployed policy and read actual results. For saved
  Feature drafts,
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

The same `manage` call uses the server policy and cannot bypass required
approval. Read experiment detail after this call, and inspect any pending
proposal instead of submitting again. External-experiment `save-submit` and
L3 `experiment.experiment.save-submit` retain their existing calls and use the
same policy. Read runtime detail on every server and approval details when
supported and relevant. New approval/settings operations themselves require a
backend upgrade when their capability is absent.
The CLI never automatically retries a failed approval write through `manage`
or direct REST, including capability-not-found, permission, and stale-round errors.

## Submit and review

1. Save the draft, complete readiness checks, and check traffic conflicts for a
   non-mutex traffic layer. A draft-only request ends after saving and verification.
2. When submission is requested, submit the saved draft:

   ```bash
   ae-cli experiment approval submit --project-id 1 --exp-id exp_123 --dry-run
   ae-cli experiment approval submit --project-id 1 --exp-id exp_123
   ae-cli experiment experiment get --project-id 1 --exp-id exp_123
   ```

   The external-experiment `save-submit` command and L3
   `experiment.experiment.save-submit` already submit complete configuration;
   read experiment detail afterward instead of submitting a second time.
3. Check runtime `status`, effective configuration, and the `approval` summary.
   For a pending review, read `experiment approval get --project-id 1 --exp-id exp_123`
   and inspect `data.item.approval_id`, `state`, `configuration`, and available
   actions `can_approve`, `can_reject`, `can_cancel`. `item=null` means no approval
   history and is valid for exempt submissions. An older rejected or withdrawn
   record can also remain after a direct submission; it is not a new pending review.
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

- When approval is required, first submission remains `status=draft` with
  `approval.state=pending_review`.
  `mapping_status` is a display status; it does not replace the runtime `status`.
- When approval is required, submitted delivery changes queue an immutable
  proposal while the current configuration and runtime state continue to apply. This includes changes
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
- External experiments are exempt under the current policy. Their time range
  determines pending/running/ended through the existing lifecycle; they do not
  synchronize Feature/RCC. Existing pending external reviews still require
  explicit withdrawal before resubmission.

## Approver settings and permissions

Experiment approvers are project-scoped and independent of Engage approvers.
List responses include `approver`, `approver_name`, `creator_name`, `create_time`,
and `eligible`. Use verified project member open IDs for additions.

```bash
ae-cli experiment approver list --project-id 1
ae-cli experiment approver add --project-id 1 --approvers '["open_id_1","open_id_2"]' --dry-run
ae-cli experiment approver delete --project-id 1 --approver open_id_1 --dry-run
```

List before and after a requested settings change. Removing the last member
turns off subsequent Feature approval under the current policy, while
existing pending records remain pending. Deletion requires confirmation;
non-interactive execution requires `--yes` after authorization. Ordinary
writes do not prompt.

For an initial draft review that the user asks to withdraw and resubmit after
approval is disabled, first read and verify the pending round and `can_cancel`.
Withdrawal preserves the saved configuration. If the intended proposal differs
from that configuration, withdraw, rebuild and save the authorized changes, then
resubmit. When the saved configuration already matches the requested proposal,
for example for verified round `42`:

```bash
ae-cli experiment approval withdraw --project-id 1 --exp-id exp_123 --approval-id 42
ae-cli experiment experiment manage --project-id 1 --exp-id exp_123 --target-status pending
ae-cli experiment experiment get --project-id 1 --exp-id exp_123
```

For changes to an already submitted experiment, use its original save or save-submit
path after withdrawal; `approval submit` only submits saved drafts.

Each command requires the following CLI token scope and operator permissions:

| Command | CLI token scope | Operator permissions |
| --- | --- | --- |
| `experiment approver list` | `engage:read` | Experiment settings view (`experimentViewSetting`) |
| `experiment approver add/delete` | `engage:write` | Experiment settings edit (`experimentEditSetting`) |
| `experiment approval get` | `engage:read` | Experiment view (`experimentViewExperiment`) |
| `experiment approval submit/withdraw` | `engage:write` | Experiment edit (`experimentEditExperiment`) as the experiment creator, or experiment management (`experimentManageExperiment`) |
| `experiment approval approve/reject` | `engage:write` | Experiment view (`experimentViewExperiment`) and current experiment approver eligibility; experiment edit permission is not required |

Experiment settings permissions are independent of experiment view, edit, and
management permissions. Settings permissions do not grant approval eligibility;
approvers must belong to the project roster and retain experiment view permission.
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
