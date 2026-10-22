---
name: ae-things
description: "Workspace Things: use ae-cli things to create, query, update and advance Things in an explicitly identified AgentSpace. Use proactively when the conversation includes assignments (who owns what), deliverables, a delivery cadence, to-dos, next steps, milestones or phased plans; an explicit request to create a Thing is not required."
---

# Workspace Things

Use `ae-cli things` to manage Things in the explicitly identified current TE space. Read the [CLI reference](references/cli.md) first. Never guess IDs or automatically select another space. Use the user's language for replies and user-facing Thing content; keep commands, flags and field identifiers unchanged.

<a id="何时创建事项"></a>

## When to create Things

**Decide proactively whether to create Things; do not wait for an explicit request such as "create a Thing for me".** Apply the same rules to personal and shared spaces.

Create Things directly, without asking first, when any of these signals appears:

- An assignment identifies who does what, such as "Have A investigate X and B investigate Y."
- A deliverable is paired with intent to proceed, such as "produce a final proposal", "follow this cadence" or "schedule the work".
- The conversation contains commitments, to-dos, next steps, milestones or phased plans.
- The user restates an agreed decision and points toward execution.

Do not create Things in these cases:

- Informational questions, conceptual explanations or casual conversation.
- Options are still being compared, the discussion is hypothetical, or the user explicitly says not to decide yet.
- Deduplication finds an existing equivalent Thing: point it out instead of creating a duplicate.
- The user has said not to create Things.

**When uncertain, present the proposed Things (titles, assignees and description outlines) in the reply and ask for confirmation once. Merely formatting assignments into a list without taking action is not sufficient.**

### Creation sequence

1. Confirm that an explicit AgentSpace is bound. Without one, do not create Things.
2. Use `members` to map names mentioned in the conversation to member IDs. Use a unique match as `--assignee-id`. With zero or multiple matches, omit the assignee (the server defaults to the current user) and identify the unresolved assignment in the reply.
3. Deduplicate with `list --query` or `options --query`.
4. Run `create` for each Thing: name the deliverable rather than repeating the user's words, describe the goal and acceptance criteria, and include `--command-id` for idempotent retries.
5. When needed, use `conversation bind` to bind the primary Thing or `link-conversation` to add an ordinary reference.
6. Report the created Thing numbers, titles and assignees, including assignments still awaiting confirmation.

**Granularity:** create one Thing per independently deliverable unit with its own owner. Things have no sub-Things or groups; do not build a hierarchy. For example, "A, B and C each investigate one area, then combine the results into a final proposal" maps to four Things, not one and not one per sentence.

### Authorization boundaries

Act autonomously to create new Things and add the first entry to a Thing you just created.

For Things the user has authorized you to advance or complete, append or update the relevant progress directly and automatically attach the deliverable files involved in this work. Complete publication and readback as described below. The same rule applies to personal and shared spaces; publication still requires `--confirm-share`. Authorization to deliver work for a Thing includes sharing those deliverable files with that Thing's space.

Other changes to existing Things, reassignment, archiving/restoring, unbinding and permanent deletion still require explicit authorization. A historical binding alone does not grant authorization. Do not automatically send messages or create scheduled tasks.

### Deliverable attachment workflow

When appending or updating progress, check each file actually delivered in this work:

1. Use `asset available` to inspect space files and follow all pages. Link registered files by assetId and unregistered files by the returned relative path.
2. Use `asset publish` for new files not yet in the space: use `--conversation-id --run-id --source-path` for unregistered outputs from this run, or `--artifact-id` / `--file-token` for existing artifacts. Keep a separate commandId for each file and reuse it unchanged on retries.
3. `linked:false` means the file was published but not linked. Use the returned assetId with `asset link` to complete the link without copying again. Publish only the deliverable files from this work, not temporary files or the entire conversation directory.
4. Read back with `asset list --id`, verify that every attachment exists with availability=available, then read back the progress entry. Report "progress and attachments updated" only after both checks succeed. On failure, distinguish published files, linked files and work awaiting recovery.

