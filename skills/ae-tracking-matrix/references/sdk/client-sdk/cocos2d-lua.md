---
code: cocos2d_lua_sdk_installation
name: "Cocos2d-Lua"
wikiToken: QmTDwzv5mi9NVekISpKcwfJNnRc
parentWikiToken: BAU2w0eipiqGnckeUsIc0mYQnZc
updateTime: 1745310884000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=cocos2d_lua_sdk_installation
---

# Cocos2d-Lua

::: tip Note

Before integration, please read the Pre-installation Guide first.

Cocos2d-Lua SDK supports running on iOS and Android platforms, size approximately 7.1M

:::

**Latest Version:** v2.0.2

**Update Time:** 2024-01-19

**Resource Download:** Source Code, SDK Download

::: warning Warning

This document applies to v2.0.0 and later versions, for historical versions please refer to Cocos2d-Lua Integration Guide (V1), SDK Download (v1.0.1)

:::

### I. Integrate SDK

- **Add Cocos2d-Lua Configuration**
- Download Cocos2d-Lua SDK resource files, unzip the files and add `TDAnalytics.lua` to the `src` folder
- **Add Android Configuration**
- Create a `libs` folder in `frameworks/runtime-src/proj.android/app` directory, and add `TDAnalytics.aar` and `TDCore.aar` to the `libs` folder
- Add `TDAnalyticsProxy.java` in `frameworks/runtime-src/proj.android/app/src/org/cocos2dx/lua` directory
- Add the following configuration in `CMakeLists.txt`

```
if(ANDROID)
    list(APPEND GAME_SOURCE
        # ... Add the following code
        ${RUNTIME_SRC_ROOT}/proj.android/app/src/org/cocos2dx/lua/TDAnalyticsProxy.java
        ${RUNTIME_SRC_ROOT}/proj.android/app/libs/TDCore.aar
        ${RUNTIME_SRC_ROOT}/proj.android/app/libs/TDAnalytics.aar
        )
endif()
```

- Add the following configuration in `build.gradle` under `frameworks/runtime-src/proj.android/app` directory

```
dependencies {
    // Add .aar reference
    implementation fileTree(include: ['*.jar','*.aar'], dir: 'libs')
}
```

- **Add iOS Configuration (Cocos2d-Lua-Community 4.x)**
- Add `TDAnalyticsProxy.h`, `TDAnalyticsProxy.mm`, and `ThinkingSDK.framework` to `frameworks/runtime-src/proj.ios_mac/ios` directory
- Add the following configuration in `CMakeLists.txt`

```
if(APPLE)
    if(IOS)
        list(APPEND GAME_HEADER
             # [TDAnalytics] Add the following code
             ${RUNTIME_SRC_ROOT}/proj.ios_mac/ios/TDAnalyticsProxy.h
             )
        list(APPEND GAME_SOURCE
             # [TDAnalytics] Add the following code
             ${RUNTIME_SRC_ROOT}/proj.ios_mac/ios/TDAnalyticsProxy.mm
             ${RUNTIME_SRC_ROOT}/proj.ios_mac/ios/ThinkingSDK.framework
             )
    endif()
endif()

if(IOS)
    # [TDAnalytics] Add the following code
    target_link_libraries(${APP_NAME} ${RUNTIME_SRC_ROOT}/proj.ios_mac/ios/ThinkingSDK.framework)
endif()

if(IOS)
    # [TDAnalytics] Add the following code
    set(CMAKE_EXE_LINKER_FLAGS -ObjC)
endif()
```

- **Add iOS Configuration (Cocos2d-Lua-Community 3.x)**
- Open `iOS` project with Xcode, directly drag and drop the `iOS` folder from the SDK directory into the `Classes` directory
- Add `-force_load "$(SRCROOT)/ios/ThinkingSDK.framework/ThinkingSDK"` for both `Debug` and `Release` in `Build Setting` -> `Other Linker Flags`

### II. Initialization

