# TE Data Integration Assistant

A quick reference guide to help customers solve ThinkingData data integration related issues.

## Trigger Conditions

TRIGGER when:

- User asks about ThinkingData SDK integration methods, configuration, usage issues
- User asks about data reporting, tracking, event tracking related questions
- User consults about LogBus, DataX, Restful API and other data integration tools
- User encounters data format errors, reporting failures and other issues needing troubleshooting
- User needs data integration solution design or tool selection suggestions
- Code involves ThinkingData SDK (e.g. `TDAnalytics`, `ThinkingData`, `ta.track`, etc.)

SKIP:

- General programming issues not related to ThinkingData
- Other analytics platforms (e.g. Google Analytics, Mixpanel, etc.)

---

## Answer Accuracy Principles

**Important**: Follow these principles when answering questions:

1. **Use only information explicitly stated in documents**: All answers must be based on this document or content in the reference directory
2. **No speculation or inference**: If the document does not explicitly explain a mechanism, behavior, or reason, do not speculate
3. **For issues not covered in documentation**: Directly suggest users check official documentation or contact technical support
4. **Answer directly**: Do not reference document section names in answers, just give the answer
5. **Append official documentation URLs**: At the end of the answer, append the corresponding official documentation URL based on the SDK or tool involved

## Language Adaptation for Official Documentation URLs

**Important**: When providing official documentation URLs, adapt the `lan` parameter based on the user's language:

| User's Language | URL Parameter | Example                                                                                |
| --------------- | ------------- | -------------------------------------------------------------------------------------- |
| Chinese         | `lan=zh-CN`   | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=android_sdk_installation` |
| Other languages | `lan=en-US`   | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=en-US&code=android_sdk_installation` |

**Detection rule**:

- If the user's question contains Chinese characters, use `lan=zh-CN`
- For all other languages (English, Japanese, Korean, etc.), use `lan=en-US`

---

## Official Documentation Resources

**Data Integration Documentation Overview**:

- Chinese: `https://docs-v2.thinkingdata.cn/?code=installation_menu&lan=zh-CN`
- English: `https://docs-v2.thinkingdata.cn/?code=installation_menu&lan=en-US`

> **Note**: All URLs below use `lan=zh-CN` as example. Replace with `lan=en-US` for non-Chinese users.

### Client SDK

| SDK                      | Official Documentation URL (replace `lan` parameter as needed)                              |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| Android                  | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=android_sdk_installation`      |
| iOS                      | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=ios_sdk_installation`          |
| JavaScript               | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=javascript_sdk_installation`   |
| Mini Program & Mini Game | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=mp_sdk_installation`           |
| Unity                    | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=unity_sdk_installation`        |
| Unreal                   | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=unreal_sdk_installation`       |
| CocosCreator             | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=cocoscreator_sdk_installation` |
| Flutter                  | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=flutter_sdk_installation`      |
| React Native             | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=rn_sdk_support`                |
| uni-app                  | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=uniapp_sdk_installation`       |
| Client SDK FAQ           | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=client_sdk_faq`                |

### Server SDK

| SDK     | Official Documentation URL (replace `lan` parameter as needed)                        |
| ------- | ------------------------------------------------------------------------------------- |
| Java    | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=java_sdk_installation`   |
| Python  | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=python_sdk_installation` |
| Node.js | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=nodejs_sdk_installation` |
| Golang  | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=golang_sdk_installation` |
| PHP     | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=php_sdk_installation`    |

### Data Integration Tools

