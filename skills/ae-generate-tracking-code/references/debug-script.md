# Mode F — Debug / Validation Script

> **Terminology**: 校验脚本 = validation/debug script | 设备绑定 = device binding | Debug 模式 = debug mode | TDDebugConsumer = debug mode consumer (validates data format, does NOT persist to production) | 实时调试 = real-time debugging | 代表业务事件 = representative business events | SDK 日志打印 = SDK log printing

## Deliverable
`te-debug.<ext>` single file; used to quickly verify SDK configuration is correct.

---

## Debug Mode Verification

When using debug mode, you must add the debug device ID in AE Admin before data will appear on the AE **Debug Data** page.

### Verification Steps

| Step | Action |
|---|---|
| 1 | Add debug device ID in AE Admin: Tracking Management → Debug Data → Add Device |
| 2 | Run debug script to send test events |
| 3 | Open AE Debug page: `https://<host>/#/data/debug` |
| 4 | Filter by `distinct_id` or `device_id` to view uploaded data |

### Common Notes for Client and Server SDKs

- Both use **TDDebugConsumer** (or the platform's equivalent debug mode API)
- Both require adding device ID in AE Admin to view data on the Debug page
- On validation failure, the SDK prints error logs or throws exceptions (behavior varies by language)

---

## Debug Mode API by Platform

### Client SDK

| SDK | Debug Mode API | Reference Doc |
|---|---|---|
| Unity SDK | `TDConfig config = new TDConfig(appId, serverUrl); config.mode = TDMode.DEBUG; TDAnalytics.Init(config);` | `data-ingestion-guide/client-sdk/game-engine/unity/unity-advanced/debugging-and-logging.md` |
| Android SDK | `TDConfig config = new TDConfig(this, serverUrl, appId); config.setMode(TDConfig.Mode.DEBUG); TDAnalytics.init(this, config);` | `data-ingestion-guide/client-sdk/android/android-advanced/debugging-and-logging.md` |
| iOS SDK | `TDConfig *config = [[TDConfig alloc] initWithAppId:appId serverUrl:serverUrl]; config.mode = TDModeDebug; [TDAnalytics startWithConfig:config];` | `data-ingestion-guide/client-sdk/ios/ios-advanced/debugging-and-logging.md` |
| JavaScript SDK | `ta.init({ appId: appId, server_url: serverUrl, debug: true });` | `data-ingestion-guide/client-sdk/javascript/javascript-advanced/debugging-and-logging.md` |
| Mini Program SDK | `ta.init({ appId: appId, server_url: serverUrl, debug: true });` | `客户端-sdk/小程序小游戏/进阶指南/实时调试.md` |
| CocosCreator | See doc | `data-ingestion-guide/client-sdk/game-engine/cocoscreator/cocoscreator-advance/debugging-and-logging.md` |
| Cocos2d-x | See doc | `data-ingestion-guide/client-sdk/game-engine/cocos2d-x/cocos2d-x-advanced/debugging-and-logging.md` |
| Unreal SDK | See doc | `data-ingestion-guide/client-sdk/game-engine/unreal/unreal-advanced/debugging-and-logging.md` |
| Flutter SDK | See doc | `data-ingestion-guide/client-sdk/cross-platform/flutter/flutter-advanced/debugging-and-logging.md` |
| React Native | See doc | `data-ingestion-guide/client-sdk/cross-platform/react-native/reactnative-advanced/debugging-and-logging.md` |

### Server SDK

| Language | DebugConsumer API | Reference Doc |
|---|---|---|
| Java | `new TDDebugConsumer(serverUrl, appId, deviceId)` | `data-ingestion-guide/server-sdk/java/java-advanced/debugging-and-logging.md` |
| Python | `TDDebugConsumer(serverUrl, appId, device_id="...")` | `data-ingestion-guide/server-sdk/python/python-advanced/debugging-and-logging.md` |
| Go | `NewDebugConsumerWithDeviceId(serverUrl, appId, false, deviceId)` | `data-ingestion-guide/server-sdk/golang/golang-advanced/debugging-and-logging.md` |
| Node.js | `ThinkingData.initWithDebugMode(appId, serverUrl, { deviceId: "..." })` | `data-ingestion-guide/server-sdk/nodejs/nodejs-advanced/debugging-and-logging.md` |
| PHP | `new TDDebugConsumer(serverUrl, appId, deviceId)` | `data-ingestion-guide/server-sdk/php/php-advanced/debugging-and-logging.md` |
| Ruby | `TDDebugConsumer.new(serverUrl, appId, deviceId)` | `data-ingestion-guide/server-sdk/ruby/ruby-advanced/debugging-and-logging.md` |
| Erlang | `tddebug_consumer:new(ServerUrl, AppId, DeviceId)` | `data-ingestion-guide/server-sdk/erlang/erlang-advanced/debugging-and-logging.md` |
| Lua | `TDDebugConsumer.new(serverUrl, appId, deviceId)` | `data-ingestion-guide/server-sdk/lua/lua-advanced/debugging-and-logging.md` |
| C | `td_debug_consumer_new(serverUrl, appId, deviceId)` | `data-ingestion-guide/server-sdk/c/c-advanced/debugging-and-logging.md` |

---

## Skill Generation Checkpoints

When generating a debug script, the skill must:

1. **First read the corresponding SDK's "Real-time Debug" doc** (see reference doc paths below) to confirm the SDK's debug mode API and usage (the table above is an index reference only; actual usage may differ)
2. Use the corresponding platform's **TDDebugConsumer** or debug mode API
3. Set `deviceId` (e.g. `claude-test-device`) for AE Admin device registration
4. Read `SERVER_URL` and `appId` from plan (NOT web host)
5. Pick 3 representative business events from plan (if object array properties exist, construct them fully)
6. Recommend enabling SDK log printing (for easier troubleshooting)
7. File name must match class name (e.g. Unity: `TEDebugScript.cs`)

### Post-delivery Prompt

**Platform filtering notes**:
- xlsx "Platform" column values map to `platform` field:
  - `客户端` / `client` → `platform: "client"`
  - `服务端` / `server` → `platform: "server"`
  - `客户端,服务端` / `client,server` → `platform: "both"`
- Client debug script: only include events where `platform === "client"` or `platform === "both"`
- Server debug script: only include events where `platform === "server"` or `platform === "both"`
- If xlsx has no platform column: include all events (backward compatible)

```
Verification steps:
1. Add debug device ID in AE Admin: Tracking Management → Debug Data → Add Device (enter deviceId)
2. Run debug script
3. Open AE Debug page: https://<host>/#/data/debug
4. Filter by distinct_id or device_id to view uploaded data
5. Check event property structure correctness (especially object array properties)
```

### Reference Doc Paths

All SDK debug/logging docs are located at:
- `~/.ae-cli/wiki/te-docs/raw/data-ingestion-guide/client-sdk/<sdk>/<sdk>-advanced/debugging-and-logging.md`
- `~/.ae-cli/wiki/te-docs/raw/data-ingestion-guide/server-sdk/<language>/<language>-advanced/debugging-and-logging.md`

For zh-CN only SDKs (Mini Program, LayaAir, etc.), refer to sdk-index.md for exact paths.
