---
code: rn_sdk_debug
name: "Debugging and Logging"
wikiToken: R4uvwDh42iiwV8kS9mcc70Zbnhc
parentWikiToken: GKCGw8Y4IitlKEk4miNccirjnfc
updateTime: 1774249185000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=rn_sdk_debug
---

During the process of SDK integration, you can perform real-time debugging by checking SDK's logs in the IDE console or using the Debug feature of TE.
## Printing Log
You can set enableLog to true when the SDK is initialized, and turn on the SDK log switch. After turning on, the reported data will be printed on the IDE console.
```java
TDAnalytics.init({ 
    appId: "xxx", 
    serverUrl: "https://xxx", 
    enableLog: true 
}); 
```

<quote-container>
After opening the log, you can check data tracking of SDK by filtering logs related to ThinkingAnalytics in IDE.
</quote-container>

## **2. Debugging**
You need to follow the following two steps to enable the Debug mode:
1. Enable the debug mode at the client side
The sample code for enabling the Debug mode on the client side is as follows:
```dart
/*
Set the operation mode as the Debug mode
NORMAL mode: the data would be saved in caches and reported according to relevant cache policies under the NORMAL mode by default. It is recommended to use the mode in an online environment
Debug mode: report data item by item. If problems occur, the user would be notified with logs and anomalies. It is recommended to use the Debug mode in an online environment
DebugOnly mode: data would be verified without being stored; it is not recommended to use the DebugOnly mode in an online environment
 */
TDAnalytics.init({ 
    appId: "xxx", 
    serverUrl: "https://xxx", 
    mode:"debug"
}); 
```

2. Add Device
To avoid launching the Debug mode in the production environment, it is required that only specified device can enable Debug mode. The Debug mode can only be enabled for devices whose IDs have been configured in the "Debugger"sector on the "Tracking Management" page of TE when the client side has enabled the Debug mode.
<image token="STbkbWvtMoMYTExnVIycuhA5nAb" width="1280" height="590" align="center"/>

Device ID could be got by the following three means:
- #Device_id property in the event data of TE
- Client-side log: DeviceID would be printed as log after SDK is initialized
- Call API：[Device ID](https%3A%2F%2Fthinkingdata.feishu.cn%2Fwiki%2FKRaFwoiOZiprEEkEKN1cER8an6g%3FfromScene%3DspaceOverview)
<quote-container>
The Debug mode may undermine the data tracking quality and stability of the App. It could only be used for data verification at the integration stage, and should not be used in the online environment.
</quote-container>

