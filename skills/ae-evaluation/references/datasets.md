# Datasets

Commands use `ae-cli evaluation +<command>`. Read the shared endpoint, authentication, and mutation rules in [SKILL.md](../SKILL.md). Use command `--help` for optional flags.

### Datasets

```bash
ae-cli evaluation +list_datasets [--search <text>] [--status CREATING|READY|IMPORT_FAILED] [--cursor <cursor>] [--page-size 50]
ae-cli evaluation +get_dataset --id <dataset-uuid>
ae-cli evaluation +create_dataset --name "<name>" [--description "..."]
ae-cli evaluation +import_dataset --name "<name>" --file <path> [--profile GENERIC|AGENT_TASK_CASES_V1] [--description "..."] --idempotency-key "<fresh-key>"
ae-cli evaluation +dataset_import_status --id <dataset-uuid>
ae-cli evaluation +dataset_import_errors --id <dataset-uuid>
ae-cli evaluation +update_dataset --id <dataset-uuid> --name "<name>" [--description "..."] --lock-version <n>
ae-cli evaluation +delete_dataset --id <dataset-uuid> --lock-version <n>
ae-cli evaluation +transfer_dataset_owner --id <dataset-uuid> --owner-user-id <user-uuid> --lock-version <n>
ae-cli evaluation +list_dataset_fields --id <dataset-uuid>
ae-cli evaluation +create_dataset_field --id <dataset-uuid> --display-name "<name>" --data-type TEXT|NUMBER|BOOLEAN|JSON|DATE|TIME
ae-cli evaluation +batch_create_dataset_fields --id <dataset-uuid> --fields-json '[{"display_name":"Question","data_type":"TEXT"}]'
ae-cli evaluation +update_dataset_field --id <dataset-uuid> --field-id <field-uuid> --display-name "<name>" [--ordinal 0] --lock-version <n>
ae-cli evaluation +delete_dataset_field --id <dataset-uuid> --field-id <field-uuid> --lock-version <n>
ae-cli evaluation +reorder_dataset_fields --id <dataset-uuid> --field-ids '["<uuid-1>","<uuid-2>"]' --lock-version <n>
ae-cli evaluation +list_dataset_cases --id <dataset-uuid> [--cursor <cursor>] [--page-size 50]
ae-cli evaluation +get_dataset_case --id <dataset-uuid> --case-id <case-uuid>
ae-cli evaluation +create_dataset_case --id <dataset-uuid> --data '{"input":"...","expected":"..."}'
ae-cli evaluation +batch_create_dataset_cases --id <dataset-uuid> --cases-json '[{"data":{"input":"...","expected":"..."}}]'
ae-cli evaluation +update_dataset_case --id <dataset-uuid> --case-id <case-uuid> --data '{...}' --lock-version <n>
ae-cli evaluation +delete_dataset_case --id <dataset-uuid> --case-id <case-uuid> --lock-version <n>
ae-cli evaluation +export_dataset --id <dataset-uuid> --export-format csv|jsonl
ae-cli evaluation +list_dataset_versions --id <dataset-uuid>
ae-cli evaluation +publish_dataset_version --id <dataset-uuid> --lock-version <n>
ae-cli evaluation +get_dataset_version --id <dataset-uuid> --version-id <dataset-version-uuid>
ae-cli evaluation +list_dataset_references --id <dataset-uuid>
```

- `--field-ids` must contain every field UUID exactly once, in the desired order.
- Case `--data` is keyed by `field_key` from `+list_dataset_fields`. Single-case `--data` and batch `--cases-json` are redacted from command logs. Sensitive JSON parse errors omit input content; successful requests and explicit dry-run previews retain the supplied case data.
- Batch field creation accepts 1-100 definitions and batch case creation accepts 1-1000 definitions. Each batch is transactional: either every item is created or none are.
- Field mutations use the dataset lock_version; case mutations use the case lock_version from `+get_dataset_case`.

### Import a dataset and wait for readiness

Import requires a fresh Idempotency-Key and returns 202 with the created dataset; the pipeline is asynchronous:

```bash
ae-cli evaluation +import_dataset \
  --name "release-checkout" \
  --file ./cases.csv \
  --profile GENERIC \
  --idempotency-key "import-$(date +%s)"
ae-cli evaluation +dataset_import_status --id <dataset-uuid>   # poll until READY
ae-cli evaluation +dataset_import_errors --id <dataset-uuid>   # if IMPORT_FAILED
ae-cli evaluation +list_dataset_fields --id <dataset-uuid>     # field keys for mapping/case data
```

Download exported files using [files.md](files.md): poll `+get_file`, then
`ae-cli evaluation file download --id <file-uuid> --output ./dataset.csv`.
