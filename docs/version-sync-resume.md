# Resume the original command after version synchronization

## Approval and compatibility boundary

On 2026-10-23, the user explicitly approved automatically executing the original
command after CLI and Skills synchronization, with regression tests. This is a
coordinated change to the existing public startup behavior under
[the compatibility policy](compatibility-policy.md), including scripts and Agents
that recognize `AE_CLI_VERSION_SYNCED`.

Previously, successful automatic synchronization stopped before business
execution with exit code `1` and a structured config error containing
`ok: false`, `error.code: "AE_CLI_VERSION_SYNCED"`, and
`meta.retryOriginalCommand: true`. The original command had not run.

With this change, successful synchronization launches the verified installed CLI
JavaScript entry with the current Node.js executable once, passing the original
arguments, stdin, working directory, stdout and stderr. The caller receives that
invocation's result and exit code. A business
failure is returned directly and never retried. High-risk confirmation and
explicit `--yes`, validation and dry-run behavior remain the new invocation's
responsibility. A continuation guard prevents repeated synchronization launches.

On POSIX, the resumed CLI starts in its own process group, with inherited streams
and the parent waiting for its result. The parent forwards SIGINT, SIGTERM and
SIGHUP to that group, including descendants. This prevents a foreground terminal
signal from reaching the child both directly and through the parent. Parent
suspension and continuation also stop and resume the child group, and SIGWINCH
forwards terminal size changes. Windows retains direct child signal forwarding.

If the new CLI cannot start, the existing `AE_CLI_VERSION_SYNCED` error and exit
code `1` remain the manual-rerun path. Once the new CLI process has started, there
is no fallback to the old CLI. Existing exclusions, installation-failure policy,
authentication and authorization boundaries remain unchanged. No command, flag,
Gateway field or Skill entry is added, removed or renamed.

## Migration, support and release

Callers should consume the original command's output and exit code normally and
only rerun when the retained `AE_CLI_VERSION_SYNCED` fallback explicitly says the
command was not executed. Scripts that previously reran after every successful
version switch must remove that unconditional retry to avoid duplicate writes.
Older installed CLIs retain their manual-rerun behavior until they receive this
change; existing fallback error handling stays supported.

Carry the same approved behavior, tests and user documentation into both
`release/6.0` and `release/6.1` before the coordinated release. Select the exact
release versions in the normal release process and describe the changed error
and exit behavior in both release notes before publication. This implementation
does not bump versions or publish either line. During the release window, callers
must support both the older manual-rerun path and the new direct command result.

Rollback means reverting the continuation launch on both maintenance lines and
releasing coordinated fixes that restore the manual-rerun result. Already
completed business commands cannot be undone or replayed by rollback. Keep the
fallback code and its documented meaning available throughout migration.

Published Skills retain their names, directories, references and responsibilities.
The feature changes CLI startup, so no Skill content or version change and no new
Skill are needed; synchronization still installs the target package's Skills.

## Verification scope

Required regression coverage includes upgrade, downgrade, cross-line switch and
Skills-only repair; exactly one continuation; original arguments, piped stdin,
working directory, stdout/stderr and exit-code propagation; high-risk confirmation;
loop prevention; launcher failure before execution; and business failure without
fallback or retry. Existing automatic-sync exclusions and installation-failure
tests must continue passing. Run the version-sync and update-check suites, build,
CLI smoke tests, and README validation.

Temporary JavaScript process fixtures exercise inherited streams, arguments and
working directory, exit codes and startup failures. POSIX regressions cover
foreground-group signals, parent-only termination, descendant cleanup, and
suspension and continuation. Legacy wrappers keyed on either
`AE_CLI_VERSION_SYNCED` or `retryOriginalCommand` retry only when the child could
not start; neither success nor a business failure requests another execution.
High-risk cases use the actual command runner to verify non-interactive rejection,
explicit `--yes`, validation and dry-run behavior. Real macOS PTY checks verified
single delivery of terminal SIGINT/SIGTERM, readline input, raw-mode Ctrl-C,
terminal hangup, shell Ctrl-Z/fg, and terminal resize after process handoff.
Earlier manual real-TTY checks also verified confirmation and cancellation.
The installation result adds the
verified JavaScript path as `cli.entrypoint` while retaining existing CLI fields.

On 2026-10-28, the version-sync suite passed its core checks and all 72 startup
and process tests on macOS. The update-check suite, build, `npm test` (including
README validation), and TypeScript checking with `tsc --noEmit` also passed.

Mocked installation and temporary process fixtures do not establish a real global
npm installation on every platform. Published-package swaps on macOS, Linux and
native Windows, native Linux/Windows process and terminal behavior, and every
old/new CLI and supported host combination remain
unverified unless separately recorded by release validation. No server contract
changes are required by this feature.
