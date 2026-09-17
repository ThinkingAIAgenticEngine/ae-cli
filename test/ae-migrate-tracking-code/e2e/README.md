# ae-migrate-tracking-code — E2E canary

The golden-contract suite (`verify:skill-migration`) asserts that the hand-written golden
artifacts are self-consistent and match the fixtures. It does **not** verify that an agent
reading the skill instructions can reproduce those artifacts. This canary closes that gap.

## What it does

1. A **fresh agent** (not a fork of a session that has read `golden/`) runs the
   `ae-migrate-tracking-code` skill against one fixture platform, writing its output to
   `e2e/output/<provider>/<platform>/`.
2. `diff.mjs` compares that output to `golden/` **semantically** — event names, property
   names, call kinds, mode — not byte-for-byte.

## Run it

```bash
# 1. Paste the prompt from PROMPT.md into a fresh agent (replace the placeholders).
# 2. Diff one platform:
node test/ae-migrate-tracking-code/e2e/diff.mjs firebase/web-v9
# or diff everything under e2e/output/:
npm run verify:skill-migration-e2e
```

## Interpreting results

- `✔ <platform>: semantic match` — the agent reproduced the golden semantics.
- `✖ <platform>: N difference(s)` — the skill instructions and the golden disagree about
  how to migrate that fixture. Fix the **skill instructions** (the source of truth), or fix
  the **golden** if golden itself drifted, then re-run.

## Caveats

- **Not deterministic.** LLM runs vary; a single failed canary does not prove a doc bug.
  Treat it as a low-frequency drift detector, not a CI gate — it is intentionally excluded
  from `verify:skill-migration`.
- **Honesty constraint.** The canary only works if the agent actually avoids reading
  `golden/`. Keep it a fresh agent.
