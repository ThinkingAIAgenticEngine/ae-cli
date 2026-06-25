---
code: unreal_sdk_debug
name: "Debugging and Logging"
wikiToken: WVdPw5n3viZhGSkm7kZcgHnEnOf
parentWikiToken: T3M0w3OWGi4LYjk1XYQcUCbCnff
updateTime: 1774251976000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=unreal_sdk_debug
---

During the process of SDK integration, you can perform real-time debugging by checking SDK's logs in the IDE console or using the Debug feature of TE.
## Printing Log
Check Enable Log in the TDAnalytics plugin
<quote-container>
After opening the log, you can check data tracking of SDK by filtering logs related to TDAnalytics in IDE.
</quote-container>

## **2. Debugging**
You need to follow the following two steps to enable the Debug mode:
1. Enable the debug mode at the client
Set the SDK MODE to Debug in the TDAnalytics plugin
2. Add Device
To avoid launching the Debug mode in the production environment, it is required that only specified device can enable Debug mode. The Debug mode can only be enabled for devices whose IDs have been configured in the "Debugger"sector on the "Tracking Management" page of TE when the client side has enabled the Debug mode.
<image token="DusOb9GysorLYfxMR4gcKOVBnfc" width="1280" height="590" align="center"/>

Device ID could be obtained by the following three means:
- #Device_id property in the event data of TE
- Client-side log: DeviceID would be printed as log after SDK is initialized
- Call API：[Device ID](https://thinkingdata.feishu.cn/wiki/T3M0w3OWGi4LYjk1XYQcUCbCnff)
<quote-container>
The Debug mode may undermine the data tracking quality and stability of the App. It could only be used for data verification at the integration stage, and should not be used in the online environment.
</quote-container>
