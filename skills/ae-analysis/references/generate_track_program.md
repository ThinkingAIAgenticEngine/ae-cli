# analysis_meta +generate_track_program (Generate Tracking Plan)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Project Configuration**

## Use Cases
- Generate a tracking plan from structured business context. This AI generation flow is different from save_track_items: save_track_items persists explicitly provided plan items, while this tool requests AI generation and saves the generated result asynchronously.
- Users should check the in-site message center for final results.
- Do not use it to persist a fully specified set of tracking items; use `+save_track_items` when the exact items are already known.

## CRITICAL: Pre-execution Check
**Before calling this command, you MUST:**
1. Call `+get_track_program` first to check if a tracking plan already exists.
2. If the tracking plan is empty/missing, proceed directly with `+generate_track_program`.
3. If the tracking plan already exists, STOP and warn the user: "A tracking plan already exists. Generating a new one will trigger a merge operation. Do you want to continue?" Wait for user confirmation before proceeding.

## Commands
```bash
ae-cli analysis_meta +generate_track_program --project_id <project_id> --language <language> --form_data '{}'
ae-cli analysis_meta +generate_track_program --dry-run
```

## Parameters
| Parameter             | Required | Description                                                                                                                                                                                                                                                                                                                                                                              |
|-----------------------|----------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `--project_id` / `-p` | Yes      | Project ID                                                                                                                                                                                                                                                                                                                                                                               |
| `--language` / `-l`   | Yes      | Language code. Supported values: `zh-CN`, `en-US`, `ja-JP`, `ko-KR`                                                                                                                                                                                                                                                                                                                      |
| `--form_data`         | Yes      | Structured business context JSON object. Optional fields for example: account_system, revenue_model, core_gameplay, currency_system, main_entries, predefinedEvent (array of event names like install, start, close), developmentCarrier (array of platforms like Android, iOS, Unity, Cocos, Douyin Mini Game, WeChat Mini Game). All fields can be customized based on business needs. |

## Decision Rules
- **CRITICAL: Always call `+get_track_program` first to check existing tracking plan before generating.**
- First run should only pass the required parameters (`--project_id`, `--language`, `--form_data`).
- Wrap JSON arguments in single quotes (for example `--form_data '{}'`) to avoid shell escaping issues.
- This is an asynchronous operation; check in-site message center for generation results.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id`, `--language`, and `--form_data`).
- If `Invalid JSON` occurs, validate with the smallest JSON structure first.

## Agent Response Flow
**After successful command execution, the agent MUST inform the user in English:**
1. The command has been submitted successfully
2. It's running asynchronously in the background
3. Check the TE page inbox/notifications for the generation results

Example response: "Command submitted successfully. The tracking plan generation is running asynchronously. Please check your TE inbox for the results once it completes."

## Recommended Chaining
- **+get_track_program (check existing) -> +generate_track_program (if empty or user confirms) -> (check message center) -> +get_track_program (verify result)**
- +get_project_config -> +get_track_program -> +generate_track_program
