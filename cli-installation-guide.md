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

The pinned Skills tool resolves supported global client directories, including the shared `~/.agents/skills` directory. AE does not maintain a separate client path table. A client that only reads its own directory may need the same install command run again after that client is installed. Project-only clients, unknown clients, remote/cloud clients, and manually imported Skills are outside automatic global synchronization. Overlapping source directories and unverified links are protected rather than replaced.

The external tool is pinned to `skills@1.5.12` to preserve Node 20 support and skip copying a Skill onto its own source directory. The installer does not maintain its own Agent catalog, ask users to select clients, or select clients based on the invoking AI. Unrelated user Skills are retained.

## Verification and output

The verified target CLI package's complete `skills/` directory defines the expected contents, including for historical packages without an installer or generated manifest. The synchronizer uses this source for installation and restoration. Missing or invalid package sources, modified copies, ownership conflicts, and tool failures are reported; they do not trigger an unrestricted remote installation retry. `skills.attempts` retains the attempted source and failure details.

Verification parses YAML/frontmatter and compares expected files in the shared global directory with the target package. Merely finding a directory, an `ae-*` name, or an exit code of zero is insufficient. Failures reported by the pinned tool for supported clients are also treated as failures, even when shared files exist.

- Complete verification: `ok: true`.
- Partial installation: `ok: false`, preserving the CLI result and listing failed Skills and reasons.
- Unrelated PromptScript/Eve project-only diagnostics and their failure summary are handled internally and not displayed as user warnings after verification succeeds.
- YAML errors, missing or stale files, supported-client installation errors, CLI version mismatch, and unsuccessful processes remain failures.

`--format json` emits one report on stdout. Progress goes to stderr; raw subprocess logs are not forwarded. Reports include `ok`, `dry_run`, `cli.package/version/path/verified`, `skills.directory/expected_count/installed_count/missing/source/version/failures/attempts`, `auth.host/authenticated`, and `next_steps`. Counts refer to unique Skills in the global directory. Use `--format table` for a human summary. Dry runs make no subprocess calls or installation/configuration writes.

`install --dry-run --format json` returns that report directly, with a root-level `commands` array. `update --dry-run --format json` keeps the command envelope (`ok` and `data`); its `data` includes `action`, `dryRun`, `target`, optional `host`, `commands`, and `skillsSources`.

Each `commands` array describes the current installation plan; `skillsSources` lists the current source choices. Array lengths and contents can change with the installer. Automation should run the complete `install` or `update` command, check its exit code and `ok`, and inspect the installation report. Do not depend on fixed array indexes or execute individual entries as a replacement for the installer.

The managed synchronizer uses the verified package source. Replaying historical GitHub fallback or `skills add --copy` commands would bypass business selection and copy protection.

## Start using AE in an Agent

If the user asks to install AE CLI, run the installer and report the verification result. If the user ran `npm install -g`, locate the requested version's executable and run `ae-cli install --format json` with it to sync and verify the matching global Skills.

1. Check `ok: true`, `dry_run: false`, `cli.verified: true`, and `skills.status: "success"`. On success, report the verified version and installed Skill count. If the request is just installation, finish here even when the report includes `next_action: "choose_account"`. A request such as “Follow this guide to install AE CLI” is an installation request. For an upgrade, a dry run, or incomplete verification, report the result and stop. Include the status and affected Skills if synchronization failed or was skipped.
2. Continue only when the user explicitly asks for AE onboarding, a walkthrough, signup, or sign-in. If the user already has a verified installation, start here. For `check_authentication`, a missing `next_action`, or an existing installation without a current report, run `ae-cli auth status --format json` with the verified executable. Use the user's supplied `--host` when applicable. If the check fails, explain the result and confirm the intended environment before starting signup or login.
3. Follow the route the user requested.
   - For an existing-account login, use step 5. If the intended environment is already signed in, use it for the user's AE task.
   - For signup or an explicit choice to start a new experience, use step 4. If the user explicitly asks for onboarding or a walkthrough and leaves the account route open, continue in their signed-in environment when available. Otherwise show **“Get started”** (step 4), **“Sign in to my existing account”** (step 5), and **“Not now”** (finish) in the Agent's native picker. Use equivalent chat choices if the picker is unavailable. Wait for the selection.
