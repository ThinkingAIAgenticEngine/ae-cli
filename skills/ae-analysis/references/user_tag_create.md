# analysis user-tag create

Create a user tag directly from an AI-facing definition request.

Do not use it for uploaded-ID tags; use `user-tag create-id`. Output identifies the created tag and initial state; computation completion is a later state.

Flags: `--project-id`, `--tag-name`, `--display-name`, `--definition-request` required. Optional: `--authenticated-only`, `--zone-offset`, `--entity-id`. The tag type comes from `definition_request.type`.

Read `user_tag_models.md` before constructing `--definition-request`. Create does not accept `--remark`; set it later with `user-tag update` when needed.

The backend validates and compiles the definition inside the create operation; if metadata is ambiguous or missing, creation fails without creating the tag.

```bash
ae-cli analysis user-tag create --project-id <project_id> --tag-name high_value --display-name "High Value" --definition-request '{"type":"condition","condition_values":[{"value":"high","events":[{"event":"pay","operator":"gte","value":3,"aggregation":"count","time_range":{"mode":"recent","unit":"day","value":30}}]}]}'
```
