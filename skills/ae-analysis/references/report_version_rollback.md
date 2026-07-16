# analysis report-version rollback

Use when the user explicitly wants to rollback one report to a previous history version.

Do not use without first identifying the target version from `report-change-log list` or an exact user-provided version.

Command:

```bash
ae-cli analysis report-version rollback --project-id <project_id> --report-id <report_id> --target-version <version>
```

Input sends `project_id`, `report_id`, and target `version` from CLI `--target-version`.

Output is the gateway envelope. `data` contains `report_id`, `rolled_back`, `target_version`, and `previous_version`.