4. Use an explicitly requested or already confirmed market. Otherwise resolve the market from the local language and the user's request.
   - Read `local_language` from the install report. Without a current report or on older versions, check `AE_LANG`, `LC_ALL`, `LC_MESSAGES`, `LANG`, and `LANGUAGE` in that order for the local locale. Map Chinese to China, English to the United States, Japanese to Japan, and Korean to South Korea.
   - Compare that market with the language of the user's own request. Ignore the language of quoted commands, links, and guide text. If both languages map to different markets, build the picker with exactly those two markets. For a Chinese local language and an English request, the two options are **China** and **United States**. Treat the CLI's `markets` list as supported-market metadata. Otherwise use the local market, or the request language if the local locale is unavailable or unsupported. If neither yields a market, use the United States.
   - For China, explain that website signup for CLI onboarding is currently unavailable and end the signup flow. The user's existing AE account can sign in using its original environment URL.
   - For Japan, South Korea, or the United States, start website onboarding with `ae-cli analysis onboarding run --browser system --format json`. Pass `--region jp`, `--region kr`, or `--region us` for the resolved market and `--source` for the current AI tool. Pass `--language` for the conversation if it differs from the local language. The CLI opens the system default browser. If opening fails, share the returned URL. Read the returned `skill_path` and reuse `session_id` in the same conversation.
5. To sign in, use the original AE environment supplied or confirmed by the user. If its address is unknown, ask for it. Follow the device flow below. Once the session is authorized, confirm that `ae-cli auth status` reports the expected environment and signed-in account.

## Host and login

`--host` is optional. It delegates status checks to the existing auth command; it does not independently save credentials or change the active host. Being logged out does not make a verified installation fail.

```bash
ae-cli auth login --host <AE_HOST> --no-wait
```

Open the returned `verification_url` in the system default browser once. In an Agent, use its native picker for **“I approved CLI access”** or **“I need help authorizing the CLI.”** If opening fails, give the user the link. After the user confirms, run these commands in the same turn.

```bash
ae-cli auth login --host <AE_HOST> --device-code <DEVICE_CODE>
ae-cli auth status --host <AE_HOST>
```

Never print, copy, or manually save any token.

## Business selection after login

First installation without confirmed business state installs all bundled Skills. After successful login, `config refresh`, an account switch, or an active-environment switch, config determines the optional business selection. Analysis and foundation Skills remain available. Only pristine managed copies of explicitly disabled businesses are removed; enabled businesses are restored from the package. Unknown states preserve existing copies. Installation, update, and automatic version synchronization reuse this selection, so an upgrade does not restore disabled Skills.

```bash
ae-cli config refresh
ae-cli config show
```

The global selection follows one active local environment. An explicit `--host` refresh reads that environment's config without changing global Skills, even when its URL matches the active host. External-token and sandbox invocations do not manage local global Skills. Failed config or Skill synchronization does not revoke successful authentication. Partial synchronization reports protected or failed paths; resolve the reported conflict and retry. Existing copies are adopted once only when they exactly match a known package source. No regular backup is needed because the CLI package retains the complete resources.

Older Skills installations may have created client links to the shared global directory. The synchronizer migrates an existing same-name link only when its destination is a managed shared Skill whose contents still match both its ownership record and the installed package. A confirmed disabled business removes the verified links before its shared copy; an enabled business replaces them with managed copies. Unknown business states leave links unchanged. Custom targets, modified shared contents, and links to package sources remain protected.

Start a new Agent session after synchronization. Descriptions already loaded into a conversation cannot be withdrawn.

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

The newer command orchestrates the work; the installed target remains the host-required version. Required package versions must be published and accessible. Global CLI installation follows one target at a time; switching between differently versioned hosts can switch that installation again.

## Advanced manual troubleshooting

Prefer the unified installer. For a specific client or source diagnosis, advanced users can still invoke the external Skills tool directly:

```bash
npx -y skills@1.5.12 add <INSTALLED_CLI_SKILLS_PATH> -g -y --agent codex --skill ae-analysis
npx -y skills@1.5.12 list -g --json
```

Choose the specific Skill you are troubleshooting. The onboarding Skill is loaded from the CLI package when a new user starts onboarding. Raw manual-tool output is not the AE installer's final result. Do not infer completeness from the list alone, delete unrelated Skills, or overwrite a source link to resolve a conflict.

## AI installation prompt

> Install AE CLI and its matching global Skills with `npx @thinkingai/ae-cli@latest install --format json`. Use the version and registry I supply, if any. Verify the installation and report the CLI version and Skill count. If I also ask for onboarding or sign-in, follow [Start using AE in an Agent](#start-using-ae-in-an-agent).