```
local TDAnalytics = require("TDAnalytics")
TDAnalytics.init(APPID, SERVER_URL, TDAnalytics.debugModel.debugOff)
```

Parameter description:

- `APPID`: Your project's APPID, can be obtained from TE backend project management page
- `SERVER_URL`: URL for data upload
- If you are connecting to cloud service, enter: https://global-receiver-ta.thinkingdata.cn
- If you are using a privately deployed version, please bind a domain name for the data collection address and configure HTTPS certificate: https://your-data-collection-domain
<!-- unsupported block: 34 -->

Since Android 9.0+ restricts HTTP requests by default, please use HTTPS protocol

### III. Common Features

Before using common features, we recommend that you first understand the user identification rules; SDK will generate a random number as a visitor ID by default, and persistently store the visitor ID locally; before the user logs in, the visitor ID will be used as the identity identification ID. Note: The visitor ID will change when the user reinstalls the App or changes the device.

#### 3.1 Set Account ID

When a user logs in, you can call `login` to set the user's account ID. The TE platform will use the account ID as the identity identification ID, and the set account ID will be retained until `logout` is called. Calling `login` multiple times will override the previous account ID.

```
--The user's unique login identifier, this data corresponds to #account_id in the reported data, at this time #account_id is "TA"
TDAnalytics.login("TA")
```

`login` can be called multiple times. Each call will determine whether the passed account ID is consistent with the previously saved ID. If consistent, the call will be ignored; if inconsistent, the previous ID will be overridden.

<!-- unsupported block: 34 -->

**This method will not upload a login event**

#### 3.2 Set Public Event Properties

Public event properties refer to properties that will be present in every event. You can call `setSuperProperties` to set public event properties. We recommend that you set public event properties before sending events. For some important properties, such as user membership level, source channel, etc., these properties need to be set in every event, you can set these properties as public event properties.

```
local superProperties = {}
superProperties["channel"] = "ta" -- string
superProperties["age"] = 1 -- number
superProperties["isSuccess"] = true -- boolean
superProperties["birthday"] = os.date("%Y-%m-%d %H:%M:%S") -- time
superProperties["object"] = { key="value" } -- object
superProperties["object_arr"] = { { key="value" } } -- object array
superProperties["arr"] = { "value" } -- array
TDAnalytics.setSuperProperties(superProperties) -- Set public event properties
```

Public event properties will be saved to the cache and do not need to be called every time the App starts. If you call `setSuperProperties` to upload a previously set public event property, it will override the previous property.

- Key is the property name, is a string type, can only start with a letter, contain numbers, letters and underscores "\_", maximum length 50 characters, case-insensitive, TE will uniformly convert to lowercase letters
- Value is the property value, supports string, number, boolean, time, object, object array, array
<!-- unsupported block: 34 -->

**Event properties and user properties requirements are the same as public event properties**

#### 3.3 Enable Auto-tracking

The following code example enables installation, start, and end events. If you want to learn more about SDK's auto-tracking capabilities, you can view the Auto-tracking Feature Introduction

```
TDAnalytics.enableAutoTrack( {
    appInstall = true,
    appStart = true,
    appEnd = true
});
```

#### 3.4 Send Event

You can call `track` to upload events. It is recommended that you set event properties and conditions for sending information based on your previously documented tracking plan. Here is an example of a user purchasing a product:

```
TDAnalytics.track("product_buy", {
    product_name="Product Name"
});
```

The event name is a string type, can only start with a letter, can contain numbers, letters and underscores "\_", maximum length 50 characters.

#### 3.5 Set User Properties

For general user properties, you can call `userSet` to set them. Properties uploaded using this interface will override existing property values. If the user property did not exist before, it will be created with the same type as the uploaded property. Here is an example of setting the username:

```
-- At this time username is TA
TDAnalytics.userSet({
    user_name = "TA"
})
-- At this time username is TE
TDAnalytics.userSet({
    user_name = "TE"
})
```

### IV. Best Practices