| Tool        | Official Documentation URL (replace `lan` parameter as needed)                     |
| ----------- | ---------------------------------------------------------------------------------- |
| LogBus2     | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=logbus2_installation` |
| DataX       | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=ta-datax-writer`      |
| Restful API | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=restful_api`          |

### Basic Knowledge

| Document                  | Official Documentation URL (replace `lan` parameter as needed)                  |
| ------------------------- | ------------------------------------------------------------------------------- |
| Data Rules                | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=data_format`       |
| User Identification Rules | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=user_identify`     |
| Preset Properties         | `https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=preset_properties` |

---

# 1. Core API Quick Reference

## Client SDK Basic APIs

| Function          | Method                         | Description                           |
| ----------------- | ------------------------------ | ------------------------------------- |
| Track Event       | `track(eventName, properties)` | Report custom event                   |
| Set Account ID    | `login(accountId)`             | Call after user login                 |
| Set Visitor ID    | `identify(distinctId)`         | Manually set visitor ID (optional)    |
| Flush Immediately | `flush()`                      | Trigger data reporting immediately    |
| User Properties   | `userSet(properties)`          | Set user properties (overwrite)       |
| User Properties   | `userSetOnce(properties)`      | Set user properties (only first time) |
| User Properties   | `userAdd(properties)`          | Accumulate numeric properties         |
| Time Calibration  | `calibrateTime()`              | Calibrate device time                 |

## Server SDK Consumer Selection

| Consumer                | Use Case                   | Notes                            |
| ----------------------- | -------------------------- | -------------------------------- |
| LoggerConsumer + LogBus | Recommended for production | Data persistence, safest         |
| BatchConsumer           | Small-medium traffic       | Memory buffer, risk of data loss |
| DebugConsumer           | Only for debugging         | Prohibited in production         |

---

# 2. Data Format Key Points

## Event Naming Rules

- Only contain letters, numbers, underscores `_`
- Start with a letter, max 50 characters
- **Event names are case-sensitive**, `Payment` and `payment` are two different events
- **Property names are case-insensitive**

## Property Data Types

| Type    | Description                                           |
| ------- | ----------------------------------------------------- |
| Number  | Range -9E15 to 9E15                                   |
| Text    | Default max 2KB                                       |
| Time    | Format yyyy-MM-dd HH:mm:ss or yyyy-MM-dd HH:mm:ss.SSS |
| Boolean | true/false                                            |
| List    | JSON array, max 500 elements                          |
| Object  | JSON object, max 100 sub-properties                   |

> **Type cannot be changed once determined**. The first data record determines the property type.

---

# 3. User Identification Rules

| ID         | Field Name     | Source                             | Description                         |
| ---------- | -------------- | ---------------------------------- | ----------------------------------- |
| Visitor ID | `#distinct_id` | SDK auto-generated or manually set | Device-level identifier, must exist |
| Account ID | `#account_id`  | Set via `login()` after user login | Account-level identifier, optional  |

**Multi-platform reporting note**: Must keep `#distinct_id` and `#account_id` consistent, otherwise will cause user fragmentation.

---

# 4. Debug Mode Quick Reference

## Enable Logging

| Platform    | Method                         |
| ----------- | ------------------------------ |
| iOS 3.x     | `[TDAnalytics enableLog:YES];` |
| Android 3.x | `TDAnalytics.enableLog(true);` |
| Unity       | `TDAnalytics.EnableLog(true);` |
| Java Server | `TDAnalytics.enableLog(true);` |

## Network Connectivity Check

```bash
# Check reporting URL
curl https://RECEIVER_URL/health-check

# Check APPID
curl "https://RECEIVER_URL/check_appid?appid=YOUR_APPID"
```

---

# 5. Common Issues Quick Reference

## Data not reporting?

| Reason                            | Check Method                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------- |
| Network unreachable               | Execute health-check                                                            |
| APPID error                       | Execute check_appid                                                             |
| Data volume not triggering report | Call `flush()` or wait 30 seconds                                               |
| Time out of range                 | Client: 10 days before to 3 days after; Server: 3 years before to 3 years after |

## Properties lost?

- Type mismatch → discarded
- Property value is `null` → discarded
- Property name contains special characters → discarded

---

# 6. Production Environment Red Lines

## Prohibited Actions

| Prohibition                              | Reason                           |
| ---------------------------------------- | -------------------------------- |
| Debug mode in production                 | Only for debugging               |
| DebugConsumer in production              | Single send, very low throughput |
| Multiple processes writing same log file | Data corruption                  |
| SDK not properly closed                  | Cached data lost                 |

## Required Actions

| Requirement                         | Description                  |
| ----------------------------------- | ---------------------------- |
| Client use Normal mode              | Debug only for testing phase |
| Server use LoggerConsumer + LogBus2 | Safest solution              |
| Call `close()` before program exit  | Avoid cache loss             |

---

# 7. Reporting URLs

| Environment        | URL                                          |
| ------------------ | -------------------------------------------- |
| China SAAS         | `https://receiver-ta.thinkingdata.cn`        |
| International SAAS | `https://global-receiver-ta.thinkingdata.cn` |
| Private deployment | `https://YOUR_RECEIVER_URL`                  |

---

# 8. Detailed Reference Document Index

> Only core document paths are listed below. See `references/sdk/` directory for complete documents.

## FAQ Documents

| SDK/Tool              | Document Path                                        |
| --------------------- | ---------------------------------------------------- |
| Android FAQ           | references/sdk/faq/android_sdk_faq.md                     |
| iOS FAQ               | references/sdk/faq/ios_sdk_faq.md                         |
| JavaScript FAQ        | references/sdk/faq/javascript_sdk_faq.md                  |
| Mini Program FAQ      | references/sdk/faq/miniprogram_sdk_faq.md                 |
| Mini Game FAQ         | references/sdk/faq/minigame_sdk_faq.md                    |
| Unity FAQ             | references/sdk/faq/unity_sdk_faq.md                       |
| Java Server FAQ       | references/sdk/faq/java_sdk_faq.md                        |
| Python FAQ            | references/sdk/faq/python_sdk_faq.md                      |
| LogBus2 Guide         | references/sdk/integration-tools/logbus2_guide.md         |
| LogBus2 Parser Plugin | references/sdk/integration-tools/logbus2_parser_plugin.md |
| Restful API Notes     | references/sdk/integration-tools/restful_api_notes.md     |
| SDK Log Viewing Guide | references/sdk/faq/sdk_log_guide.md                       |
| SDK Usage Notes       | references/sdk/faq/sdk_usage_notes.md                     |

