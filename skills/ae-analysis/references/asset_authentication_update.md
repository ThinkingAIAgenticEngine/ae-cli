# analysis-governance asset-authentication update

Use to authenticate or revoke an explicit set of typed project assets.

Do not use it with guessed identities or as a rule engine; derive an explicit typed set from `list` or `export` first.

Inline command:

```bash
ae-cli analysis-governance asset-authentication update --project-id <project_id> --authentication-status 1 --asset-refs '[{"resource_type":"dashboard","resource_key":"4350"}]'
```

Large file command:

```bash
ae-cli analysis-governance asset-authentication update --project-id <project_id> --authentication-status 1 --asset-file /tmp/selected-assets.jsonl
```

Capability id: `governance.asset_authentication.update`.

This is the canonical typed management route from the asset-governance branch. The older `analysis-meta asset-authentication update` route remains a compatibility payload wrapper.

Choose exactly one identity input:

- `--asset-refs` for an inline typed array.
- `--asset-file` for JSONL rows containing `resource_type` and `resource_key`; extra export columns are ignored.
- `--asset-type` with `--asset-ids` as a same-type convenience form.

The CLI always normalizes the request to `asset_refs[]`. A bare `asset_ids[]` array is never sent to Common. Updates affect only the explicitly selected assets. Unrelated project certification changes do not reject the update. Repeated authentication or revocation is a no-op and counts come from actual database changes. Concurrent opposite operations on the same asset follow database execution order.

The response includes requested, resolved, changed, unchanged, and failed counts; retry only the returned failures.

`--expected-snapshot-hash` is retained as a deprecated compatibility no-op: the CLI warns on stderr and does not send it. Updated servers also accept legacy `expected_snapshot_hash` inputs without project snapshot checks. Remove the option from existing scripts. Export `snapshot_hash` remains informational and is not an update precondition.

Deploy the server fix before the CLI/Skill update. New CLI requests omit the optional hash and are accepted by older servers, but those servers still have the original locking behavior. Old clients remain accepted by the updated server; a stale hash no longer rejects their explicit asset updates.

## analysis-meta asset-authentication update

Capability id: `metadata.asset_authentication.update`.

The legacy `--payload` entry remains available for one release cycle.

```bash
ae-cli analysis-meta asset-authentication update --project-id <project_id> --payload '{"authentication_status":1,"asset_list":[{"asset_name":"4350","asset_type":"dashboard"}]}'
```

Legacy Input is `project_id` plus `payload`. Legacy Output is the new structured batch result, although the input shape remains deprecated.