The following example code includes all the above operations. We recommend following these steps:

```
-- Import TDAnalytics
local TDAnalytics = require("TDAnalytics")

if (Privacy Policy Authorization) {
    -- Initialize SDK
    TDAnalytics.init(APP_ID, SERVER_URL, TDAnalytics.debugModel.debugOff);
    --Enable auto-tracking events
    TDAnalytics.enableAutoTrack( {
        appInstall = true,
        appStart = true,
        appEnd = true
    });
    --If the user has logged in, you can set the user's account ID as the unique identifier
    TDAnalytics.login("TA")

    --After setting public event properties, every event will have public event properties
    local superProperties = {}
    superProperties["channel"] = "ta" -- string
    superProperties["age"] = 1 -- number
    superProperties["isSuccess"] = true -- boolean
    superProperties["birthday"] = os.date("%Y-%m-%d %H:%M:%S") -- time
    superProperties["object"] = { key="value" } -- object
    superProperties["object_arr"] = { { key="value" } } -- object array
    superProperties["arr"] = { "value" } -- array
    TDAnalytics.setSuperProperties(superProperties) -- Set public event properties

    --Send event
    TDAnalytics.track("product_buy", {
        product_name="Product Name"
    });

    --Set user properties
    TDAnalytics.userSet({
        user_name = "TE"
    })
}
```

###

---

# Advanced Guide

### I. Set User ID

The SDK instance defaults to using a random number as the default visitor ID for each user, which will serve as the identity identification ID for users in an unauthenticated state. Note that the visitor ID will change when the user reinstalls the App or changes the device.

#### 1.1 Set Visitor ID

::: tip Note

Generally, you do not need to customize the visitor ID. Please ensure you understand the user identification rules before setting the visitor ID.

If you need to replace the visitor ID, you should call it immediately after initializing the SDK. Do not call it multiple times to avoid creating unnecessary accounts.

:::

If your game has its own visitor ID management system for each user, you can call `setDistinctId` to set the visitor ID:

```
// Set the visitor ID to "Thinker"
TDAnalytics.setDistinctId("Thinker");
```

If you need to get the current visitor ID, you can call `getDistinctId`:

```
//Return visitor ID
local distinctId = TDAnalytics.getDistinctId();
```

#### 1.2 Set Account ID

When a user logs in, you can call `login` to set the user's account ID. The TE platform will use the account ID as the identity identification ID, and the set account ID will be retained until `logout` is called. Calling `login` multiple times will override the previous account ID.

```
--The user's unique login identifier, this data corresponds to #account_id in the reported data, at this time #account_id is "TA"
TDAnalytics.login("TA");
```

<!-- unsupported block: 34 -->

**This method will not upload a login event**

#### 1.3 Clear Account ID

After a user logs out, you can call `logout` to clear the account ID. Before calling `login` again, the visitor ID will be used as the identity identification ID.

```
TDAnalytics.logout();
```

We recommend that you call `logout` only when there is an explicit logout behavior, such as when the user actively cancels their account, rather than when the App is closed.

<!-- unsupported block: 34 -->

**This method will not upload a logout event**

### II. Send Events

After the SDK initialization is complete, you can perform data tracking and collect user behavior information. Generally, ordinary events can meet business scenario requirements. You can also use first-time events, updatable events, etc. according to your actual business scenarios.

#### 2.1 Ordinary Events

You can call `track` to upload events. We recommend that you set event properties and conditions for sending events based on your previously documented tracking plan. Here is an example of a user purchasing a product:

```
local properties = {
    product_name = "Product Name"
}
TDAnalytics.track("product_buy", properties)
```

#### 2.2 First-time Event

First-time events refer to events that will only be recorded once for a certain device or other dimensional ID. For example, in some scenarios, you may want to record an activation event on a certain device, then you can use first-time events to report the data.

```
-- Example: Report device first-time event, assuming event name is device_activation
TDAnalytics.trackFirst("device_activation", nil, {
    test_string="first_string"
})
```

