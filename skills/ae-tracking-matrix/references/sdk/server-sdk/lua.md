---
code: lua_sdk_installation
name: "Lua"
wikiToken: Bh3HwNcaUingcEkSTX6cwjNOnhu
parentWikiToken: O3YxwgHGiiEnvYkHCcIcX51inkf
updateTime: 1767869995000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=lua_sdk_installation
---

# Lua

This guide will introduce how to use Lua SDK to integrate into your project.

**Latest Version**: v2.0.1

**Update Date**: 2026-01-08

**Download**: Source Code

::: warning Note

This document applies to v2.0.0 and later versions. For historical versions, please refer to Lua SDK Integration Guide (V1).

:::

### 1. SDK Integration

1. Download source code and put the downloaded ThinkingDataSdk.lua file in your project directory
2. Use luarocks management tool to install third-party libraries:

```
 luarocks install uuid 0.3-1

 # Installing luasec library requires specifying OPENSSL_DIR path
 luarocks install luasec OPENSSL_DIR=[PATH]

 luarocks install lua-cjson
```

3. Install LogBus
   We recommend using SDK + LogBus for server-side data collection and reporting. You can refer to the following documentation for LogBus installation: LogBus User Guide.

### 2. Initialization

Here is sample code for SDK initialization:

```
local tdAnalytics = require "ThinkingDataSdk"

local consumer = tdAnalytics.TDLogConsumer("LOG_DIRECTORY", tdAnalytics.LOG_RULE.HOUR, 200, 500)
local sdk = tdAnalytics(consumer)
```

`LOG_DIRECTORY` is the local folder address for writing. You just need to set LogBus's monitoring folder address to this address to use LogBus for data monitoring and uploading.

### 3. Common Features

To ensure successful binding of visitor ID and account ID, if your game uses both visitor ID and account ID, we strongly recommend uploading both IDs. Otherwise, account matching issues may occur, leading to duplicate user counts. For specific ID binding rules, please refer to the User Identification Rules chapter.

#### 3.1 Track Events

You can call `track` to upload events. We recommend setting event properties and sending conditions based on your previously documented requirements. Here is sample code for tracking events:

```
-- Set visitor ID "ABCDEFG123456789"
local distinctId = "ABCDEFG123456789"
-- Set account ID "TE_10001"
local accountId = "TE_10001"
-- Set event properties
local properties = {}
-- Set event occurrence time, if not set, defaults to current time
properties["#time"] = os.date("%Y-%m-%d %H:%M:%S")

-- Set user IP address, TE system will parse user geographic location based on IP, if not set, default not reported
properties["#ip"] = "192.168.1.1"

properties["Product_Name"] = "card"
properties["Price"] = 30
properties["OrderId"] = "abc_123"
-- Upload event, including visitor ID and account ID, please note the order of account ID and visitor ID
sdk:track(accountId, distinctId, "payment", properties)
```

- Event name must be a string type, starting with a letter, containing numbers, letters, and underscores "\_", with maximum length of 50 characters.
- Key is the property name, must be a string type, starting with a letter, containing numbers, letters, and underscores "\_", with maximum length of 50 characters. Case-insensitive, TE will convert to lowercase.
- Value is the property value, supporting strings, numbers, booleans, dates, objects, object arrays, and arrays.

**User property requirements are consistent with event property requirements**

#### 3.2 Set User Properties

For general user properties, you can call `userSet` to set them. Properties uploaded via this interface will overwrite existing property values. If the user property does not exist previously, a new user property will be created with the same type as the uploaded property. Here is an example of setting a username:

```
-- Set visitor ID "ABCDEFG123456789"
local distinctId = "ABCDEFG123456789"
-- Set account ID "TE_10001"
local accountId = "TE_10001"

local userSetProperties = {}
userSetProperties["user_name"] = "ABC"
-- Upload user property
sdk:userSet(accountId, distinctId, userSetProperties)
userSetProperties = {}
userSetProperties["user_name"] = "abc"
-- Upload user property again, at this point "user_name" value is overwritten to "abc"
sdk:userSet(accountId, distinctId, userSetProperties)
```

#### 3.3 Data Reporting

When using TDLogConsumer, collected events are added to a cache array. Data is written to disk only when the array element count exceeds the set capacity. You need to explicitly pass the batchNum value when initializing TDLogConsumer.

