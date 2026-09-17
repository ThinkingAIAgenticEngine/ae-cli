# ae-migrate-tracking-code — E2E canary prompt

The canary tests whether a **fresh agent**, working only from the skill instructions and a
fixture project, reproduces the golden artifacts. It catches "instructions vs output"
drift — the class of bug that golden-contract tests cannot see (e.g. the ir.md / §1
ordering fixes in this repo's history).

## How to run

Copy the block below into a **fresh** agent (NOT a fork of a session that has already read
`golden/` — that would leak the answer key). Replace `{{PROVIDER}}` and `{{PLATFORM}}`
with a real pair, e.g. `firebase` / `web-v9`, or `mixpanel` / `browser`, and `{{MODE}}`
with the platform's mode from the table below (e.g. `switch` or `add`).

Then run the diff:

```bash
node test/ae-migrate-tracking-code/e2e/diff.mjs {{PROVIDER}}/{{PLATFORM}}
```

---

## Canary prompt

> You are simulating a real tracking-migration run of the `ae-migrate-tracking-code`
> skill.
>
> **Hard constraint**: work only from the skill instructions and the fixture source
> below. Do **NOT** read anything under `test/ae-migrate-tracking-code/golden/` or
> `test/ae-migrate-tracking-code/e2e/output/` — those are the answer key and prior runs;
> reading them invalidates the test. Do **NOT** read `test/ae-migrate-tracking-code/
> migration-regression.test.mjs` or `test/ae-migrate-tracking-code/signatures.mjs` —
> they encode the expected answers (variant tokens, extraction patterns). Do **NOT**
> run `e2e/diff.mjs` yourself — it reads `golden/`, which is off-limits; the caller
> grades the output.
>
> **Fixed decisions** (normally asked of the user in Phase 2 — answered here):
> - Migration mode: **{{MODE}}** — a per-platform user decision (see the table below).
>   The skill itself defaults to `add` unless the user explicitly asks to cut over
>   (SKILL.md §Modes), so `switch` platforms below represent "the user confirmed the
>   destructive cut-over". Do not change the mode for the platform you are given.
> - Historical data: **none** — greenfield: apply the `mapping-framework.md` §1 name
>   conversion (snake_case, reserved-prefix strip, digit-leading `e_` prefix, etc.).
> - `display_name` language: **Chinese (zh)**.
> - AE SDK import/package: read from the AE wiki at
>   `skills/ae-generate-tracking-code/references/sdk-index.md` — do not guess.
> - APP_ID / SERVER_URL: this is an offline run (no AE host), so neither value can be
>   resolved — use placeholders in the AE init call (`appId: "APP_ID"`,
>   `serverUrl: "https://YOUR_SERVER_URL/..."`). Do not invent real values.

> ### Per-platform mode
>
> | Platform | Mode |
> | --- | --- |
> | amplitude/browser-2.x | switch |
> | amplitude/node | add |
> | amplitude/realworld | add |
> | firebase/android | switch |
> | firebase/naming | switch |
> | firebase/react-native | add |
> | firebase/realworld | switch |
> | firebase/web-v8 | add |
> | firebase/web-v9 | switch |
> | firebase/web-v9-guarded | add |
> | ga4/datalayer | add |
> | ga4/gtag-web | switch |
> | ga4/mp-server | add |
> | mixpanel/browser | switch |
> | mixpanel/ios | switch |
> | mixpanel/mixed | switch |
> | mixpanel/naming | switch |
> | mixpanel/node | add |
> | mixpanel/realworld | switch |
> | mixpanel/superprops | switch |
> | mixpanel/wrapper | switch |
> | sensors-data/android | switch |
> | sensors-data/java | add |
> | sensors-data/web | switch |
>
> **Task**: execute the `ae-migrate-tracking-code` skill
> (`skills/ae-migrate-tracking-code/SKILL.md`) against the fixture project at
> `test/ae-migrate-tracking-code/fixtures/{{PROVIDER}}/{{PLATFORM}}/`.
>
> Phases:
> - Phase 0 — detect provider + variant.
> - Phase 1 — extract call sites → `scan.json` (per `references/ir.md`).
> - Phase 2 — map → `mapping.json` + `draft.json` (per `mapping-framework.md` + the
>   provider adapter + `ir.md`).
> - Phase 3 — offline only: `ae-cli tracking plan validate --in draft.json` and
>   `ae-cli tracking plan draft --in draft.json --out draft.xlsx`. Skip upload.
> - Phase 4 — produce migrated code under `migrated/` (the mode given for this platform
>   above), reading the AE SDK init from the wiki main doc, keeping
>   `// @tracking <event_name>` markers.
> - Phase 5 — skip (needs an AE host).
>
> Emit exactly these artifacts under
> `test/ae-migrate-tracking-code/e2e/output/{{PROVIDER}}/{{PLATFORM}}/`:
> - `scan.json`
> - `mapping.json`
> - `draft.json`
> - `migrated/` (the migrated source files, mirroring the fixture's file layout)
>
> Then stop. A diff script will compare your output against the golden artifacts.
