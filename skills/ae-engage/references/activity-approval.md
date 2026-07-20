# engage-activity approval

> Capability ids: `engage-activity.approval.{submit,approve,reject,cancel}` · Domain: `engage`.

运营活动 - 活动审批流。所有操作均针对活动（`ApprovalActivityIdDealDTO`：`projectId` + `activityId` + `reason`），均为状态变更 `write`，不支持 dry-run。`reject` 的 `reason` 必填；其余操作 `reason` 可选。

## Commands

```bash
# Submit an activity for approval
ae-cli engage-activity approval submit --project-id <project_id> --activity-id <activity_id>

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
| submit | `--project-id`, `--activity-id` | `--reason` optional. |
| approve | `--project-id`, `--activity-id` | `--reason` optional. |
| reject | `--project-id`, `--activity-id`, `--reason` | `--reason` required, max 72 characters. |
| cancel | `--project-id`, `--activity-id` | `--reason` optional. |

## Output

- All actions: `data.success`.

## Decision Rules

- All approval actions are `write` (real state changes) and do not support dry-run; they do not require `--yes` (only `high-risk-write` does).
- Approve/reject require the caller to be a valid approver of the activity (enforced server-side).

## Common Errors

| code | when |
|---|---|
| `ACTIVITY_NOT_FOUND` | activity id missing in project |
| `ACTIVITY_NO_APPROVAL_TASK` | submit with no standalone/topic tasks |
| `ACTIVITY_STATUS_INVALID` | activity not in draft/pending |
| `APPROVAL_NOT_PENDING` | no under-approval record |
| `NOT_APPROVER` | caller is not a project approver |
| `REASON_REQUIRED` | reject without `--reason` |
| `REASON_TOO_LONG` | reject reason longer than 72 characters |
| `CAPABILITY_PERMISSION_DENIED` | cancel caller is neither owner nor ops-manage-other-assets |
| `TOO_FREQUENT` | concurrent approve/submit lock conflict |