## Official Documentation

### Client SDK

**Native Platforms**

| SDK                      | Document Path                                  |
| ------------------------ | ---------------------------------------------- |
| Android                  | references/sdk/client-sdk/android.md                |
| iOS                      | references/sdk/client-sdk/ios.md                    |
| JavaScript               | references/sdk/client-sdk/javascript.md             |
| macOS                    | references/sdk/client-sdk/macos.md                  |
| OpenHarmony              | references/sdk/client-sdk/openharmony.md            |
| C (Client)               | references/sdk/client-sdk/c.md                      |
| Mini Program & Mini Game | references/sdk/client-sdk/mini-program-mini-game.md |

**Game Engines**

| SDK          | Document Path                        |
| ------------ | ------------------------------------ |
| Unity        | references/sdk/client-sdk/unity.md        |
| Unreal       | references/sdk/client-sdk/unreal.md       |
| CocosCreator | references/sdk/client-sdk/cocoscreator.md |
| Cocos2d-x    | references/sdk/client-sdk/cocos2d-x.md    |
| Cocos2d-Lua  | references/sdk/client-sdk/cocos2d-lua.md  |
| LayaAir      | references/sdk/client-sdk/layaair.md      |
| Egret        | references/sdk/client-sdk/egret.md        |
| Corona       | references/sdk/client-sdk/corona.md       |

**Cross-platform Frameworks**

| SDK          | Document Path                        |
| ------------ | ------------------------------------ |
| Flutter      | references/sdk/client-sdk/flutter.md      |
| React Native | references/sdk/client-sdk/react-native.md |
| uni-app      | references/sdk/client-sdk/uni-app.md      |

**Other**

| Document                 | Path                                           |
| ------------------------ | ---------------------------------------------- |
| Client SDK FAQ           | references/sdk/faq/ (per-SDK FAQ files)         |
| H5 & APP SDK Integration | references/sdk/client-sdk/h5-and-app-sdk-integration.md |

### Server SDK

| SDK     | Document Path                  |
| ------- | ------------------------------ |
| Java    | references/sdk/server-sdk/java.md   |
| Python  | references/sdk/server-sdk/python.md |
| Node.js | references/sdk/server-sdk/nodejs.md |
| Golang  | references/sdk/server-sdk/golang.md |
| PHP     | references/sdk/server-sdk/php.md    |
| C       | references/sdk/server-sdk/c.md      |
| Lua     | references/sdk/server-sdk/lua.md    |
| Ruby    | references/sdk/server-sdk/ruby.md   |
| Erlang  | references/sdk/server-sdk/erlang.md |

### Data Integration Tools

| Tool              | Document Path                                          |
| ----------------- | ------------------------------------------------------ |
| LogBus2           | references/sdk/integration-tools/logbus2_guide.md           |
| DataX             | references/sdk/integration-tools/ta-datax-writer-guide.md   |
| Filebeat+Logstash | references/sdk/integration-tools/filebeat-logstash-guide.md |
| Restful API       | references/sdk/integration-tools/restful_api_notes.md       |

### Basic Knowledge

| Document                          | Document Path                                              |
| --------------------------------- | ---------------------------------------------------------- |
| Data Rules                        | references/sdk/te-data-rules/data-rules.md                      |
| User Identification Rules         | references/sdk/te-data-rules/user-identification-rules.md       |
| Preset Properties & System Fields | references/sdk/te-data-rules/preset-properties-system-fields.md |
| First Event Validation            | references/sdk/te-data-rules/first-event-validation.md          |
| Updatable Events                  | references/sdk/te-data-rules/updatable-events.md                |

---

# 9. Configuration Example Standards

When providing configuration examples, **must use placeholders**:

| Parameter                | Placeholder Example                      |
| ------------------------ | ---------------------------------------- |
| push_url / reporting URL | `YOUR_PUSH_URL` or `http://RECEIVER_URL` |
| app_id                   | `YOUR_APP_ID`                            |
| Kafka brokers            | `localhost:9092`                         |
| Username/Password        | `YOUR_USERNAME` / `YOUR_PASSWORD`        |

---

# 10. Supported Products List

| Type                   | Products                                                                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client SDK             | iOS, Android, JavaScript, Mini Program, macOS, OpenHarmony, C, Unity, Unreal, Cocos Creator, Cocos2d-x, Cocos2d-Lua, LayaAir, Egret, Corona, Flutter, React Native, uni-app |
| Server SDK             | Java, Python, PHP, Node.js, Go, C, Lua, Ruby, Erlang                                                                                                                        |
| Data Integration Tools | LogBus v2, DataX, Restful API, Filebeat+Logstash                                                                                                                            |