In certain business scenarios, if you want data to be reported to the TE server immediately, you can call the `flush()` interface. Note that frequent calls to `flush()` will cause service performance degradation.

```
sdk:flush()
```

#### 3.4 Close SDK

```
sdk:close()
```

Close and exit the SDK. Please call this interface before shutting down the server to avoid data loss in the cache.

### 4. Best Practices

The following sample code includes all the above operations. We recommend using it as follows:

```
local tdAnalytics = require "ThinkingDataSdk"

local consumer = tdAnalytics.TDLogConsumer("LOG_DIRECTORY", tdAnalytics.LOG_RULE.HOUR, 200, 500)
local sdk = tdAnalytics(consumer)

-- Set visitor ID "ABCDEFG123456789"
local distinctId = "ABCDEFG123456789"
-- Set account ID "TE_10001"
local accountId = "TE_10001"
-- Set event properties
local properties = {}
-- Set event occurrence time, if not set, defaults to current time
properties["#time"] = os.date("%Y-%m-%d %H:%M:%S")

-- Set user IP address, TE system will parse user geographic location based on IP, if not set, default not reported
properties["#ip"] = "192.168.1.1"

properties["Product_Name"] = "card"
properties["Price"] = 30
properties["OrderId"] = "abc_123"
-- Upload event, including visitor ID and account ID, please note the order of account ID and visitor ID
sdk:track(accountId, distinctId, "payment", properties)

local userSetProperties = {}
userSetProperties["user_name"] = "ABC"
-- Upload user property
sdk:userSet(accountId, distinctId, userSetProperties)
userSetProperties = {}
userSetProperties["user_name"] = "abc"
-- Upload user property again, at this point "user_name" value is overwritten to "abc"
sdk:userSet(accountId, distinctId, userSetProperties)
```

---

# Advanced Guide

### 1. Track Events

After SDK initialization, you can perform data tracking to collect user behavior information. Generally, regular events can meet business scenario requirements. You can also use first-time events, updateable events, etc. based on your actual business scenarios.

#### 1.1 Regular Events

You can call `track` to upload events. We recommend setting event properties and sending conditions based on your previously documented requirements. Here is an example of a user purchasing a product:

```
-- Set event properties
local properties = {}
-- Set event occurrence time, if not set, defaults to current time
properties["#time"] = os.date("%Y-%m-%d %H:%M:%S")

-- Set user IP address, TE system will parse user geographic location based on IP, if not set, default not reported
properties["#ip"] = "192.168.1.1"

properties["Product_Name"] = "card"
properties["Price"] = 30
properties["OrderId"] = "abc_123"
-- Upload event, including visitor ID and account ID, please note the order of account ID and visitor ID
sdk:track("accountId", "distinctId", "payment", properties)
```

#### 1.2 First-Time Events

First-time events are events that are recorded only once for a specific device or other dimensional ID. For example, in some scenarios, you may want to record an activation event on a specific device, which can be reported using a first-time event.

```
local properties = {}
-- Need to set first_check_id value
sdk:trackFirst("accountId", "distinctId", "device_activation", "first_check_id", properties)
```

Note: Since first-time verification is completed on the server side, first-time events will be delayed by 1 hour before entering the database.

#### 1.3 Updateable Events

You can implement the need to modify event data in specific scenarios through updateable events. Updateable events need to specify an ID that identifies the event and pass it when creating the updateable event object. TE backend will determine the data to be updated based on the event name and event ID.

```
-- "price" is 80, "count" is 3
local properties = {}
properties["price"] = 80
properties["count"] = 3
sdk:trackUpdate("accountId", "distinctId", "eventName", "eventId", properties)

-- The "price" is still 80, The "count" has changed to 5
local newProperties = {}
newProperties["count"] = 5
sdk:trackUpdate("accountId", "distinctId", "eventName", "eventId", newProperties)
```

#### 1.4 Overwriteable Events

Overwriteable events are similar to updateable events, except that overwriteable events will completely overwrite historical data with the latest data. Effectively, this is equivalent to deleting the previous data and inserting the latest data. TE backend will determine the data to be updated based on the event name and event ID.

