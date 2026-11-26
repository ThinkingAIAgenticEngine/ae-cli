# Background size contract

The user approved reducing each company/project background from 100,000 to 5,000 characters on 2026-11-17. This is a coordinated restriction of writes, not a second API or a new command. The existing `ae-cli capability` workflow discovers the authoritative Common schema and returns its structured validation errors. UTF-16 string length matches JavaScript UI and Java service counting, including Markdown markup.

The existing Skill entry and responsibilities remain; ae-analysis is incremented to 4.2.66. It recommends 1,000–2,000-character backgrounds and puts scenario definitions in entries for on-demand reads. It never silently truncates existing data or a proposed draft.

Common must deploy first, followed by frontend and the branch-local CLI/Skills distribution. Old clients continue using the same operation and fields: <=5,000-character writes work; larger writes now fail explicitly. Reads of oversized published/draft/historical content and full historical restoration remain supported. Restored oversized drafts require editing before a new publication. Replays of successful old publications return the original result. There is no database migration or automatic data rewrite. During rollback, rolling Common back reopens its former write limit; existing stored content is retained.

Verification: shared gateway transport tests cover company/project 5,000-character writes, structured refusal at 5,001 without client truncation, and full oversized reads. The server behavior is covered by Common unit tests; these CLI tests use a simulated gateway. Existing personal semantics, Skill contract, build, smoke and release checks pass. No claim of live acceptance before deployment.
