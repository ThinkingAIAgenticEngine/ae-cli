# analysis_meta +generate_track_sdk_sample (Generate SDK Sample Files)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Project Configuration**

## Use Cases
- Generate SDK sample files based on the current tracking plan and requested SDK types. This flow is asynchronous and users should check in-site messages for final downloadable results.
- Useful for developers who need SDK integration code samples based on the tracking plan.

## Commands
```bash
ae-cli analysis_meta +generate_track_sdk_sample --project_id <project_id> --sdk_type '["android-java","ios-swift"]'
ae-cli analysis_meta +generate_track_sdk_sample --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--sdk_type` | Yes | SDK types as JSON array. Allowed values: android-java, server-php, ios-swift, server-python, web-js, server-java, server-nodejs, wechat-miniapp, harmonyos-arkts, android-kotlin, unity-csharp, cocos-creator-ts, server-go, server-cpp, ios-objc. |

## Decision Rules
- First run should only pass the required parameters (`--project_id`, `--sdk_type`).
- Wrap JSON arguments in single quotes (for example `--sdk_type '["android-java"]'`) to avoid shell escaping issues.
- This is an asynchronous operation; check in-site message center for downloadable SDK sample results.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id` and `--sdk_type`).
- If `SDK_TYPE_INVALID` occurs, verify that all SDK types are from the allowed values list: android-java, server-php, ios-swift, server-python, web-js, server-java, server-nodejs, wechat-miniapp, harmonyos-arkts, android-kotlin, unity-csharp, cocos-creator-ts, server-go, server-cpp, ios-objc.
- If `Invalid JSON` occurs, validate with the smallest JSON array first (for example `["android-java"]`).

## Agent Response Flow
**After successful command execution, the agent MUST inform the user in English:**
1. The command has been submitted successfully
2. It's running asynchronously in the background
3. Check the TE page inbox/notifications for the final downloadable results

Example response: "Command submitted successfully. The SDK sample generation is running asynchronously. Please check your TE inbox for the download link once it completes."

## Recommended Chaining
- +get_track_program -> +generate_track_sdk_sample -> (check message center for download)