```
-- "price" is 80, "count" is 3
local properties = {}
properties["price"] = 80
properties["count"] = 3
sdk:trackOverwrite("accountId", "distinctId", "eventName", "eventId", properties)

-- The "count" has changed to 5, The "price" will be deleted
local newProperties = {}
newProperties["count"] = 5
sdk:trackOverwrite("accountId", "distinctId", "eventName", "eventId", newProperties)
```

### 2. User Properties

TE platform supports the following user property setting APIs: `userSet`, `userSetOnce`, `userAdd`, `userUnset`, `userDel`, `userAppend`, `userUniqAppend`.

#### 2.1 userSet

For general user properties, you can call `userSet` to set them. Properties uploaded via this interface will overwrite existing property values. If the user property does not exist previously, a new user property will be created with the same type as the uploaded property. Here is an example of setting a username:

```
local userSetProperties = {}
userSetProperties["user_name"] = "ABC"
userSetProperties["#time"] = os.date("%Y-%m-%d %H:%M:%S")
-- Upload user property
sdk:userSet("accountId", "distinctId", userSetProperties)

userSetProperties = {}
userSetProperties["user_name"] = "abc"
userSetProperties["#time"] = os.date("%Y-%m-%d %H:%M:%S")
-- Upload user property again, at this point "user_name" value is overwritten to "abc"
sdk:userSet("accountId", "distinctId", userSetProperties)
```

#### 2.2 userSetOnce

If you want to set a user property only once, you can call `userSetOnce`. When the property already has a value, this information will be ignored. Here is another example of setting a username:

```
local userSetOnceProperties = {}
userSetOnceProperties["user_name"] = "ABC"
userSetOnceProperties["#time"] = os.date("%Y-%m-%d %H:%M:%S")
-- Upload user property, create new "user_name", value is "ABC"
sdk:userSetOnce("accountId", "distinctId", userSetOnceProperties)

userSetOnceProperties = {}
userSetOnceProperties["user_name"] = "abc"
userSetOnceProperties["user_age"] = 18
userSetOnceProperties["#time"] = os.date("%Y-%m-%d %H:%M:%S")
-- Upload user property again, at this point "user_name" value is not overwritten, still "ABC", "user_age" value is 18
sdk:userSetOnce("accountId", "distinctId", userSetOnceProperties)
```

#### 2.3 userAdd

When you want to upload numeric properties, you can call `userAdd` to accumulate the property. If the property has not been set, it will be assigned 0 before calculation. Negative values can be passed, equivalent to subtraction. Here is an example of accumulating total payment amount:

```
local userAddProperties = {}
userAddProperties["total_revenue"] = 30
userAddProperties["#time"] = os.date("%Y-%m-%d %H:%M:%S")
-- Upload user property, at this point "total_revenue" value is 30
sdk:userAdd("accountId", "distinctId", userAddProperties)

userAddProperties = {}
userAddProperties["total_revenue"] = 60
userAddProperties["#time"] = os.date("%Y-%m-%d %H:%M:%S")
-- Upload user property again, at this point "total_revenue" value accumulates to 90
sdk:userAdd("accountId", "distinctId", userAddProperties)
```

The property key must be a string, and Value only allows numeric values.

#### 2.4 userAppend

You can call `userAppend` to append array-type user properties.

```
local equips = {}
equips[1] = "weapon"
equips[2] = "hat"
local userAppendProperties = {}
userAppendProperties["equips"] = equips
userAppendProperties["#time"] = os.date("%Y-%m-%d %H:%M:%S")
-- Upload user property, at this point "equips" value is ["weapon", "hat"]
sdk:userAppend("accountId", "distinctId", userAppendProperties)

equips = {}
equips[1] = "clothes"
userAppendProperties = {}
userAppendProperties["equips"] = equips
userAppendProperties["#time"] = os.date("%Y-%m-%d %H:%M:%S")
-- Upload user property again, at this point "equips" value adds one more "clothes": ["weapon", "hat", "clothes"]
sdk:userAppend("accountId", "distinctId", userAppendProperties)
```

#### 2.5 userUniqAppend

You can call `userUniqAppend` to append array-type user properties. The `userUniqAppend` interface will deduplicate appended user properties, while `userAppend` interface does not deduplicate, allowing duplicate user properties.

```
local profiles_append = {}
-- After execution, user property append is ["test_append"]
profiles_append["append"] = { "test_append" }
sdk:userAppend("accountId", "distinctId", profiles_append)

local profiles_uniq_append = {}
-- After execution, user property append is ["test_append", "test_append1"]
profiles_uniq_append["append"] = {"test_append", "test_append1"}
sdk:userUniqueAppend("accountId", "distinctId", profiles_uniq_append)
```

