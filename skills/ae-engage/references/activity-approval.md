# engage-activity approval

> Capability ids: `engage-activity.approval.{approve,reject,cancel}` · Domain: `engage`.
>
> **Temporarily disabled:** `engage-activity.approval.submit` — do not call until re-enabled.

Campaign activities — activity approval workflow. Current actions target an activity (`ApprovalActivityIdDealDTO`: `projectId` + `activityId` + `reason`); each is a state-changing `write` and does not support dry-run. `reject` requires `reason`; other actions treat `reason` as optional.

## Commands

```bash
# Approve an activity
ae-cli engage-activity approval approve --project-id <project_id> --activity-id <activity_id>

# Reject an activity (reason required)
ae-cli engage-activity approval reject --project-id <project_id> --activity-id <activity_id> --reason <reason>

# Cancel/withdraw a submitted approval
ae-cli engage-activity approval cancel --project-id <project_id> --activity-id <activity_id>
```

## Parameters

| Command | Required flags | Notes |
|---|---|---|
| approve | `--project-id`, `--activity-id` | `--reason` optional. |
| reject | `--project-id`, `--activity-id`, `--reason` | `--reason` required, max 72 characters. |
| cancel | `--project-id`, `--activity-id` | `--reason` optional. |

## Output

- All actions: `data.success`.

## Decision Rules

- All approval actions are `write` (real state changes) and do not support dry-run; they do not require `--yes` (only `high-risk-write` does).
- Approve/reject require the caller to be a valid approver of the activity (enforced server-side).
- Do **not** call `engage-activity.approval.submit`; it is temporarily unavailable.

## Common Errors

| code | when |
|---|---|
| `ACTIVITY_NOT_FOUND` | activity id missing in project |
| `ACTIVITY_STATUS_INVALID` | activity not in draft/pending |
| `APPROVAL_NOT_PENDING` | no under-approval record |
| `NOT_APPROVER` | caller is not a project approver |
| `REASON_REQUIRED` | reject without `--reason` |
| `REASON_TOO_LONG` | reject reason longer than 72 characters |
| `CAPABILITY_PERMISSION_DENIED` | cancel caller is neither owner nor ops-manage-other-assets |
| `TOO_FREQUENT` | concurrent approve/submit lock conflict |
