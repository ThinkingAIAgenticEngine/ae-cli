---
code: erlang_sdk_debug
name: "Debugging and Logging"
wikiToken: In61wT9A5iEn0fky0DacwxDAnIf
parentWikiToken: PnlawuZLdi5AtakVJFEcXnohnGc
updateTime: 1774249338000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=erlang_sdk_debug
---

::: warning Notice
The SDK Debug mode is used only for access debugging. Do not apply it to the production environment.
:::
During the process of SDK Integration, you can perform real-time debugging by checking SDK logs in the IDE console or using the Debug function of TE.
## Debugging
You need to follow the following two steps to enable the Debug mode:
#### 2.1 Use DebugConsumer
The sample code for enabling the Debug mode on the client side is as follows:
```erlang
ServerUrl = "server_url",
AppID = "app_id",
IsWrite = true,
DeviceId = "123456789",

Consumer = td_debug_consumer:init_with_config(ServerUrl, AppID, IsWrite, DeviceId),
TE_SDK = td_analytics:init_with_consumer(Consumer),

AccountId0 = "account_id_Erlang_0",
td_analytics:track_instance(TE_SDK, AccountId0, "distinct_logbus", "ViewProduct", #{"#key_1" => "🚓🦽🦼🚲🚜🚜🦽", "key_2" => 2.2, "key_array" => ["🚌", "🏍", "😚😊"]}),
td_analytics:close_instance(TE_SDK).
```

#### 2.2 Add Device
To avoid launching the Debug mode in the production environment, it is required that only specified device can enable Debug mode.  The Debug mode can only be enabled for devices whose ID has been configured in the "Debug data" sector on the "tracking management" page of the TE.
<image token="S4GEbaN7fosQCKxozN9cvFnhnSg" width="1280" height="590" align="center"/>

<quote-container>
It can only be used for data verification at the integration stage, and should not be used in the online environment.
</quote-container>
