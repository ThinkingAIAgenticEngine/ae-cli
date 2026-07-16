# analysis user-tag update

Update a user tag. Discover the exact `tag_name` first.

Do not use it for ID-file value replacement or to create a missing tag. Output is the updated tag result; a submitted recomputation may still be in progress.

Flags: `--project-id`, `--tag-name` required. Optional: `--display-name`, `--definition-request`, `--authenticated-only`, `--remark`, `--zone-offset`. The tag type comes from `definition_request.type` when the definition changes.

Read `user_tag_models.md` before changing the definition. The backend validates and compiles `definition_request` inside update and refuses to modify the tag if clarification is required.

```bash
ae-cli analysis user-tag update --project-id <project_id> --tag-name user_level --display-name "User Level v2"
```
