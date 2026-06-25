---
code: uniapp_sdk_debug
name: "Debugging and Logging"
wikiToken: CnOtw65kJiO0q8k3Y6qcCVF8nwb
parentWikiToken: DM7kwtiBMiCpWCkk7icczidxn7c
updateTime: 1774251990000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=uniapp_sdk_debug
---

During the process of SDK access, you can perform real-time debugging by checking SDK's logs in the IDE console or using the Debug function of TE.
## **1. Logging**
```javascript
var config = {
    appId: "xxx",
    serverUrl: "xxx",
    enableLog:true
};
```


After this function is enabled, the reported data will be printed on the browser console.


## **2. Debugging**
You need to follow the following two steps to enable the Debug mode:
1. Enable the debug mode at the client side
The sample code for enabling the Debug mode on the client side is as follows:
```java
/*
Set the operation mode as the Debug mode
NORMAL mode: the data would be saved in caches and reported according to relevant cache policies under the NORMAL mode by default. It is recommended to use the mode in an online environment
Debug mode: report data item by item. If problems occur, the user would be notified with logs and anomalies. It is recommended to use the Debug mode in an online environment
DebugOnly mode: data would be verified without being stored; it is not recommended to use the DebugOnly mode in an online environment
 */
var config = {
  appid: "YOUR_APPID",
  server_url: "YOUR_SERVER_URL",
  debugMode: "debug"
};
TDAnalytics.init(config);
```

2. Add Device
To avoid launching the Debug mode in the production environment, it is required that only specified device can enable Debug mode. The Debug mode can only be enabled for devices whose IDs have been configured in the "Debug data"sector on the "tracking management" page of the TE when the client side has enabled the Debug mode.


Device ID could be obtained by the following three means:
- #Device_id property in the event data of the TE platform
- Client-side log: DeviceID would be printed after SDK is initialized
Call [obtain device ID](https://thinkingdata.feishu.cn/wiki/DM7kwtiBMiCpWCkk7icczidxn7c) through the instance interface


The Debug mode may undermine the data tracking quality and stability of the App. It could only be used for data verification at the integration stage, and should not be used in the online environment.
