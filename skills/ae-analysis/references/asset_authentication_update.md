# analysis-meta asset-authentication update

Use when the user needs to batch authenticate or unauthenticate assets.

Do not use it to edit the asset itself or to authenticate a guessed asset name; call `asset authentication-list` first and submit only returned asset identities.

Command:

```bash
ae-cli analysis-meta asset-authentication update --project-id <project_id> --payload '{"authentication_status":1,"asset_list":[{"asset_name":"<name>","asset_type":"<type>"}]}'
ae-cli analysis-meta asset-authentication update --dry-run
```

Capability id: `metadata.asset_authentication.update`.

Input sends `project_id`, `payload`.

Output is a successful gateway envelope with no business data. Verify with `asset authentication-list`.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--payload` | Yes | `{authentication_status, asset_list}`. `authentication_status` is `1` to authenticate or `0` to revoke; each `asset_list` item requires the real `asset_name` and `asset_type` returned by the list command. |
