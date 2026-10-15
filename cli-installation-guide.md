# AE CLI Installation Guide

Use the same one-command installer from a terminal or an AI Agent:

```bash
npx @thinkingai/ae-cli@latest install
```

No Agent selection is required. Optional usage:

```bash
npx @thinkingai/ae-cli@latest install --format json
npx @thinkingai/ae-cli@latest install --host <AE_HOST>
npx @thinkingai/ae-cli@latest install --dry-run
```

## Requirements and global Skills

Node.js 20 or later, npm, and npx must be available. The installer does not change the default Node version, use sudo, or modify project dependencies. macOS, Linux, and native Windows are supported. On Windows, use PowerShell or Command Prompt; WSL is optional. Global Skills are installed under the current user's home directory on each platform.

The running package determines the exact CLI version to install. The global executable is verified with `ae-cli --version`; PATH problems include the verified absolute path. Local npm links are protected by a small guard. Other installation conflicts use normal npm errors; the installer does not migrate existing installations.

Skills are installed globally in `~/.agents/skills`. The shared files are installed once, then the Skills tool automatically distributes copies to detected clients that require their own directory. Shared-directory targets are skipped during distribution. Existing per-Skill links are replaced with copies when needed. Codex and Cursor support this shared directory, so installing Cursor later does not require a separate copy of the Skills. A client that only reads its own directory may need the same install command run again after that client is installed. User-global installation does not promise availability in remote/cloud clients or for every future client.

The external tool is pinned to `skills@1.5.12` to preserve Node 20 support and skip copying a Skill onto its own source directory. The installer does not maintain its own Agent catalog, ask users to select clients, or select clients based on the invoking AI. Unrelated user Skills are retained.

## Verification and output

The installed CLI package's `skills/` directory defines the expected Skills and contents at runtime, including for historical packages without an installer or generated manifest. A failed shared-directory installation can retry the exact release tag `ThinkingAIAgenticEngine/ae-cli#v<CLI_VERSION>`; it never falls back to the default branch. Missing or invalid bundled Skills are reported rather than guessing the expected set from another version. Client distribution failures do not trigger a source download retry. If the local source and fallback both fail, the top-level error retains the first cause, and `skills.attempts` records both attempts with their stage, source, cause, and failures.

Verification parses YAML/frontmatter and compares expected files in the shared global directory with the target package. Merely finding a directory, an `ae-*` name, or an exit code of zero is insufficient. Failures reported by the pinned tool for supported clients are also treated as failures, even when shared files exist.

- Complete verification: `ok: true`.
- Partial installation: `ok: false`, preserving the CLI result and listing failed Skills and reasons.
- Unrelated PromptScript/Eve project-only diagnostics and their failure summary are handled internally and not displayed as user warnings after verification succeeds.
- YAML errors, missing or stale files, supported-client installation errors, CLI version mismatch, and unsuccessful processes remain failures.

`--format json` emits one report on stdout. Progress goes to stderr; raw subprocess logs are not forwarded. Reports include `ok`, `dry_run`, `cli.package/version/path/verified`, `skills.directory/expected_count/installed_count/missing/source/version/failures/attempts`, `auth.host/authenticated`, and `next_steps`. Counts refer to unique Skills in the global directory. Use `--format table` for a human summary. Dry runs make no subprocess calls or installation/configuration writes.

## Host and login

`--host` is optional. It delegates status checks to the existing auth command; it does not independently save credentials or change the active host. Being logged out does not make a verified installation fail.

```bash
ae-cli auth login --host <AE_HOST> --no-wait
```

Show the returned `verification_url` to the user. After browser authorization:

```bash
ae-cli auth login --host <AE_HOST> --device-code <DEVICE_CODE>
ae-cli auth status --host <AE_HOST>
```

Never print, copy, or manually save any token.

## Host-compatible upgrades and downgrades

```bash
ae-cli update --host <AE_HOST>
ae-cli update --target 6.0.40 --dry-run
```

The target is the exact `aeCliVersion` returned by the host, not npm latest or the cluster's general product version. CLI and Skills follow that target together. Existing automatic synchronization eligibility, locking, retry limits, and pending-Skills recovery are retained. Automatic changes apply only to the public distribution, after login and during normal commands; help, version, auth, config, install, update, CI, and configured sandbox/skip modes do not initiate automatic synchronization.

Host checks are cached for up to 24 hours. A cluster upgrade is discovered on a later eligible command after refresh, not by a background updater. Explicit `ae-cli update --host <AE_HOST>` queries immediately. A successful automatic switch asks the caller to rerun the original command.

For example, a CLI with this installer can switch from 6.0.50 to an older 6.0.40 package using that package's bundled Skills. After the switch, the installed 6.0.40 CLI runs future updates with its own historical code; new validation and diagnostic handling do not survive the downgrade. The published 6.0.40 already has automatic upgrade/downgrade support, but invokes an unpinned Skills tool and does not perform this installer's complete verification. Successful version selection does not guarantee historical Skills tooling will work in every Node/network environment.

To use the newer installer while still respecting the current host version, including to repair an older updater's failed Skills step:

```bash
npx @thinkingai/ae-cli@latest update --host <AE_HOST>
```

The newer command orchestrates the work; the installed target remains the host-required version. Required package versions and fallback tags must be published and accessible. Global CLI installation follows one target at a time; switching between differently versioned hosts can switch that installation again.

## Advanced manual troubleshooting

Prefer the unified installer. For a specific client or source diagnosis, advanced users can still invoke the external Skills tool directly:

```bash
npx -y skills@1.5.12 add <INSTALLED_CLI_SKILLS_PATH> -g -y --agent codex
npx -y skills@1.5.12 list -g --json
```

Raw manual-tool output is not the AE installer's final result. Do not infer completeness from the list alone, delete unrelated Skills, or overwrite a source link to resolve a conflict.

## AI installation prompt

> Install AE CLI and its matching Skills globally. Check Node.js 20+, npm, and npx without changing my default Node version. Run `npx @thinkingai/ae-cli@latest install --format json`, adding `--host <AE_HOST>` only if I supplied a host. No Agent selection is needed. Judge success by the installer's final `ok`, CLI verification, and global Skills verification. The installer handles unrelated project-only client diagnostics internally. If installation fails, report the named Skills and reasons; do not hide YAML errors, missing files, or actual installation failures. Do not modify project files, delete unrelated Skills, use sudo, overwrite an npm source link, or print/copy/save tokens. After successful installation, guide me through device-code login if needed and wait for browser authorization. Then use `ae-cli update --host <AE_HOST>` to match the environment. If an older CLI cannot finish its update, use `npx @thinkingai/ae-cli@latest update --host <AE_HOST>` to retain exact host-version selection. Report the installed version, global Skills directory, verified Skill count, and authentication status.
