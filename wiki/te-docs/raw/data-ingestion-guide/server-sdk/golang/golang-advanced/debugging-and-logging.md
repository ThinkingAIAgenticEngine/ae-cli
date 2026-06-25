---
code: golang_sdk_debug
name: "Debugging and Logging"
wikiToken: Uym0wgAQViWLRSkAjzmc0ktqnud
parentWikiToken: G24JwGkPPiJTQFkvq0XcU3finKf
updateTime: 1774249257000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=golang_sdk_debug
---

::: warning Notice
The SDK Debug mode is used only for access debugging. Do not apply it to the production environment.
:::
During the process of SDK Integration, you can perform real-time debugging by checking SDK logs in the IDE console or using the Debug function of TE.
## Logging
```go
// enable log
thinkingdata.SetLogLevel(thinkingdata.TDLogLevelDebug)
```

<quote-container>
After enabling the log, you can observe the data tracking of SDK in IDE.
</quote-container>

## Debugging
You need to follow the following two steps to enable the Debug mode:
#### 2.1 Use DebugConsumer
The sample code for enabling the Debug mode on the client side is as follows:
```go
// DebugConsumer: Data is reported one by one. When a problem occurs, the user will be prompted with logs and exceptions;
// it is not recommended to use it in an online environment
// The third parameter identifies whether to enter the warehouse, true indicates the warehouse, and false indicates not to enter the warehouse
consumer, _ := thinkingdata.NewDebugConsumerWithDeviceId("url", "appid", false, "deviceId")
te := thinkingdata.New(consumer)
```

#### 2.2 Add Device
To avoid launching the Debug mode in the production environment, it is required that only specified device can enable Debug mode.  The Debug mode can only be enabled for devices whose ID has been configured in the "Debug data" sector on the "tracking management" page of the TE.
<image token="R2RNbeHAtoAWFjxSMRtc8y7WnTf" width="1280" height="590" align="center"/>

<quote-container>
It can only be used for data verification at the integration stage, and should not be used in the online environment.
</quote-container>
