# experiment feature save

Create or update a Feature.

```bash
ae-cli experiment feature save --project-id <id> --req '<json>'
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--req`: Feature save request JSON object.

Create mode requires `featureKey`, `type`, and `targetPlatform`. Modify mode requires
`update=true`; `id` is only valid in modify mode.

In create mode, set the optional Boolean `req.fixedValueEnabled` to `true` to enable fixed
values for the new Feature. Omitting the field or passing `false` leaves fixing disabled.

```bash
ae-cli experiment feature save --project-id 1 --req '{"featureKey":"button_color","type":"string","defaultValue":"blue","targetPlatform":["server"],"fixedValueEnabled":true}' --dry-run
```

For existing Features, use [`experiment feature update-fixed-value`](manage_feature_fixed_value.md).
Older Hermes versions may reject `fixedValueEnabled` during creation. Check with `--dry-run`
before executing. If the field is unsupported, create without it, then use the dedicated command
after confirmation if the server supports it.
