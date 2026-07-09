# analysis project-space create

Use when the user explicitly wants to create a project space.

Do not use to create folders inside a space. Use `folder create`.

Command:

```bash
ae-cli analysis project-space create --project-id <project_id> [--space-name <name>] [--space-desc <text>] [--avatar-type <type>] [--color-key <key>] [--avatar <value>] [--payload '{...}'] --yes
```

Input sends `project_id` plus optional space metadata and `payload`. `avatar_type` defaults to `1` (word avatar) when omitted. When using `--payload`, put custom avatar fields in the payload or pass explicit top-level flags.

Output is the gateway envelope. `data` contains the created project-space result.
