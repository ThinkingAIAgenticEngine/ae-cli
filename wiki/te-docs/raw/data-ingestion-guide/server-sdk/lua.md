---
code: lua_sdk_installation
name: "Lua"
wikiToken: CLL4wjPKtiEhkjkmbIqcrn3CnXd
parentWikiToken: IKVPwn4NfiIhijk5EcAcMf6pn7e
updateTime: 1774252018000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=lua_sdk_installation
---
::: tip
Before you begin, please read [<text color="purple" underline="true">Preparation before Data Ingestion</text>](https://thinkingdata.feishu.cn/wiki/OhD8we9iai6Xk5kM1QNc8ITRnQe).
 :::
**Latest version:** v2.0.1
**Update time:** 2026-01-08
**Resource download: **[**Source Code**](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Flua-sdk)
::: warning Notice 
Current documentation applies to v2.0.0 and later. For historical versions, see [Data Ingestion Guide - Lua (V1)](https%3A%2F%2Fdocs.thinkingdata.cn%2Fta-manual%2Fv4.1%2Fen%2Finstallation%2Finstallation_menu%2Fserver_sdk%2Flua_sdk_installation%2Flua_sdk_installation.html) 
:::
## **SDK**** Integration**
1.1 You can download the SDK [source code](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Flua-sdk) from GitHub and integrate it into your project. Just put `ThinkingDataSdk.lua` in the directory of your project.
Use the `luarocks` management tool to install third-party libraries:
```bash
luarocks install uuid 0.3-1
 
# To install the luasec library, specify the OPENSSL_DIR path
luarocks install luasec OPENSSL_DIR=[PATH]

luarocks install lua-cjson
```

1.2 Logbus Integration
We recommend using SDK+LogBus to track and report data on server. You can refer to the following documents to complete the installation of Logbus:[ LogBus User Guide](https://thinkingdata.feishu.cn/wiki/SlE6wOEK3isQvukzEbnc5V0inNa)
## **Initialization**
The following is the sample code for SDK initialization:
```lua
local tdAnalytics = require "ThinkingDataSdk"

local consumer = tdAnalytics.TDLogConsumer("LOG_DIRECTORY", tdAnalytics.LOG_RULE.HOUR, 200, 500)
local sdk = tdAnalytics(consumer)
```

`LOG_DIRECTORY` is the local folder path.
## **Common Features**
In order to ensure that the distinct ID and account ID can be bound smoothly, if your game uses the distinct ID and account ID, we strongly recommend that you upload these two IDs at the same time, otherwise the account will not match, causing users to double count. For specific ID binding rules, please refer to the chapter on [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc).
### 3.1 **Sending Events**
 You can call `track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```lua
local distinctId = "ABCDEFG123456789"
local accountId = "TE_10001"
local properties = {}
properties["#time"] = os.date("%Y-%m-%d %H:%M:%S")
properties["#ip"] = "192.168.1.1"
properties["Product_Name"] = "card"
properties["Price"] = 30
properties["OrderId"] = "abc_123"

sdk:track(accountId, distinctId, "payment", properties)
```

- Key is the name of the property and refers to the string type. It must start with a character, and contain numbers, characters (insensitive to case, and upper cases would be transformed into lower cases by TE) and underscores "_", with a maximum length of 50 characters. 
- Value, the value of the property, supports string, numbers, Boolean, time, object, array object, and array
<quote-container>
**The requirements for event properties and user properties are the same as that for super properties**
</quote-container>

### 3.2** User Properties**
You can set general user properties by calling `userSet` API. The original properties would be replaced by the properties uploaded via this API. If no user properties are set before, user properties will be newly created. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here: 
```lua
local distinctId = "ABCDEFG123456789"
local accountId = "TE_10001"

local userSetProperties = {}
userSetProperties["user_name"] = "ABC"
sdk:userSet(accountId, distinctId, userSetProperties)
userSetProperties = {}
userSetProperties["user_name"] = "abc"

sdk:userSet(accountId, distinctId, userSetProperties)
```

### 3.3 Reported data
When using `TDLogConsumer`, the collected events are added to the cache array. Data is written to disk only when the number of array elements exceeds the set capacity. You need to set the value of `batchNum` when you initialize `TDLogConsumer`.
You can call the `flush()` api to report data to the TE  immediately under certain service scenarios. However, frequent calls to `flush()` can result in degraded service performance.
```lua
sdk:flush()
```

### 3.4 Close  SDK
```lua
sdk:close()
```

<quote-container>
Close and exit the SDK. Please call this api before closing the server to avoid data loss in the cache
</quote-container>

## **Best Practice**
The following sample code covers all the above-mentioned operations. It is recommended that the codes be used in the following steps:
```lua
local tdAnalytics = require "ThinkingDataSdk"

local consumer = tdAnalytics.TDLogConsumer("LOG_DIRECTORY", tdAnalytics.LOG_RULE.HOUR, 200, 500)
local sdk = tdAnalytics(consumer)

local distinctId = "ABCDEFG123456789"
local accountId = "TE_10001"

local properties = {}
properties["#time"] = os.date("%Y-%m-%d %H:%M:%S")
properties["Product_Name"] = "card"
properties["Price"] = 30
properties["OrderId"] = "abc_123"
sdk:track(accountId, distinctId, "payment", properties)

local userSetProperties = {}
userSetProperties["user_name"] = "ABC"
sdk:userSet(accountId, distinctId, userSetProperties)

userSetProperties = {}
userSetProperties["user_name"] = "abc"
sdk:userSet(accountId, distinctId, userSetProperties)
```
