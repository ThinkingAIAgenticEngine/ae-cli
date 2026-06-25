---
code: cpp_server_sdk_debug
name: "Debugging and Logging"
wikiToken: FM9CwzLh0iE4RhksFvccx5GjnHg
parentWikiToken: YAilwkzevi8lHekvnQ9cqPnrnzh
updateTime: 1774249328000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=cpp_server_sdk_debug
---

::: warning Notice
The SDK Debug mode is used only for access debugging. Do not apply it to the production environment.
:::
During the process of SDK Integration, you can perform real-time debugging by checking SDK logs in the IDE console or using the Debug function of TE.
## Logging
```cpp
TDLog::enable = true;
```

## Debugging
You need to follow the following two steps to enable the Debug mode:
#### Use DebugConsumer
The sample code for enabling the Debug mode on the client side is as follows:
```cpp
string deviceId = "123456789";
TDDebugConsumer debugConsumer("appId", "serverUrl", "", deviceId);
TDAnalytics te(debugConsumer);

TDPropertiesNode event_properties;
event_properties.SetString("name", "value");

te.track("accountId", "distinctId", "eventName", event_properties);
```


<quote-container>
It can only be used for data verification at the integration stage, and should not be used in the online environment.
</quote-container>
