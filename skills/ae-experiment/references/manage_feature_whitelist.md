# Feature Whitelist Rules

List, create, modify, enable, disable, or delete explicit Feature whitelist rules.

## List

```bash
ae-cli experiment feature whitelist list \
  --project-id <id> --feature-key <feature_key>
```

The result contains only explicit whitelist rules for the Feature. Each item exposes `rule_id`,
`feature_key`, `priority`, `status`, and a structured snake-case `whitelist` array. Use the returned
`rule_id` for modification, status changes, or deletion.

## Save

```bash
ae-cli experiment feature whitelist save \
  --project-id <id> \
  --feature-key <feature_key> \
  --status enable \
  --whitelist '[{"bucket_id":"#user_id","rules":[{"ids":["u1","u2"],"value":"on"}]}]'
```

Pass `--rule-id` to modify an existing whitelist rule. Omit it to create a rule. The Hermes
Capability fixes the Atlas rule type to `targeting` and serializes the supplied buckets into the
server's explicit whitelist rule configuration.

Rules:

- Resolve the Feature with `experiment feature get` before writing.
- `bucket_id` is the split subject, such as `#user_id` or `#account_id`.
- Each bucket contains one or more rows with a non-empty `ids` array and a string `value`.
- An empty string Feature value is allowed. Bucket IDs cannot be empty or duplicated. IDs must be
  unique within one bucket, while different buckets may use the same string ID.
- The server validates each value against the Feature type and limits the total ID count.
- Only one explicit whitelist rule can be enabled for the same Feature.
- Enabling, modifying, disabling, or deleting an enabled whitelist rule immediately creates a new
  version and syncs RCC when the Feature itself is online.

## Status

```bash
ae-cli experiment feature whitelist update-status \
  --project-id <id> --rule-id <rule_id> --status enable
```

Valid status transitions exposed by this command are `enable` and `disable`.

## Delete

```bash
ae-cli experiment feature whitelist batch-delete \
  --project-id <id> --rule-ids '["0001"]'
```

Deletion is high risk and requires confirmation. Enabled whitelist rules may be deleted; Hermes
resynchronizes affected online Features afterward.

All four commands use Capability Gateway with CLI-token authentication:

- `experiment.feature_whitelist.list`
- `experiment.feature_whitelist.save`
- `experiment.feature_whitelist.update_status`
- `experiment.feature_whitelist.batch_delete`
