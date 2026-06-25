---
code: corona_sdk_debug
name: "Debugging and Logging"
wikiToken: KD2swm89oihx9jkaOtWc3tbHnLc
parentWikiToken: VgpBwhQ5aiThtUklu2Gc60vnngg
updateTime: 1774251986000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=corona_sdk_debug
---

During the process of SDK integration, you can perform real-time debugging by checking SDK's logs in the IDE console or using the Debug feature of TE.
## Printing Log
```lua
-- enable printing logs
local params = {
    appId = "YOUR_APP_ID",
    serverUrl = "YOUR_SERVER_URL",
    enableLog = true, -- true:enable printing logs, false:disable printing logs
}
-- initialize SDK
TDAnalytics.init( params )
```

<quote-container>
After opening the log, you can check data tracking of SDK by filtering logs related to ThinkingData in IDE.
</quote-container>

## **2. Debugging**
You need to follow the following two steps to enable the Debug mode:
2. Enable the debug mode at the client side
The sample code for enabling the Debug mode on the client side is as follows:
```lua
--[[
 Set the operation mode as the Debug mode
 normal mode: the data would be saved in caches and reported according to relevant cache policies under the NORMAL mode by default. It is recommended to use the mode in an online environment
 debug mode: report data item by item. If problems occur, the user would be notified with logs and anomalies. It is recommended to use the Debug mode in an online environment
 debugOnly mode: data would be verified without being stored; it is not recommended to use the DebugOnly mode in an online environment
]]--
local params = {
    appId = "YOUR_APP_ID",
    serverUrl = "YOUR_SERVER_URL",
    debugMode = "debug",  -- normal, debug, debugOnly
}
-- initialize SDK
TDAnalytics.init( params )
```

3. Add Device
To avoid launching the Debug mode in the production environment, it is required that only specified device can enable Debug mode. The Debug mode can only be enabled for devices whose IDs have been configured in the "Debugger" sector on the "Tracking Management" page of TE when the client side has enabled the Debug mode.
<image token="AjpSb0APLolIhhxsLmgcx1ZunRb" width="2782" height="1284" align="left"/>


Device ID could be obtained by the following three means:
- #Device_id property in the event data of TE
- Client-side log: DeviceID would be printed as log after SDK is initialized
- Call API：[Device ID](https://thinkingdata.feishu.cn/wiki/VgpBwhQ5aiThtUklu2Gc60vnngg)
<quote-container>
The Debug mode may undermine the data tracking quality and stability of the App. It could only be used for data verification at the integration stage, and should not be used in the online environment.
</quote-container>
