---
code: macos_sdk_debug
name: "Debugging and Logging"
wikiToken: CsZVwFdKmiJnD6kioCRcQm7knsg
parentWikiToken: VXDLwciQyixZ39kwAI5cDeRfndd
updateTime: 1774252002000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=macos_sdk_debug
---

During the process of SDK integration, you can perform real-time debugging by checking SDK's logs in the IDE console or using the Debug feature of TE.
## Printing Log
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
[TDAnalytics enableLog:YES];
```

:::
::: el-tab-pane label=Swift
```swift
TDAnalytics.enableLog(true)
```

:::
::::
<quote-container>
After opening the log, you can check data tracking of SDK by filtering logs related to ThinkingData in IDE.
</quote-container>


## **2. Debugging**
You need to follow the following two steps to enable the Debug mode:
1. Enable the debug mode at the client
The sample code for enabling the Debug mode on the client is as follows:
```objectivec
// get TDConfig instance
TDConfig *config = [[TDConfig alloc] init];
config.appid = appid;
config.serverURL = url;
/*
Set the operation mode as the Debug mode
NORMAL mode: the data would be saved in caches and reported according to relevant cache policies under the NORMAL mode by default. It is recommended to use the mode in an online environment
Debug mode: report data item by item. If problems occur, the user would be notified with logs and anomalies. It is recommended to use the Debug mode in an online environment
DebugOnly mode: data would be verified without being stored; it is not recommended to use the DebugOnly mode in an online environment
 */
config.mode = TDModeDebug;
// initialize SDK
[TDAnalytics startAnalyticsWithConfig:config];
```

2. Add Device
To avoid launching the Debug mode in the production environment, it is required that only specified device can enable Debug mode. The Debug mode can only be enabled for devices whose IDs have been configured in the "Debugger"sector on the "Tracking Management" page of TE when the client has enabled the Debug mode.
<image token="IMl9bv82HohhiWxPjNCcQFevngh" width="1280" height="590" align="center"/>


Device ID could be got by the following three means:
- #Device_id property in the event data of TE
- Client-side log: DeviceID would be printed as log after SDK is initialized
- Call API：[Device ID](https://thinkingdata.feishu.cn/wiki/VXDLwciQyixZ39kwAI5cDeRfndd)
<quote-container>
The Debug mode may undermine the data tracking quality and stability of the APP. It could only be used for data verification at the integration stage, and should not be used in the online environment.
</quote-container>