If you want to determine whether it is the first time based on other dimensions other than the device, you can customize the first_check_id for the first-time event:

```
-- Set the user ID as the first_check_id of the first-time event to implement the collection of user first activation event
TDAnalytics.trackFirst("account_activation", "TA", {
    test_string="first_string"
})
```

<!-- unsupported block: 34 -->

Note: Since the verification of whether it is the first time is completed on the server side, first-time events will be delayed by 1 hour before entering the database by default.

#### 2.3 Updatable Events

You can implement the need to modify event data in specific scenarios through updatable events. Updatable events need to specify an ID that identifies the event, and pass it when creating the updatable event object. The TE backend will determine the data to be updated based on the event name and event ID.

```
-- Example: Report an event that can be updated, assuming the event name is UPDATABLE_EVENT
-- After reporting, the event property status is 3, price is 100
TDAnalytics.trackUpdate("UPDATABLE_EVENT", "Update_EventId", {
    status = 3,
    price = 100
})

-- After reporting, the event property status is updated to 5, price remains unchanged
TDAnalytics.trackUpdate("UPDATABLE_EVENT", "Update_EventId", {
    status = 5
})
```

#### 2.4 Overwritable Events

Overwritable events are similar to updatable events, the difference is that overwritable events will completely overwrite historical data with the latest data, which effectively is equivalent to deleting the previous data and storing the latest data. The TE backend will determine the data to be updated based on the event name and event ID.

```
-- Example: Report an event that can be overwritten, assuming the event name is OVERWRITABLE_EVENT
TDAnalytics.trackOverwrite("OVERWRITABLE_EVENT", "Overwrite_EventId", {
    status = 3,
    price = 100
})

-- After reporting, the event property status is updated to 5, price property is deleted
TDAnalytics.trackOverwrite("OVERWRITABLE_EVENT", "Overwrite_EventId", {
    status = 5
})
```

#### 2.5 Public Event Properties

Public event properties refer to properties that will be uploaded with every event. Based on the property update frequency, public event properties are divided into `static public event properties` and `dynamic public event properties`. You can choose different public event property setting methods according to your specific business scenario requirements; we recommend that you set public event properties before sending events. For the same event, when the Key of public event properties, event custom properties, and preset properties are the same, we will assign values according to the following priority: `Custom Properties > Dynamic Public Event Properties > Static Public Event Properties > Preset Properties`.

##### 2.5.1 Static Public Event Properties

Static public event properties are properties that change infrequently and are present in every event, such as user membership level. After setting static public event properties through `setSuperProperties`, the SDK will obtain the set public event properties as event properties when collecting events.

```
-- Set public properties
TDAnalytics.setSuperProperties({
    vip_level = 2
})
```

Static public event properties will be saved to the cache and do not need to be called every time the App starts. If the property already exists, the newly set property will override the original property value; if the property did not exist before, a new property will be created. Besides setting properties, we also provide other APIs to operate static public event properties to meet daily business needs.

```
-- Clear the public property named trip
TDAnalytics.unsetSuperProperty("trip")
-- Clear all public properties
TDAnalytics.clearSuperProperties()
-- Get all public properties
TDAnalytics.currentSuperProperties()
```

##### 2.5.2 Dynamic Public Event Properties

Dynamic public event properties are properties that change frequently and are present in every event, such as the number of gold coins a user has. After setting the dynamic public property class through `setDynamicSuperProperties`, the SDK will automatically obtain dynamic public event properties during event collection and add them to the triggered event.

```
local coin = 0;
local dynamicProperties = function()
    coin++
    local properties = { coin = coin }
    return properties
end
TDAnalytics.setDynamicSuperProperties(dynamicProperties);
```

#### 2.6 Record Event Duration

If you need to record the duration of an event, you can call `timeEvent` to start timing. Configure the event name you want to time. When you upload that event, a `#duration` property will automatically be added to your event properties to represent the recorded duration in seconds. Note that only one timing task can exist for the same event name.

