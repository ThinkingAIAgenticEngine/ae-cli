# analysis member-invitation send

Use this flow after the customer selects **Invite others to collaborate** in a local agent. Keep the signed-in AE host, onboarding session, and previous Demo report. Pass `--host <verified-host>` on all project, role, and invitation commands when this session uses a host other than the active default. Use the [localized labels](about-ae.md#localized-labels) in the customer's language.

1. Ask for one recipient email address. List the business projects accessible on the signed-in host with `ae-cli project info list --format json`. Use `ae-cli analysis onboarding status --session-id <session-id> --format json` when the current conversation lacks the verified business project or Demo scope. Exclude Demo projects, including the `demo_project_id` from the current session, and offer the verified business projects. Ask the customer to choose when there are multiple candidates. If there is no eligible project, return to the closing choices.
2. List roles for the chosen project with `ae-cli project role list --project-id <id> --visible-only --format json`. Offer the returned project roles using their display labels and omit the company `root` role. Use the exact role name from the response in the send command.
3. Show the recipient email, project, and role, then offer **Send invitation** and **Cancel**. Wait for the customer's confirmation before calling the command. On cancel, go back to the [closing choices](demo-operations.md#choose-the-next-step).
4. Generate and retain one UUID for this confirmed invitation and pass it as `--request-id`. Pass values as separate command arguments, or escape them for the current shell. Use the same ID and inputs when retrying after a timeout or ambiguous send result.

```bash
ae-cli analysis member-invitation send --email '<email>' --project-id '<id>' \
  --project-role '<role-name>' --request-id '<uuid>' --format json
```

On `data.sent=true`, tell the customer that AE sent the invitation email and the recipient can accept it to join the company. Then offer the closing choices again. If the send result is unknown, keep the same request ID when retrying. For a permission error, show the service's reason. If this host or CLI version lacks the invitation command, retain the Demo result and offer the other closing choices.

### Transport

- Owning module: Common Service member invitations
- Capability: `analysis.member_invitation.send`
- The command's dry-run previews the request with the email redacted.