Use these file-linking APIs for attachments. A text link to a local path does not replace an attachment, and copying a file alone does not complete delivery. See the CLI reference for full parameters.

## Current conversation binding and execution snapshots

Use the binding declaration frozen for this run to determine its default Thing. Before executing, reviewing, summarizing or updating that Thing, use the declaration's `readCommand` to read the execution snapshot; ordinary chat does not require this read. Switching or unbinding during a run changes the conversation's association immediately, but the current run (including waits, resumes and retries) keeps its original snapshot. If the run originally had no Thing, it still has no default Thing. Only a new Run uses the latest binding. If the user explicitly names another Thing, read and operate on it subject to permissions; do not confuse the conversation's latest association with this run's snapshot.

When the user explicitly asks to bind the current conversation to a Thing, uniquely identify the target, run `conversation bind`, then verify with `conversation primary`. Ask the user when a name does not uniquely identify a Thing. On success, explain that the binding is saved and the Thing context takes effect from the next run. Verify unbinding by readback as well. An ordinary `link-conversation` reference does not substitute for a primary-Thing binding. Report API failures accurately without bypassing permissions.

`context --id <thing-id> --run-id <run-id>` returns the business text and version captured when execution was accepted. When current facts or a version for a write are needed, explicitly read live context without `--run-id` as an additional step, distinguishing collection time from snapshot version. If the snapshot read fails, disclose the missing information rather than guessing from the title or automatically falling back to live data. See [Execution snapshots and live context](references/cli.md#execution-snapshots-and-live-context).

- Fields are title, description, tags, status, assignee and collaborators. Status is open/paused/done; archiving and restoring are separate actions. Creation requires a description. Omitting the assignee on creation defaults to the current user; explicit null is rejected.
- Use members/options to query member and Thing candidates. Creation, editing and collaborator management follow server permissions. Read the latest version before changes. After a 409, compare the changes instead of merely replacing the version number.
- Entries use url/note/progress. When type is omitted, the server stores a single HTTP(S) URL as a link and other content as a note. Append progress with entry append --type progress. Edit entries with entry update and expected-updated-at; title, type or body can be changed independently. --clear-title clears the title.
- Use from-message to turn conversation messages into Things, providing verified conversation-id/message-id values and confirmed body text. Apply the creation signals above without requiring the user to name this command explicitly. Present inferred content as a proposal in the conversation first. Do not use the removed persistent mutation-draft commands.
- Use conversation primary/bind/unbind for the primary Thing, link-conversation for ordinary references, and conversations to query associations. Linking does not change conversation privacy or permissions.
- Record interim deliverables as progress entries. Use notes for handoffs, stating completed work, evidence and next steps. Assignees and collaborators are the only people-related collaboration relationships; no separate claiming step is needed.
- Use asset available/list/link/unlink/publish for files, following the authorization boundaries and deliverable attachment workflow above. Unlinking does not delete a file.
- Before permanent deletion, read the latest version, explain that deletion is irreversible and which conversations/files remain, then use delete --confirm-delete --yes after explicit confirmation. Wait on active-run conflicts; do not automatically terminate runs.
- Execute specifically authorized changes directly without asking for the same permission again.

```bash
ae-cli things create --agent-space-id <space-id> --title 'API acceptance' --description 'Verify permissions and data consistency' --format json
ae-cli things entry append --agent-space-id <space-id> --id <thing-id> --type progress --content 'Completed API integration checks' --format json
```

Use [ae-things-review](../ae-things-review/SKILL.md) for reviews and [ae-things-progress](../ae-things-progress/SKILL.md) for periodic summaries. Both synthesize fully collected facts while disclosing unread files, truncation and non-transactional collection limits.

Use `things conversations` to list linked conversations and `things conversation get` to read one. Start new conversations from the workspace UI; Things CLI only manages thing links and primary-thing binding.
