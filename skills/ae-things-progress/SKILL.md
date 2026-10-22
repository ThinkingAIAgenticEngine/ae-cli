---
name: ae-things-progress
description: "Workspace Thing progress, daily reports and weekly reports: use ae-cli things to collect period facts for the current space, an assignee or an explicit set of Things, then summarize them with the current conversation model and disclose data limitations."
---

# Thing progress summaries

Adapt the fact-collection and output contracts from aha-links. Read [Thing operations](../ae-things/SKILL.md) and the [CLI reference](../ae-things/references/cli.md) first. The CLI collects facts and the current model summarizes them; do not call a separate reporting backend. Write reports and report titles in the user's language.

When working with the Thing bound to this run, first read its execution snapshot as described in [Execution snapshots and live context](../ae-things/references/cli.md#execution-snapshots-and-live-context). Then collect the latest review or period facts using the workflow below, and describe these sources separately. Without a binding, use only the scope explicitly specified by the user.

## Scope and time

```bash
ae-cli things +digest --agent-space-id <space-id> --from 2026-09-07T00:00:00+08:00 --to 2026-09-14T00:00:00+08:00 --time-zone Asia/Shanghai --format json
ae-cli things +digest --agent-space-id <space-id> --assignee-id <member-id> --format json
ae-cli things +digest --agent-space-id <space-id> --thing-ids <id-a>,<id-b> --format json
```

Never guess IDs or select a personal default space. Watchlists, groups and cross-space summaries are unsupported. Daily reports cover calendar days; weekly reports run from Monday 00:00 to the next Monday 00:00, defaulting to Asia/Shanghai. For today/this week, use the current time as the cutoff; for yesterday/last week, use the complete period. Custom intervals must be explicit. Command from/to values must include a timezone, and intervals are start-inclusive and end-exclusive.

Convert recorded ISO timestamps to the report timezone and label the timezone beside the time window, collection time and evidence dates. For example, `2026-09-10T04:50:00Z` should appear as `2026-09-10 12:50 (Asia/Shanghai)` in Asia/Shanghai. Removing Z and calling 04:50 "Shanghai time" is incorrect. If reliable conversion is unavailable, retain the original ISO value, label it UTC and disclose that it has not been converted; never fabricate a local time.

## Evidence and completeness

Check `fetchedCount`, `truncated`, `consistency` and `collectedAt`; for explicit sets, also check `requestedCount` and `unreadable`. Stop making complete-coverage conclusions when fields are missing. The CLI automatically paginates up to 100 pages / 10000 items per chain and marks errors or limits as truncation. A single-page list is not a substitute for complete collection.

- `thing` is the current state, `entries` are records within the window, and `baseline` is the pre-window state reconstructed from complete business-change records. Do not invent a baseline when it is missing or versions changed during collection.
- `lastEffectiveRecordBeforeWindow` locates pre-window evidence. Current state is not a change within the period and cannot directly substitute for period-end state.
- Before output, compare `collectedAt` with the window's `to`. When `collectedAt < to` (including a user-specified full calendar week that has not ended), state that this is an interim summary as of collection time and the period is still open. Label three-status counts as "state at collection", not "period-end state" or "no later updates". For example, a September 7–14 weekly report collected on September 10 cannot claim that September 14 state equals current state. Even after a window ends, reconstruct period-end state only when complete post-window change evidence supports it.
- Count open/paused/done separately and report archived Things separately. The latest progress comes from thing.latestProgress; read progress/status records for historical changes.
- Notes and repeated process descriptions are not effective progress. `effectiveProgressCount` is a candidate count to verify; exclude records whose bodies add no new information.
- With no records, say only "no update recorded". Apply this constraint to summaries and next-step suggestions too. open does not prove work has not started; report only current status and the absence of recorded facts. Disclose unread or inaccessible attachments, truncation and non-transactional limits across multiple requests. For `changed_during_collection`, reread first; if changes continue, retain the limitation rather than claiming a static, complete collection.

## Output and writeback

Start with the scope, time window, collection time and coverage limits. Then give three-status and archive counts, changes during the period, blockers and next steps. Attach Thing sources and dates to every significant judgment, distinguishing facts, inferences and recommendations. Do not display internal record IDs by default.

Output only in the conversation by default. When writeback is explicitly requested, use `+detail` to read all report entries on the target Thing and check for a title covering the same scope and period. Then write the final body with `ae-cli things entry append --id <target-id> --type note --title "Things weekly report | date range | scope" --stdin --command-id <uuid> --format json`. The suggested title pattern is `Things weekly report | date range | scope` (or daily report), localized to the user's language. If a report for the same scope and period already exists, propose a revision instead of silently overwriting or appending a duplicate. Append a new revision only when the user explicitly requests it, preserving the original report. Do not ask for the same writeback permission again once it is granted.

Do not automatically send messages, change status, assign owners or create scheduled tasks.

File evidence: +detail/+digest automatically paginate asset associations. Files with availability=missing or verification_failed are not available deliverables. Even available only means the reference is available, not that its contents were read or acceptance passed. Disclose unread files and non-transactional collection limits. Read private conversation sources only when the current user has access. Cite shared Thing facts in the report; do not automatically disclose private history.
