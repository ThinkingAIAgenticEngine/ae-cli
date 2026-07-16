# analysis user-cluster-member list

Run a bounded inline cluster member query. Read `analysis_data_retrieval.md` before choosing list vs export.

Do not use it for complete/unknown-size membership retrieval or cluster metadata. Output contains at most the requested inline limit and has no caller pagination contract.

Flags: `--project-id`, `--cluster-name` required. Optional: `--property-names`, `--fields`, `--query`, `--use-cache`, `--request-id`, `--limit`, `--timeout-seconds`.

When `--fields` is omitted, each member row returns `#user_id`, `#account_id`, and `#distinct_id`. Cluster members do not expose tag-only fields such as `tag_value` or `tag_date`. The sync timeout defaults to 120 seconds and accepts an explicit value up to 180 seconds.
The inline member limit defaults to 50 and accepts 1..200.

If you provide `--request-id`, use `cli_<32 lowercase hex>`. Omit it unless you need to correlate logs or cancel a known running query.

For full or unknown-size member data, use `user-cluster-member export`; the list command has no next-page contract.

```bash
ae-cli analysis user-cluster-member list --project-id <project_id> --cluster-name retained_users --limit 100
ae-cli analysis user-cluster-member list --project-id <project_id> --cluster-name retained_users --property-names '["country"]' --fields '["#user_id","#account_id","#distinct_id","country"]' --query US --limit 50
```
