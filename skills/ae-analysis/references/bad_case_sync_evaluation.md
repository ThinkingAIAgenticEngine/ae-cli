# analysis bad-case sync-evaluation

```bash
ae-cli analysis bad-case sync-evaluation --project-id 1 --item-id 9007199254741001
```

Retry only when a saved case has `evaluation.state` PENDING or ERROR. Reads the latest Common case and project binding, calls AE directly, then reports the versioned result to Common. Output is the current case with its review and synchronization states. A saved review is not rolled back when synchronization fails.

Do not use this command to change a decision; use explicit human review with APPROVE, REJECT or REVOKE. Existing scheduled task versions and historical results remain unchanged. `--dry-run` checks the Common read only, without calling AE or recording a result.

Follow [Bad Case review](bad_case_review.md) for permissions, authentication, compatibility, and failure semantics. This L1 command reuses the existing evaluation transport and adds no independent AE host setting.
