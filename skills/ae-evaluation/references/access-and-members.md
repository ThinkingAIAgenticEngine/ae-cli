# Resource visibility and project members

Read [SKILL.md](../SKILL.md) for authentication and mutation rules. These commands
require administrator privileges (`root` or `agent_admin`). Permission changes
are high-risk writes; retain confirmation unless the user authorizes `--yes`.

## Resource visibility

```bash
ae-cli evaluation dataset access-scope --id <dataset-uuid> --access-scope COMPANY --lock-version <n>
ae-cli evaluation evaluator access-scope --id <evaluator-uuid> --access-scope COMPANY --lock-version <n>
ae-cli evaluation model-config access-scope --id <model-config-uuid> --access-scope PERSONAL --lock-version <n>
ae-cli evaluation agent access-scope --id <agent-uuid> --access-scope PERSONAL --lock-version <n>
```

Read the current resource with its `+get_*` command before changing it. Each
successful mutation increments `lock_version`. PERSONAL and COMPANY are mutable;
SYSTEM resources are read-only. COMPANY sharing stays within the authenticated
project/tenant. Shared assets cannot depend on personal configurations or
credentials (`ACCESS_SCOPE_DEPENDENCY_PRIVATE`); inspect dependencies rather
than silently broadening their visibility. Ordinary model/Agent creation produces
personal resources and is not restricted to administrators by its create route.
Credential operations and administrative routes remain administrator-only.

## Project membership

```bash
ae-cli evaluation +list_project_members
ae-cli evaluation project-member list-candidates
ae-cli evaluation project-member batch-add --members-json '[{"external_id":"<te-id>","display_name":"<name>"}]'
ae-cli evaluation project-member change-role --id <user-uuid> --role agent_admin
ae-cli evaluation project-member set-status --id <user-uuid> --status DISABLED
ae-cli evaluation project-member remove --id <user-uuid>
```

Discover candidates rather than guessing IDs. Admission takes TE `external_id`;
role/status/removal take the project member's `user_id` UUID from
`+list_project_members`. Batch admission returns added/skipped counts and skips
existing members. These routes do not accept `lock_version`.

Roles are `root`, `agent_admin`, and `member`; change-role accepts only
`agent_admin|member`. Root members are protected. `set-status` accepts
`ACTIVE|DISABLED` and affects login across all projects in the tenant. `remove`
revokes only the current project's membership, including subsequent TE login
and refresh, until explicitly re-added. Never describe disabling a login as
merely removing it from one project.

Transition status: transitional
Owning module: Agent Evaluation accessscope and membership
Current transport: authenticated REST /agenteval/api/v1
Gateway target: TBD (evaluation access-scope and member administration)
Review after: 2027-01-21
Exit condition: when equivalent capabilities exist, migrate typed permission
commands to L2 where confirmation and typed validation add value; use L3 for
simple discovery operations and remove duplicate Transitional routes.
