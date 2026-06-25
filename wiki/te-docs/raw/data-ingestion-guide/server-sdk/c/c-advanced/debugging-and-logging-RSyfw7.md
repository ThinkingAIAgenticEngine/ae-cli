---
code: csharp_sdk_debug
name: "Debugging and Logging"
wikiToken: RSyfw7eyait7hdkCn8vcpYXHn9y
parentWikiToken: IauKwIL6UiVIadkz8FCcBHL4n4f
updateTime: 1774249298000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=csharp_sdk_debug
---

::: warning Notice
The SDK Debug mode is used only for access debugging. Do not apply it to the production environment.
:::
During the process of SDK Integration, you can perform real-time debugging by checking SDK logs in the IDE console or using the Debug function of TE.
## Logging
```csharp
TDLog.Enable = true;
```

<quote-container>
After enabling the log, you can observe the data tracking of SDK in IDE.
</quote-container>

## Debugging
You need to follow the following two steps to enable the Debug mode:
#### 2.1 Use DebugConsumer
The sample code for enabling the Debug mode on the client side is as follows:
```csharp
TDAnalytics te = new(new TDDebugConsumer("serverUrl", "appId", false, deviceId: "123456789"));
Dictionary<string, object> properties= new Dictionary<string, object>();
properties.Add("name", "test");

te.Track("accountId", "distinctId", "Payment", properties);
```

#### 2.2 Add Device
To avoid launching the Debug mode in the production environment, it is required that only specified device can enable Debug mode.  The Debug mode can only be enabled for devices whose ID has been configured in the "Debug data" sector on the "tracking management" page of the TE.
<image token="Fd92bTTNDoSmqmx0i4ccmuQonvd" width="1280" height="590" align="center"/>

<quote-container>
It can only be used for data verification at the integration stage, and should not be used in the online environment.
</quote-container>