```
--The following example completes the statistics of the user's stay duration on a certain product page
-- User enters the product page, start timing
TDAnalytics.timeEvent("stay_shop")
-- do some thing...
-- User leaves the product page, timing ends, the "stay_shop" event will have a property #duration representing the event duration
TDAnalytics.track("stay_shop", {})
```

### III. User Properties

The user property setting APIs supported by TE platform are: `userSet()`, `userSetOnce()`, `userAdd()`, `userAppend()`, `userUnset()`, `userDelete()`.

#### 3.1 userSet

For general user properties, you can call `userSet` to set them. Properties uploaded using this interface will override existing property values. If the user property did not exist before, it will be created with the same type as the uploaded property. Here is an example of setting the username

```
-- At this time username is TA
TDAnalytics.userSet({
    user_name = "TA"
})
-- At this time username is TE
TDAnalytics.userSet({
    user_name = "TE"
})
```

#### 3.2 userSetOnce

If you need to upload user properties that should only be set once, you can call `userSetOnce` to set them. When the property already has a value, this information will be ignored. Here is an example of setting the first payment time:

```
--first_payment_time is 2018-01-01 01:23:45.678
TDAnalytics.userSetOnce({
    first_payment_time = "2018-01-01 01:23:45.678"
})
-- first_payment_time is still 2018-01-01 01:23:45.678
TDAnalytics.userSetOnce({
    first_payment_time = "2018-12-31 01:23:45.678"
})
```

#### 3.3 userAdd

When you need to upload numeric properties, you can call `userAdd` to perform an accumulation operation on the property. If the property has not been set, it will be assigned 0 before calculation. Negative values can be passed, which is equivalent to a subtraction operation. Here is an example of accumulating total payment amount:

```
-- At this time total_revenue is 30
TDAnalytics.userAdd({
    total_revenue = 30
})
-- At this time total_revenue is 678
TDAnalytics.userAdd({
    total_revenue = 648
})
```

<!-- unsupported block: 34 -->

The property key is a string, and Value only allows numeric values.

#### 3.4 userAppend

You can call `userAppend()` to append elements to `Array` type user properties:

```
-- Append list type user properties
TDAnalytics.userAppend({
    weapon = {"m41", "bulldog"}
})
```

#### 3.5 userUnset

If you need to reset a user's property, you can call `userUnset()` to clear the value of a specified user property. This interface supports passing string type parameters:

```
-- Clear specified user property
TDAnalytics.userUnset("age")
```

<!-- unsupported block: 34 -->

The passed value is the Key of the property to be cleared.

#### 3.6 userDelete

If you need to delete a user, you can call `userDelete()` to delete that user. You will no longer be able to query that user's user properties, but the events generated by that user can still be queried.

```
-- Delete user
TDAnalytics.userDelete()
```

### IV. Other Features

#### 4.1 Get Device ID

After SDK initialization is complete, SDK will automatically generate a device ID and record it in local cache. For the same application or game, the device ID of one device is unchanged. You can call `getDeviceId()` to get the device ID:

```
-- Get Device ID
TDAnalytics.getDeviceId()
```

---

# Real-time Debugging

#### I. Print SDK Logs

```
-- Enable log printing
-- logLevelNone: Log printing off
-- logLevelError: Print error logs
-- logLevelInfo: Print detailed logs
-- logLevelDebug: Print debug logs
TDAnalytics.setLogLevel(TDAnalytics.logLevel.logLevelDebug)
```

<!-- unsupported block: 34 -->

After enabling logs, you can filter ThinkingData related logs in the IDE to observe SDK data reporting.

#### II. Enable Debug Mode

Enabling Debug mode requires the following two steps:

1. Enable Debug mode on the client side
   The following is an example code for enabling Debug mode on the client side:

