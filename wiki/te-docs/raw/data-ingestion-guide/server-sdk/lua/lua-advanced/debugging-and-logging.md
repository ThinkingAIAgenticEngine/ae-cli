---
code: lua_sdk_debug
name: "Debugging and Logging"
wikiToken: Qyo6wDzWRiFYckkNYdBci6qknBh
parentWikiToken: Kyrww4y2piF8Jok2abwc5ctondg
updateTime: 1774249318000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=lua_sdk_debug
---

::: warning Notice
The SDK Debug mode is used only for access debugging. Do not apply it to the production environment.
:::
During the process of SDK Integration, you can perform real-time debugging by checking SDK logs in the IDE console or using the Debug function of TE.
## Logging
```lua
local tdAnalytics = require "ThinkingDataSdk"
-- enable log
TDAnalytics.enableLog(true)
```

## Debugging
You need to follow the following two steps to enable the Debug mode:
#### 2.1 Use DebugConsumer
The sample code for enabling the Debug mode on the client side is as follows:
```lua
local tdAnalytics = require "ThinkingDataSdk"
local consumer = tdAnalytics.TDDebugConsumer("SERVER_URL", "APP_ID", false, "DeviceId")
local sdk = tdAnalytics(consumer)

local distinctId = "ABCDEFG123456789"
local accountId = "TE_10001"

local properties = {}
properties["#ip"] = "192.168.1.1"
properties["#device_id"] = "te_device_id"

sdk:track(accountId, distinctId, "payment", properties)
```

#### 2.2 Add Device
To avoid launching the Debug mode in the production environment, it is required that only specified device can enable Debug mode.  The Debug mode can only be enabled for devices whose ID has been configured in the "Debug data" sector on the "tracking management" page of the TE.
<image token="V5obbLgxmoCYdYx8cWtcmaJdnKg" width="1280" height="590" align="center"/>

<quote-container>
It can only be used for data verification at the integration stage, and should not be used in the online environment.
</quote-container>