#### 2.6 userUnset

When you want to clear user property values, you can call `userUnset` to clear specified properties. If the property has not been created in the cluster, `userUnset` will not create the property.

```
local userUnsetProperties = {}
userUnsetProperties[1] = "total_revenue"
userUnsetProperties[2] = "equips"
-- Upload user property, at this point "total_revenue" and "equips" properties will be reset
sdk:userUnset("accountId", "distinctId", userUnsetProperties)
```

userUnset: The parameter is the Key value of the property to be cleared.

#### 2.7 userDel

If you want to delete a user, you can call `userDel` to delete the user. You will no longer be able to query the user's properties, but events generated by the user can still be queried. This operation may have irreversible consequences, please use with caution.

```
sdk:userDel("accountId", "distinctId")
```

### 3. Other Features

#### 3.1 TDBatchConsumer

::: warning Note

When data volume is large or network is abnormal, there is a risk of data loss. Not recommended for production environments.

:::

Batch real-time data transmission to TE server without requiring transmission tools.

```
local tdAnalytics = require "ThinkingDataSdk"
local consumer = tdAnalytics.TDBatchConsumer("SERVER_URL", "APP_ID")
local sdk = tdAnalytics(consumer)
```

Parameter Description:

- `APP_ID`: Your project's APP ID, can be obtained from TE backend project management page
- `SERVER_URL`: Data upload URL
- If you are connecting to cloud service, enter: https://global-receiver-ta.thinkingdata.cn
- If you use private deployment version, please bind domain for data collection address and configure HTTPS certificate: https://YOUR_DATA_COLLECTION_DOMAIN

---

# Real-time Debugging

::: warning Note

SDK Debug mode is only for integration debugging. Do not use in production environment.

:::

During SDK integration, you can view SDK logs in IDE console or use TE's Debug feature for real-time debugging.

### 1. Print SDK Logs

```
local tdAnalytics = require "ThinkingDataSdk"
-- enable log
TDAnalytics.enableLog(true)
```

### 2. Enable Debug Mode

Enabling Debug mode requires two steps:

1. Use DebugConsumer
   Here is sample code using DebugConsumer:

```
-- DebugConsumer: Data is reported one by one. When problems occur, users are notified via logs and exceptions. Not recommended for production environment.
local tdAnalytics = require "ThinkingDataSdk"
local consumer = tdAnalytics.TDDebugConsumer("SERVER_URL", "APP_ID", false, "DeviceId")
local sdk = tdAnalytics(consumer)
-- Set visitor ID "ABCDEFG123456789"
local distinctId = "ABCDEFG123456789"
-- Set account ID "TE_10001"
local accountId = "TE_10001"
-- Set event properties
local properties = {}
-- Set user IP address, TE system will parse user geographic location based on IP, if not set, default not reported
properties["#ip"] = "192.168.1.1"
properties["#device_id"] = "te_device_id"
-- Upload event, including visitor ID and account ID, please note the order of account ID and visitor ID, both cannot be empty
sdk:track(accountId, distinctId, "payment", properties)
```

2. Add Debug Device in TE Backend
   To prevent Debug mode from going live in production environment, only specified devices can enable Debug mode. Debug mode can only be enabled when Debug mode is turned on in the client and the device ID is configured in TE backend's "Tracking Management" page under "Debug Data" section.

Debug mode may affect data collection quality and App stability. Only use for integration stage data verification, not for online environment.

---

# Preset Properties

The following preset properties are included in all events for Lua SDK.

**Property Name** | **Chinese Name** | **Property Type** | **Description**

#ip | IP Address | Text | User's IP address, needs to be set manually. TE will use this to obtain user's geographic location information.

#country | Country | Text | User's country, generated based on IP address.

#country_code | Country Code | Text | User's country code (ISO 3166-1 alpha-2, i.e., two uppercase English letters), generated based on IP address.

#province | Province | Text | User's province, generated based on IP address.

#city | City | Text | User's city, generated based on IP address.

#lib | SDK Type | Text | Type of SDK you integrated, such as Java, etc.

#lib_version | SDK Version | Text | Version of SDK you integrated.
