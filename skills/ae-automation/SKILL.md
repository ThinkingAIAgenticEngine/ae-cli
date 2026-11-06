---
name: ae-automation
description: "Schedule AE platform automations: every day/week, daily reports, recurring reminders, monitoring, or repeat this task. Use ae-cli automation for persistent Agent/Agent Team tasks in the current space, instead of session-local CronCreate or /loop. Also manage schedules, runs, and results."
---

# AE Automation

Create recurring Agent work as a platform automation through `ae-cli automation`. If any prerequisite or write command returns `error.type: auth` or `error.type: config`, or reports a permission denial or unsupported configuration, report the blocker and stop the automation workflow. Leave credential and environment diagnosis or repair to a separate user request. Do not substitute session-local `CronCreate`, `/loop`, or `scheduled_tasks.json` for the requested platform automation.

See [command risks](references/command_index.md). Read [the command contract](references/cli.md) before writing or executing an automation. Use `ae-cli automation --help` and leaf help to discover flags.

1. Resolve the host and space. A local user signs in with `ae-cli auth login`; a sandbox uses the current conversation user's injected CLI token, never a shared sandbox's user binding. Pass `--agent-space-id` when the user identifies a space. Without an explicit space, the CLI inherits the current AgentSpace from its runtime context, working directory or verified current conversation; only a local invocation without space context uses the personal default. Show the resolved space when it matters.
2. Discover the automation with `automation list` and inspect `automation get`. Use the returned IDs; names are not unique.
3. For creation, select an Agent or team through the corresponding discovery commands. Match configuration to the target type. Use `--weekdays` or `--days-of-month` JSON arrays for multiple days with one time; skip dates absent in a month. For the actual last day of every month use `--days-of-month '["L"]'`, or combine it with dates, e.g. `'[1,15,"L"]'`; overlapping selections execute only once. Both Agent and Agent Team accept result notifications. Confirm the complete configuration before creation; save only the recurring task instructions as `--message`, never the automation-creation guide. Preview writes with `--dry-run` when useful; the CLI shows a redacted request and asks the server to validate authentication, space, permissions, target state, fields, and idempotency without applying the operation.
4. Execute the requested operation. After creation, read back the returned automation ID with `automation get` and verify the saved space and configuration before reporting success; a local schedule or a promise to run later is not a platform creation receipt. Deleting an automation or stopping an execution requires confirmation; use `--yes` only when the user already authorized that action. In a non-interactive shell, these operations fail immediately unless global `--yes` is present.
5. Read the returned run ID, then `automation runs result`. Report acceptance separately from completion. Use `--wait` only when the user needs the final outcome now.

Results are read from the server and work outside the sandbox. This skill does not read complete conversations or continue a chat. Never infer an output from a different execution sharing the same conversation.
