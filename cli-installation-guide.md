# AE CLI Installation Guide

This guide tells an AI Agent how to install, log in to, verify, and upgrade the public AE CLI.

Complete the steps in order. Only modify the user's runtime environment; do not modify the current project.

## 1. Check the environment

The user must provide an AE host URL, shown below as `<AE_HOST>`.

```bash
node --version
npm --version
```

AE CLI requires Node.js 20 or later. If Node.js is missing or too old, install a current LTS release from an official or trusted source, then check again.

Prefer an existing version manager such as nvm, fnm, or Volta and a user-level installation. Do not stop just because Node.js is missing. Ask the user only when administrator approval is required or company policy blocks installation. Never use `sudo npm install -g`.

## 2. Install AE CLI and Skills

```bash
npm install -g @thinkingai/ae-cli --registry=https://registry.npmjs.org
npx -y skills add ThinkingAIAgenticEngine/ae-cli -g -y
ae-cli --version
```

If another package already provides the `ae-cli` command, report it and ask before replacing it.

## 3. Log in

Check the current status:

```bash
ae-cli auth status --host <AE_HOST>
```

If `authenticated` is `true`, continue to Step 4. Otherwise start the split login flow:

```bash
ae-cli auth login --host <AE_HOST> --no-wait
```

Send the returned `verification_url` to the user and wait for them to complete browser authorization. Then resume with the returned device code:

```bash
ae-cli auth login --host <AE_HOST> --device-code <DEVICE_CODE>
```

If the device code expires, run the `--no-wait` command again.

## 4. Synchronize and verify

Install the exact CLI and Skills version required by the AE host:

```bash
ae-cli update --host <AE_HOST>
ae-cli --version
ae-cli auth status --host <AE_HOST>
```

Installation is complete when synchronization succeeds and `authenticated` is `true`.

Report the Node.js version, AE CLI version, AE host, authentication status, and Skills synchronization result.

## Upgrade

For an existing public installation, check authentication, run `ae-cli update --host <AE_HOST>`, and verify again. Do not replace this with an npm `latest` upgrade because different AE hosts may require different versions.

## Rules

- Install only Node.js, `@thinkingai/ae-cli`, and official AE Skills.
- Do not modify project files or add project dependencies.
- Do not print or manually store tokens or credentials.
- Do not disable TLS verification or use an untrusted registry or mirror.
- Ask before administrator-level or system-wide changes.
- On failure, report the exact command and error; do not repeatedly retry.
