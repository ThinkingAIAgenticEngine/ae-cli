---
name: ae-things-review
description: "Workspace Thing reviews: use ae-cli things titles, descriptions, statuses and complete timelines to assess scope drift, missing recorded effective updates, work breakdown, ownership and completion evidence. Read-only by default."
---

# Thing progress review

Apply the evidence-based review method from aha-links using TE space permissions, three statuses and separate archiving. Read [Thing operations](../ae-things/SKILL.md) and the [collection contract](../ae-things/references/cli.md) first. Never guess Thing, space or assignee IDs. Write the review in the user's language.

When working with the Thing bound to this run, first read its execution snapshot as described in [Execution snapshots and live context](../ae-things/references/cli.md#execution-snapshots-and-live-context). Then collect the latest review or period facts using the workflow below, and describe these sources separately. Without a binding, use only the scope explicitly specified by the user.

## Collect facts

```bash
ae-cli things +detail --agent-space-id <space-id> --id <thing-id> --format json
ae-cli things +digest --agent-space-id <space-id> --format json
ae-cli things +digest --agent-space-id <space-id> --thing-ids <id-a>,<id-b> --format json
```

Supported scopes are the current space, an assignee or an explicit set of Things. Do not import watchlist or Feishu-group scopes. Screen broad scopes first, then review at most 20 Things deeply per batch. Disclose both the screening count and the deep-review count.

Check `fetchedCount`, `truncated`, `consistency` and `collectedAt`. Missing fields indicate an incompatible contract. When collection is truncated or resources are unreadable, limit conclusions to the facts covered; the first 100 Things are not a complete collection. For `changed_during_collection`, reread affected Things. `non_transactional` still does not mean a strict snapshot at one instant. Explicitly disclose unread attachments, private history and missing original goals.

## Review sequence

1. Goal and acceptance: are they clear, reasonable and verifiable? Compare the current goal with the earliest `created` record. If the original goal cannot be reconstructed, review only the current goal.
2. Scope drift: are goal changes explicitly recorded? Do not treat later conclusions as the original goal.
3. Effective updates: progress requires a result, change, blocker or explicit next step. Progress entries are candidates to verify. Placeholders, repeated statuses, notes and title-only edits do not reset the reminder cadence. Collected counts are only candidates; the model must still check whether the body contains an effective update.
4. Ownership: are the assignee and collaborators available, and do the description and progress identify the next step?
5. Completion evidence: are outputs accessible and do they satisfy acceptance criteria? Unread files cannot be claimed to have passed acceptance.

Prefer an explicitly agreed cadence. open means incomplete and does not distinguish not started from in progress. Without an agreed cadence, report only the last recorded time rather than inventing stagnation. For paused, check the recorded reason and conditions for resuming. Say "no update recorded", not "no progress made".

Always identify the timezone when citing timestamps. To determine calendar days in Asia/Shanghai, correctly convert ISO timestamps with Z/offsets rather than removing the suffix. For example, `2026-09-10T04:50:00Z` corresponds to 12:50 in Shanghai. If conversion is unavailable, retain the original UTC value and disclose the limitation.

## Output and boundaries

Classify each review as healthy / needs attention / high risk / insufficient information. Include the goal baseline, evidence (Thing links and dates), impact, confidence and at most three priority actions. For a space review, present common issues before per-Thing summaries. Do not evaluate individual performance or invent an overall score.

Diagnose only by default, without changing status or assignees. For specific changes the user explicitly asks you to implement, reread the version and execute without asking for the same authorization again. Present inferred changes as proposals awaiting confirmation. Do not automatically send messages or create scheduled tasks.

File evidence: +detail/+digest automatically paginate asset associations. Files with availability=missing or verification_failed are not available deliverables. Even available only means the reference is available, not that its contents were read or acceptance passed. Disclose unread files and non-transactional collection limits. Read private conversation sources only when the current user has access. Cite shared Thing facts in the report; do not automatically disclose private history.