```
--[[
Set the running mode to Debug mode
debugOff mode: Data will be stored in cache and reported according to a certain cache strategy. Default is NORMAL mode; recommended for production environment
debugOn mode: Data is reported one by one. When problems occur, users will be prompted with logs and exceptions; not recommended for production environment
debugOnly mode: Only validates data, will not be stored in database; not recommended for production environment
]]
TDAnalytics.init(APP_ID, SERVER_URL, TDAnalytics.debugModel.debugOn)
```

1. Add Debug device in TE backend
   To prevent Debug mode from being launched in production environments, only specified devices can enable Debug mode. Debug mode can only be enabled if Debug mode is enabled on the client side and the device ID is configured in the "Debug Data" section of the "Tracking Management" page in TE backend.

Device ID can be obtained through the following three ways:

- The #device_id property in event data in TE platform
- Client logs: SDK will print device DeviceId after initialization completes
- Through instance interface call: Get Device ID
<!-- unsupported block: 34 -->

Debug mode may affect data collection quality and App stability, it is only used for data verification during integration stage, do not use it in production environment.

---

# Auto-tracking

TDAnalytics SDK provides auto-tracking for three types of events:

- `appInstall`: Game installation, this event will be collected when the game is first opened after installation (event name `ta_app_install`)
- `appStart`: This event will be collected when the game enters foreground (event name `ta_app_start`)
- `appEnd`: This event will be collected when the game exits to background (event name `ta_app_end`)
  Auto-tracking can be enabled by calling the `enableAutoTrack()` interface:

```
-- Enable auto-tracking Default false: off, true: on
local autoTack = {
    appInstall = true,  -- Enable auto-tracking installation event
    appStart = true,  -- Enable auto-tracking start event
    appEnd = true -- Enable auto-tracking end event
}
TDAnalytics.enableAutoTrack(autoTack)
```

<!-- unsupported block: 34 -->

Note: If you need to customize the visitor ID, please be sure to call the `setDistinctId` interface to set the visitor ID before enabling the auto-tracking feature.

###

---

# Preset Properties

#### I. Preset Properties Description

<!-- unsupported block: 34 -->

Preset properties collected by each platform will have certain differences. For details, please refer to the following documents: Android Platform, iOS Platform

#### II. Get Preset Properties

When server-side tracking needs some preset properties from the App side, you can get the preset properties from the App side through this method and pass them to the server side.

```
-- Get property object
local presetProperties = TDAnalytics.getPresetProperties()

-- Generate event preset properties
local properties = presetProperties.toEventPresetProperties()
--[[
   {
        "#carrier": "China Telecom",
        "#os": "Android",
        "#device_id": "abb8e87bfb5ce66c",
        "#screen_height": 2264,
        "#bundle_id": "com.sw.thinkingdatademo",
        "#manufacturer": "realme",
        "#device_model": "RMX1991",
        "#screen_width": 1080,
        "#system_language": "zh",
        "#os_version": "10",
        "#network_type": "WIFI",
        "#zone_offset": 8,
        "#app_version":"1.0"
    }
]]--

-- Get a specific preset property
local bundleId = presetProperties.bundleId -- Package name
local mOS = presetProperties.os -- System type, such as Android/iOS
local systemLanguage = presetProperties.systemLanguage -- Mobile system language type
local screenWidth = presetProperties.screenWidth -- Screen width
local screenHeight = presetProperties.screenHeight -- Screen height
local deviceModel = presetProperties.deviceModel -- Device model
local deviceId = presetProperties.deviceId -- Device unique identifier
local carrier = presetProperties.carrier -- Mobile SIM card carrier information, for dual SIM dual standby, take the main card's carrier information
local manufacture = presetProperties.manufacturer -- Mobile manufacturer, such as HuaWei
local networkType = presetProperties.networkType -- Network type
local osVersion = presetProperties.osVersion -- System version number
local appVersion = presetProperties.appVersion -- app version number
local zoneOffset = presetProperties.zoneOffset -- Timezone offset value
```

<!-- unsupported block: 34 -->

IP, country and city information are generated by server-side analysis, client does not provide interface to get these properties

###
