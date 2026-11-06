# analysis-meta virtual-property sql-rule-update

Use when the user needs to update SQL virtual property rule.

Do not use it for renaming a physical property. Use only when replacing the complete SQL rule for an existing virtual property and an exact DTO is available.

Command:

```bash
ae-cli analysis-meta virtual-property sql-rule-update --project-id <project_id> --sql-expression '<sql>' --v-prop '{"prop_id":22990,"property":{"column_name":"#vp@demo","table_type":"event","select_type":"number"}}' --properties '[...]'
```

Capability id: `metadata.virtual_property.sql_rule_update`.

Input sends typed snake_case fields.

Output is a successful gateway envelope with no business data.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--sql-expression` | Yes | Replacement SQL expression. |
| `--v-prop` | Yes | Existing virtual property JSON object. Put `prop_id` directly under `v_prop`, beside `property`; do not put it inside `property`. |
| `--properties` | No | Dependent property JSON array. |
| `--sql-event-relation-type` | No | `relation_default`, `relation_always`, or `relation_by_setting`. |
| `--related-events` | No | Related events JSON array for `relation_by_setting`. |
| `--tag-date-policies` | No | Tag date policies JSON array. |
| `--replace-remark` | No | Replacement remark. |
| `--replace-suggestion` | No | Replacement suggestion. |

Both virtual **user** and **event** properties can reference a tag in SQL, for example `ta_tag."vip_level"`. Resolve the tag's resource key with `analysis-meta catalog list`. For a user property, choose a tag based on a user entity.

For an event property, pass each version override once:

```sh
--tag-date-policies '[{"tag_name":"vip_level","cluster_date_policy":"AUTO"},{"tag_name":"tier","cluster_date_policy":"SPECIFIED","specified_cluster_date":"2026-10-09"}]'
```

LATEST is the default. Only history-capable tags accept AUTO or SPECIFIED. Only SPECIFIED takes a date. For a local fixed date, choose from `analysis user-tag get --include-history-dates true`. For a cross-source tag, use the requested date. Read `analysis-meta property get` for the saved SQL and policies. Send changes for the tags you want to update. Set a referenced tag to LATEST explicitly to reset it. Other referenced tags retain their policy; removing a tag from the SQL removes its policy.
