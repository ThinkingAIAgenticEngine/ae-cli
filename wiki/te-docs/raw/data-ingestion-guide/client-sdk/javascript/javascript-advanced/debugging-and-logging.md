---
code: javascript_sdk_debug
name: "Debugging and Logging"
wikiToken: BjISw0TEGiY0iSkGlnhcRhCrnyc
parentWikiToken: BwkywAk0aiKI9Skyhk8cKnlKnde
updateTime: 1774251969000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=javascript_sdk_debug
---

During the process of SDK integration, you can perform real-time debugging by checking SDK's logs in the IDE console or using the Debug feature of TE.
## Printing Log
You can set showLog to true when the SDK is initialized,after opening the log,you can check SDK's logs on the browser console.
```javascript
var config = {
    appId: "xxx",
    serverUrl: "xxx",
    showLog:true
};
```

## **2. Debugging**
You need to follow the following two steps to enable the Debug mode:
1. Enable the debug mode at the client
The sample code for enabling the Debug Mode on the client is as follows:
```javascript
var config = {
    appId: "xxx",
    serverUrl: "xxx",
    /*
    NORMAL mode: the data would be saved in caches and reported according to relevant cache policies under the NORMAL mode by default. It is recommended to use the mode in an online environment
    Debug mode: report data item by item. If problems occur, the user would be notified with logs and anomalies. It is recommended to use the Debug mode in an online environment
    DebugOnly mode: data would be verified without being stored; it is not recommended to use the DebugOnly mode in an online environment
     */
    mode:"debug"
};
```

2. Add Device
To avoid launching the Debug mode in the production environment, it is required that only specified device can enable Debug Mode. The Debug Mode can only be enabled for devices whose IDs have been configured in the "Debugger"sector on the "Tracking Management" page of TE when the client side has enabled the Debug mode.
<image token="BU3ZbIk6AoadzGxfGdIcogdCnud" width="1280" height="590" align="center"/>

Device ID could be obtained by the following three means:
- #device_id:property in the event data of TE
- Client-side log: DeviceID would be printed as log after SDK is initialized
- Call API：[Device ID](https://thinkingdata.feishu.cn/wiki/BwkywAk0aiKI9Skyhk8cKnlKnde)
<quote-container>
The Debug Mode may undermine the data tracking quality and stability of the Application. It could only be used for data verification at the integration stage, and should not be used in the production environment.
</quote-container>
