# analysis-meta event-property-bundle import

Use this reference only to identify the reserved future import contract; the current backend is intentionally blocked.

Do not use it for a real import. It always returns `CAPABILITY_REQUIRES_FILE_ADAPTER` until CLI input-file handling is wired to the server import service.

Reserved command: `ae-cli analysis-meta event-property-bundle import`. Do not invoke it while the backend is blocked.

Capability id: `metadata.event_property_bundle.import`.

Input sends `project_id`, `operation`, and the operation-specific file or pre-import identifier.

Output is the structured `CAPABILITY_REQUIRES_FILE_ADAPTER` error with `implementation_status=blocked`; no metadata is imported.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--operation` | Yes | Import step: `pre_import` or `ensure_import`. |
| `--input-file-id` | No | Uploaded XLSX file ID for `pre_import`; upload it with purpose `super_metadata.import.xlsx`. |
| `--pre-import-meta-uuid` | No | UUID returned by `pre_import`, required for `ensure_import`. |
