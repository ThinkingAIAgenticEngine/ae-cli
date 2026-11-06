---
code: cocoscreator_sdk_installation
name: "CocosCreator"
wikiToken: MLL7wtab3ivQNYk3TDJcbjJRnRd
parentWikiToken: BAU2w0eipiqGnckeUsIc0mYQnZc
updateTime: 1773027497000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=cocoscreator_sdk_installation
---

# CocosCreator

::: tip Tip

Before integration, please read the Pre-Integration Guide first.

CocosCreator SDK supports platforms: Android, iOS, OpenHarmony, Web, WeChat Mini Game, Alipay Mini Game, Taobao Mini Game, ByteDance Mini Game, OPPO Mini Game, Huawei Quick Game, vivo Mini Game, Xiaomi Quick Game, Baidu Mini Game, Qutoutiao Mini Game, Facebook Mini Game, Google Play Mini Game.

:::

**Latest Version:** v3.5.0

**Update Time:** 2026-03-09

**Resource Download**: Source code, SDK download

::: warning Note

This document applies to v3.0.0 and later versions. For historical versions, please refer to CocosCreator Integration Guide (V2), SDK Download (v2.2.4)

:::

### 1. SDK Integration

Download and unzip CocosCreator SDK

:::: el-tabs

::: el-tab-pane label=TypeScript Integration

If your project is a TypeScript project, integration steps are as follows:

1. Put the declaration file tdanalytics.cc.d.ts in the libs directory under assets in the project root directory, if libs does not exist, create libs directory
1. Put the SDK file (tdanalytics.mg.cocoscreator.min.js) in assets/Script directory

:::

::: el-tab-pane label=JavaScript Integration

If your project is a JavaScript project, you can directly put the SDK file (tdanalytics.mg.cocoscreator.min.js) in assets/Script directory

:::

::::

### 2. Initialization

After importing TE SDK, you can use TDAnalytics in code:

Note: For Taobao mini game platform, TDAnalytics is mounted on window object, you need to use var TDAnalytics = window['TDAnalytics']

```
// TE SDK configuration object
var config = {
  appId: "YOUR_APPID", // Project APP ID
  serverUrl: "YOUR_SERVER_URL", // Reporting URL
  autoTrack: {
    appLaunch: true, // Auto-track ta_mg_launch
    appShow: true, // Auto-track ta_mg_show
    appHide: true // Auto-track ta_mg_hide
  }
};
// Initialize
TDAnalytics.init(config);
```

TE configuration object parameter description:

- `appId`: Your project's APP ID, required, can be viewed in TE backend project management page
- `serverUrl`: Data reporting URL, required
- If you use cloud service, enter: https://global-receiver-ta.thinkingdata.cn
- If you use privately deployed version, please confirm reporting address with operations team
- `autoTrack`: Optional, indicates whether to enable auto-tracking feature, each element represents the following auto-tracking events, default all disabled:
- `appLaunch`: Auto-track mini game initialization
- `appShow`: Auto-track mini game start, or from background to foreground
- `appHide`: Auto-track mini game from foreground to background, and record the duration of this visit (from start to entering background)

::: warning Note

Before reporting data, please add data transmission URL to server domain's request list in WeChat public platform or other platform's development settings.

:::

### 3. Common Features

Before using common features, we recommend you understand user identification rules first. SDK will generate a random number as visitor ID by default, and persist visitor ID locally, before user logs in, visitor ID will be used as identity identification ID. Note: Visitor ID will change when user clears cache or changes device.

#### 3.1 Set Account ID

When user logs in, you can call `login` to set user's account ID, TE platform will use account ID as identity identification ID, and the set account ID will be retained until `logout` is called. Calling `login` multiple times will overwrite the previous account ID.

```
// User's unique login identifier, this data corresponds to #account_id in reported data, at this time #account_id value is TA
TDAnalytics.login("TA");
```

**This method will not upload login event**

#### 3.2 Set Public Event Properties

Public event properties are properties that every event will have, you can call `setSuperProperties` to set public event properties, we recommend you set public event properties before sending events. For some important properties, such as user's membership level, source channel, etc., these properties need to be set in every event, you can set these properties as public event properties.

```
var superProperties = {
    channel : "ta", //String
    age : 1,//Number
    isSuccess : true,//Boolean
    birthday :  new Date(),//Object
    object : { key : "value" },//Object
    object_arr : [ { key : "value" } ],//Object array
    arr : [ "value" ]//Array
};
//Set public event properties
TDAnalytics.setSuperProperties(superProperties);
```

Public event properties will be saved to cache, no need to call every time when starting. If `setSuperProperties` is called to upload previously set public event properties, it will overwrite previous properties.

- Key is the property name, string type, must start with letter, contain numbers, letters and underscore "\_", maximum length 50 characters, case insensitive, TE will convert to lowercase uniformly
- Value is the property value, supports string, number, boolean, time, object, object array, array

**Event properties and user property requirements are consistent with public event properties**

#### 3.3 Send Event

You can call `track` to upload events, we recommend you set event properties and conditions for sending information according to the previously prepared tracking document, here we use user purchasing a product as an example:

```
TDAnalytics.track({
    eventName: "product_buy", // Event name
    properties: {
        product_name: "Product Name"
    } //Event properties
});
```

Event name is string type, must start with letter, can contain numbers, letters and underscore "\_", maximum length 50 characters.

#### 3.4 Set User Properties

For general user properties, you can call `userSet` to set them, properties uploaded using this interface will overwrite existing property values, if the user property did not exist before, it will create a new user property with the same type as the passed property type, here we use setting username as an example:

```
//At this time username is TA
TDAnalytics.userSet({
    properties: { username: "TA" }
});
//At this time userName is TE
TDAnalytics.userSet({
    properties: { username: "TE" }
});
```

### 4. Best Practices

The following example code includes all the above operations, we recommend using the following steps:

```
var config = {
  appId: "YOUR_APPID", // Project APP ID
  serverUrl: "YOUR_SERVER_URL", // Reporting URL
  autoTrack: {
    appLaunch: true, // Auto-track ta_mp_launch
    appShow: true, // Auto-track ta_mg_show
    appHide: true // Auto-track ta_mg_hide
  }
};
//Initialize
TDAnalytics.init(config);
// User's unique login identifier, this data corresponds to #account_id in reported data, at this time #account_id value is TA
TDAnalytics.login("TA");
//Set public event properties
var superProperties = {
    channel : "ta", //String
    age : 1,//Number
    isSuccess : true,//Boolean
    birthday :  new Date(),//Object
    object : { key : "value" },//Object
    object_arr : [ { key : "value" } ],//Object array
    arr : [ "value" ]//Array
};
TDAnalytics.setSuperProperties(superProperties);
//Send event
TDAnalytics.track({
    eventName: "product_buy", // Event name
    properties: {
        product_name: "Product Name"
    } //Event properties
});
//Set user properties
TDAnalytics.userSet({
    properties: {
        username: "TE"
    }
});
```

---

# Advanced Guide

### 1. Set User ID

SDK instance will use random number as default visitor ID for each user by default, this ID will be used as identity identification ID for user in unlogged state. Note that visitor ID will change when user clears cache or changes device.

#### 1.1 Set Visitor ID

::: tip Tip

Generally, you don't need to customize visitor ID. Please make sure you understand user identification rules before setting visitor ID.

:::

If your App has its own visitor ID management system for each user, you can call `setDistinctId` to set visitor ID:

```
// Set visitor ID to Thinker
TDAnalytics.setDistinctId("Thinker");
```

If you need to get current visitor ID, you can call `getDistinctId` to get:

```
//Return visitor ID
let distinctId = TDAnalytics.getDistinctId();
```

If you need to set it, must call this interface before initialization.

#### 1.2 Set Account ID

When user logs in, you can call `login` to set user's account ID, TE platform will use account ID as identity identification ID, and the set account ID will be retained until `logout` is called. Calling `login` multiple times will overwrite the previous account ID.

```
//User's unique login identifier, this data corresponds to #account_id in reported data, at this time #account_id value is TA
TDAnalytics.login("TA");
```

**This method will not upload login event**

#### 1.3 Clear Account ID

After user logs out, you can call `logout` to clear account ID, before calling `login` next time, visitor ID will be used as identity identification ID.

```
// Remove #account_id from reported data, subsequent data will not have #account_id
TDAnalytics.logout();
```

We recommend you call `logout` when there is an explicit logout event, such as when user performs account cancellation action, rather than calling it when closing App.

**This method will not upload logout event**

### 2. Send Event

After SDK initialization is complete, you can perform data tracking and collect user behavior information. Generally, normal events can meet business scenario requirements, you can also use first, updatable and other events according to your actual business scenarios.

#### 2.1 Normal Event

You can call `track` to upload events, we recommend you set event properties and conditions for sending events according to the previously prepared document, here we use user purchasing a product as an example

```
TDAnalytics.track({
    eventName: "product_buy", // Tracking event name
    properties: { product_name: "Product Name" } // Event properties to upload
});
```

#### 2.2 First Event

First event refers to events that will only be recorded once for a certain device or other dimension ID. For example, in some scenarios, you may want to record the activation event on a certain device, then you can use first event to report data.

```
TDAnalytics.trackFirst({
    eventName: "device_activation",
    properties: { key: "value" }
});
```

If you want to determine whether it's the first time based on dimensions other than device, you can customize first_check_id for first event:

```
// Set user ID as first_check_id for first event, to collect user's first activation event
TDAnalytics.trackFirst({
    eventName: "account_activation",
    firstCheckId: "TA",
    properties: { key: "value" }
});
```

Note: Since the verification of whether it's the first time is completed on the server side, first event will be delayed by 1 hour before entering the database by default.

#### 2.3 Updatable Event

You can use updatable event to achieve the requirement of modifying event data in specific scenarios. Updatable event needs to specify the ID that identifies the event and pass it when creating the updatable event object. TE backend will determine the data that needs to be updated based on event name and event ID.

```
// Example: Report an updatable event, assume event name is UPDATABLE_EVENT
// After reporting, event property status is 3, price is 100
TDAnalytics.trackUpdate({
    eventName: "UPDATABLE_EVENT",
    properties: { status: 3, price: 100 },
    eventId: "test_event_id"
});

// After reporting, event property status is updated to 5, price unchanged
TDAnalytics.trackUpdate({
    eventName: "UPDATABLE_EVENT",
    properties: { status: 5 },
    eventId: "test_event_id"
});
```

#### 2.4 Overwritable Event

Overwritable event is similar to updatable event, the difference is that overwritable event will completely overwrite historical data with the latest data, from the effect it's equivalent to deleting the previous data and storing the latest data in the database. TE backend will determine the data that needs to be updated based on event name and event ID.

```
// Example: Report an overwritable event, assume event name is OVERWRITE_EVENT
// After reporting, event property status is 3, price is 100
TDAnalytics.trackOverwrite({
  eventName: "OVERWRITE_EVENT",
  properties: { status: 3, price: 100 },
  eventId: "test_event_id"
});

// After reporting, event property status is updated to 5, price property is deleted
TDAnalytics.trackOverwrite({
  eventName: "OVERWRITE_EVENT",
  properties: { status: 5 },
  eventId: "test_event_id"
});
```

#### 2.5 Public Event Properties

For some important properties, such as user's device ID, source channel, user status, etc., these properties need to be set in every event, you can set these properties as public properties, i.e. properties that every event will have. We recommend you set public properties before sending events.

Public properties include two types, event public properties and dynamic public properties. When reporting events, public properties will be inserted into data's properties. If public property and custom property set in event have the same key value, the property value will be determined according to the following priority: `Custom Property > Dynamic Public Event Property > Static Public Event Property > Preset Property`

##### 2.5.1 Static Public Event Properties

For some important properties, such as user's channel, nickname, ID, etc., these properties need to be set in every event, you can call `setSuperProperties` to set static public event properties, static public event properties will be globally effective. When caching is enabled (default on), static public properties will be cached in `localStorage` or `cookie`.

Static public property parameter is a JSON object, its format requirements are consistent with event properties.

```
// Set public event properties, all data events will have these properties
TDAnalytics.setSuperProperties({ channel: "Channel Name", user_name: "Username" });
```

Besides property setting, we also provide other APIs to operate static public event properties to meet daily business needs.

```
// Get static public event properties
var superProperties = TDAnalytics.getSuperProperties();
// Clear a static public event property, for example clear previously set 'channel' property, subsequent data will not have this property
TDAnalytics.unsetSuperProperty("channel");
// Clear all static public event properties
TDAnalytics.clearSuperProperties();
```

##### 2.5.2 Dynamic Public Event Properties

Set dynamic public property callback function through `setDynamicSuperProperties`, SDK will trigger callback function when reporting events and add the returned JSON object to event properties. `setDynamicSuperProperties` parameter is a function, the function needs to return a JSON object.

```
// Set dynamic public properties, trigger callback function when reporting events and add returned JSON object to event properties
TDAnalytics.setDynamicSuperProperties(function() {
  var d = new Date();
  d.setHours(10);
  return { date: d };
});
```

#### 2.6 Record Event Duration

If you need to record the duration of an event, you can call `timeEvent` to start timing. Configure the event name you want to time, when you upload that event, it will automatically add `#duration` property in your event properties to represent the recorded duration, unit is seconds. Note that the same event name can only have one timing task.

```
//The following example completes the statistics of user's stay duration on a product page
TDAnalytics.timeEvent({
    eventName: "stay_shop"
});
/**do something
    .......
**/
//User leaves product page, timing ends, "stay_shop" event will have #duration property representing event duration
TDAnalytics.track({
    eventName: "stay_shop",
    properties: {
        product_name: "Product Name"
    }
});
```

### 3. User Properties

TE platform supported user property setting APIs are: `userSet`, `userSetOnce`, `userAdd`, `userUnset`, `userDelete`, `userAppend`, `userUniqAppend`.

#### 3.1 userSet

For general user properties, you can call `userSet` to set them. Properties uploaded using this interface will overwrite existing property values, if the user property did not exist before, it will create a new user property with the same type as the passed property type, here we use setting username as an example:

```
// username is TA
TDAnalytics.userSet({
    properties: {
        username: "TA"
    }
});
//username is TE
TDAnalytics.userSet({
    properties: {
        username: "TE"
    }
});
```

#### 3.2 userSetOnce

If the user property you want to upload only needs to be set once, you can call `userSetOnce` to set it, when the property already has a value before, this message will be ignored, here we use setting first payment time as an example:

```
//first_payment_time is 2018-01-01 01:23:45.678
TDAnalytics.userSetOnce({
    properties: {
        first_payment_time: "2018-01-01 01:23:45.678"
    }
});
//first_payment_time is still 2018-01-01 01:23:45.678
TDAnalytics.userSetOnce({
    properties: {
        first_payment_time: "2018-12-31 01:23:45.678"
    }
});
```

#### 3.3 userAdd

When you want to upload numeric properties, you can call `userAdd` to accumulate the property, if the property hasn't been set yet, it will assign 0 before calculation. If negative value is passed, it's equivalent to subtraction operation.

```
//At this time total_revenue is 30
TDAnalytics.userAdd({
    properties: {
        total_revenue: 30
    }
});
//At this time total_revenue is 678
TDAnalytics.userAdd({
    properties: {
        total_revenue: 648
    }
});
```

#### 3.4 userUnset

When you want to clear user's user property value, you can call `userUnset` to clear the specified property, if the property has not been created in the cluster yet, `userUnset` will **not** create the property

```
// Clear user property value with property name userPropertykey, i.e. set to NULL
TDAnalytics.userUnset({
    property: "userPropertykey"
});
```

#### 3.5 userDelete

If you want to delete a user, you can call `userDelete` to delete this user, you will no longer be able to query this user's user properties, but the events generated by this user can still be queried.

```
TDAnalytics.userDelete();
```

#### 3.6 userAppend

You can call `userAppend` to append elements to array type user data.

```
TDAnalytics.userAppend({
    properties: {
        user_list: ["apple", "ball"]
    }
});
```

#### 3.7 userUniqAppend

You can call `userUniqAppend` to append unique elements to Array (List) type user data. Calling `userUniqAppend` interface will deduplicate the appended user properties, `userAppend` interface does not deduplicate, user properties can have duplicates.

```
//At this time user_list property value is ["apple", "ball"]
TDAnalytics.userAppend({
    properties: {
        user_list: ["apple", "ball"]
    }
});
//At this time user_list property value is ["apple", "apple", "ball", "cube"]
TDAnalytics.userAppend({
    properties: {
        user_list: ["apple", "cube"]
    }
});
//At this time user_list property value is ["apple", "ball", "cube"]
TDAnalytics.userUniqAppend({
    properties: {
        user_list: ["apple", "cube"]
    }
});
```

### 4. Encryption Feature

From v2.1.0, SDK supports encryption feature, client supports AES + RSA to encrypt data, then server decrypts the data, encryption/decryption capability needs client and server to cooperate, please consult customer success personnel for details.

Set `enableEncrypt` property to true, and set default version number and public key.

```
var config = {
  appId: "YOUR_APP_ID", // Project APP ID
  serverUrl: "YOUR_SERVER_URL", // Reporting URL
  enableEncrypt: true, // Enable data transmission encryption
  secretKey: {
    publicKey:'YOUR_PUBLIC_KEY', // Encryption public key
    version:0 // Key version number
   }
};
// Initialize
TDAnalytics.init(config);
```

### 5. Other Features

#### 5.1 Get Device ID

You can call `getDeviceId()` to get device ID.

```
var deviceId = TDAnalytics.getDeviceId();
```

**Device ID will be saved in cache, if user clears cache, device ID will be reset.**

#### 5.2 onComplete Callback Function

For `track`, `userSet`, `userSetOnce`, `userAdd`, `userDelete` and other interfaces, onComplete callback can be passed. You can directly pass onComplete after original parameter list, or use parameter object way. If using parameter object, the parameter object must include onComplete, otherwise parameter error will occur. Using upload event as example:

```
TDAnalytics.track({
  eventName: "test", // Required
  properties: { testkey: 123 }, // Optional
  time: new Date(),
  onComplete: res => {
    console.log(res);
  }
});
```

onComplete parameter res is object type, has two properties code and msg.

res.code is int type, defined as:

- 0: Success
- -1: Data format incorrect
- -2: APP ID invalid
- -3: Network or server exception

Debug mode definition:

- 0: Success
- -1: Parameter or permission validation issue
- 1: Indicates field basic error, will give detailed error field and reason
- 2: Indicates whole record error
- -3: Network or server exception

res.msg is textual description of res.code.

#### 5.3 Set Event Cache Reporting

From v2.2.0, you can configure to enable event cache reporting during initialization.

```
// TE SDK configuration object
var config = {
  appId: "YOU-APP-ID", // Project APP ID
  serverUrl: "https://youserverurl.com", // Data reporting URL
  enableBatch: true, // Whether to enable event cache batch reporting, true=enable, false=disable
  batchConfig: {
    size: 5, // Event cache reporting count
    interval: 5000 // Event cache reporting interval (milliseconds)
  }
};
// Initialize
TDAnalytics.init(config);
```

#### 5.4 Calibrate Time

- SDK will use local time as event occurrence time by default, if user manually modifies device time it will affect your business analysis, you can ensure the accuracy of event occurrence time through time calibration operation. Currently only supports Android, iOS, OpenHarmony platforms.

```
// 1585633785954 is current unix timestamp, unit is milliseconds, corresponding to Beijing time 2020-03-31 13:49:45
TDAnalytics.calibrateTime(1585633785954);
```

- You can also set automatic time calibration, after that SDK will try to get current time from config interface and calibrate SDK time. If correct return result is not obtained, subsequent data will be reported using local time.

```

var config = {
  appId: "YOUR_APPID",
  serverUrl: "YOUR_SERVER_URL",
  enableAutoCalibrated:true
};
TDAnalytics.init(config);
```

#### 5.5 Set Default Timezone

By default, SDK (>=3.5.0) will use local time as event occurrence time. You can also set default timezone interface to specify timezone, so all events will align event time according to your set timezone. Currently does not support OpenHarmony platform temporarily.

```
var config = {
  appId: "YOUR_APPID",
  serverUrl: "YOUR_SERVER_URL",
  zoneOffset:9
};
TDAnalytics.init(config);
```

Aligning event time with specified timezone will lose device local timezone information. If you need to preserve device local timezone information, currently you need to add related properties to events yourself.

### 6. Channel SDK Compatibility

#### 6.1 Tencent Ads

##### 6.1.1 Solution Introduction

After integrating TDAnalytics SDK, you don't need to additionally integrate Tencent Ads SDK. Once you complete TDAnalytics initialization method, the system will automatically trigger Tencent Ads SDK initialization. When you report key events like registration, payment, etc., the system will automatically report these event information to Tencent Ads according to your configuration.

##### 6.1.2 Integration Process

1. Download Tencent Ads SDK, currently using version 1.5.4, other versions can also be used.
   Put dn-sdk-minigame.cjs.js file in the same directory as TDAnalytics SDK.

1. Initialize
   Note: TDAnalytics SDK version needs >= 3.0.4

```
TDAnalytics.init({
    appId: 'AppId',
    serverUrl: 'ServerUrl',
    tgaInitParams: {
        user_action_set_id: 100001,// Data source ID, number, required
        secret_key: '5e853xxxxxxd57a690xxxxxxxxxx',// Encryption key, required
        appid: 'wx123xyz123xyz123x',//WeChat mini game APPID, starts with wx, required
    },
    reportingToTencentSdk: 2,//1 Only report to Tencent 2 Report to both Tencent and TA 3 Only report to TA
    debugMode: 'debug'// If debug mode, will print Tencent Ads SDK local debug log
})
```

1. Set User ID

- setOpenId
  openid is generally obtained asynchronously by calling backend interface (get openid method), please call _ sdk.setOpenId() _ method to set after getting openid. Only one of openid and unionid can be set, prioritize setting openid.

```
wx.request({
    url: 'Backend get openid and determine if registered user interface url',
    success: function(res){
        if(res.openid){
          // Set openid, must set openid before reporting registration behavior. setOpenId is synchronous method, can immediately report registration behavior after setting.
          TDAnalytics.login(res.openid);

          //Report registration behavior, backend interface determines if registered user
          if(res.isRegisterUser){
           TDAnalytics.track({
                eventName: "REGISTER"
            });
          }
        }
    }
});
```

- setUnionId
  unionid is generally obtained asynchronously by calling backend interface (get unionid method), please call _ sdk.setUnionId() _ method to set after getting unionid. Use this method to set unionid only when openid is not available.

```
wx.request({
    url: 'Backend get openid and determine if registered user interface url',
    success: function(res){
        if(res.unionid){
          // Set unionid, please prioritize openid, only set unionid when openid is not available or backend uniformly uses unionid.
          TDAnalytics.setDistinctId(res.unionid);

          //Report registration behavior, backend interface determines if registered user
          if(res.isRegisterUser){
           TDAnalytics.track({
                eventName: "REGISTER"
            });
          }
        }
    }
});
```

1. Report Behavior

```
TDAnalytics.track({
    eventName: "product_buy", // Event name
    properties: {
        product_name: "Product Name"
    } //Event properties
});
```

If it's the following specific events, need to report specified event name

Event | Event Name | Event Properties (need to include key)
Mini Game Startup | START_APP | None
Payment | PURCHASE | { value: 600 }
Registration | REGISTER | None
Silent Wake-up | RE_ACTIVE | { backFlowDay: 30 }
Add Mini Game to Wishlist | ADD_TO_WISHLIST | { type: 'default' }
Share Mini Game | SHARE | { target: 'APP_MESSAGE' }
Create Character | CREATE_ROL | { name: 'SuperMan' }
Complete Tutorial | TUTORIAL_FINISH | None
Game Level Up | UPDATE_LEVEL | { level: 2, power: 85 }
View Mall Page | VIEW_CONTENT | { item: 'Mall' }
View Game Activity | VIEW_CONTENT | { item: 'Activity' }

For example, report game level up event

```
TDAnalytics.track({
    eventName: "UPDATE_LEVEL",
    properties: {
        level: 2,
        power: 85,
    }
});
```

---

# Native Support

### 1. iOS Native Support

First iOS project build will generate project code in `./build/ios/` and `./native/engine/ios/` two directories, then start configuring iOS project.

#### **1.1 Manual Configuration**

- Add iOS project dependency files
- `CocosCreatorProxyApi.h`
- `CocosCreatorProxyApi.mm`
- `ThinkingSDK.framework`
- `ThinkingDataCore.framework`
- Build Phases settings
- Add `ThinkingSDK.framework` in `Link Binary With Libraries`
- Build Settings settings
- Add `ThinkingSDK.framework` reference path in Framework Search Paths, such as `"$(SRCROOT)/../Classes"`
- Add `-ObjC` in `Other Linker Flags`

#### **1.2 CMakeList Configuration**

::: tip Tip:

`CMakeList` file path is `./native/engine/ios/CMakeLists.txt`;

CMakeList file will be generated after first iOS project build, configuration will take effect when building again after configuration;

Need to copy iOS resource files to corresponding folder first, such as `./native/engine/common/Classes/ThinkingAnalytics/ios/`, fill corresponding path when configuring CMakeList.

:::

- Add iOS project dependency files

```
# Find this line of code
set(PROJ_COMMON_SOURCES
    ${CMAKE_CURRENT_LIST_DIR}/../common/Classes/Game.h
    ${CMAKE_CURRENT_LIST_DIR}/../common/Classes/Game.cpp
    # Add the following code
    ${CMAKE_CURRENT_LIST_DIR}/../common/Classes/ThinkingAnalytics/ios/CocosCreatorProxyApi.h
    ${CMAKE_CURRENT_LIST_DIR}/../common/Classes/ThinkingAnalytics/ios/CocosCreatorProxyApi.mm
    ${CMAKE_CURRENT_LIST_DIR}/../common/Classes/ThinkingAnalytics/ios/ThinkingSDK.framework
    ${CMAKE_CURRENT_LIST_DIR}/../common/Classes/ThinkingAnalytics/ios/ThinkingDataCore.framework
)
```

- Build Phases settings

```
# Find this line of code
target_link_libraries(${LIB_NAME} cocos2d)
# Add the following code
target_link_libraries(${LIB_NAME} ${CMAKE_CURRENT_LIST_DIR}/../common/Classes/ThinkingAnalytics/ios/ThinkingSDK.framework)
target_link_libraries(${LIB_NAME} ${CMAKE_CURRENT_LIST_DIR}/../common/Classes/ThinkingAnalytics/ios/ThinkingDataCore.framework)
```

- Build Settings settings

```
# Find this line of code
set(PRODUCT_NAME ${APP_NAME})
# Add the following code
set(CMAKE_EXE_LINKER_FLAGS -ObjC)
```

::: warning Note

Cocos Creator v2.x editor does not support `CMake` configuration method temporarily, need to configure manually.

:::

### 2. Android Native Support

Build Android project, configure Android project.

- In Android display mode app project, add dependency file `CocosCreatorProxyApi.java` to `com.cocos.game`, as shown below
- In project's app folder proguard-rules.pro file, add obfuscation

```
-keep public class com.cocos.game.CocosCreatorProxyApi {*;}
```

- Create libs directory in project's app folder, copy `TDAnalytics.aar`, `TDCore.aar` to it
- Add dependency in `Module`'s `build.gradle` file

```
dependencies {
    ...
    implementation fileTree(dir: 'libs', include: ['*.aar'])
}
```

### 3. OpenHarmony Native Support

First build OpenHarmony project

- Put TDAnalytics.har and CocosCreatorProxyApi.ts in the following directory
- Import SDK in oh-packages.json5 file

```
"@thinkingdata/analytics": "file:./libs/TDAnalytics.har"
```

- Import bridge file in build-profile.json5

```
arkOptions: {
  runtimeOnly: {
    sources: [
      './src/main/ets/CocosCreatorProxyApi.ts',
    ],
  },
}
```

- Import context
  Currently CocosCreator's first version supporting OpenHarmony, interaction is in work thread, temporarily no official API to get context, will wait for official update later, currently can add manually

The above operation is to pass context to work thread, then need to use it when SDK initialization

If there are other ways to get context, you can also modify initWithConfig method in CocosCreatorProxyApi.ts file yourself

### 4. Enable Native Support

When initializing SDK, add `enableNative: true` in `config` to enable Native support.

```
// TA SDK configuration object
var config = {
   appId: "YOUR_APPID", // Project APP ID
   serverUrl: "YOUR_SERVER_URL", // Reporting URL
   enableNative: true,// Allow calling Native code
   autoTrack: {
      appShow: true, // Auto-track start event
      appHide: true, // Auto-track end event
      appCrash: true, // Auto-track crash event (only native effective)
      appInstall: true // Auto-track install event (only native effective)
   }
};
// Initialize
TDAnalytics.init(config);
```

---

# Real-time Debugging

During SDK integration, you can perform real-time debugging by viewing SDK logs in IDE console or using TE's Debug feature.

#### 1. Print SDK Logs

```
var config = {
    appId: "xxx",
    serverUrl: "xxx",
    enableLog:true
};
TDAnalytics.init(config);
```

After enabling logs, you can filter ThinkingAnalytics related logs in IDE to observe SDK data reporting.

#### 2. Enable Debug Mode

Enabling Debug mode requires the following two steps:

1. Client enables Debug mode
   Here is the client Debug mode enable example code:

```
/*
Set running mode to Debug mode
none: Data will be stored in cache and reported according to certain cache strategy, default is NORMAL mode; recommended for production environment
debug: Data is reported one by one. When problems occur, it will prompt users with logs and exceptions; not recommended for production environment
debugOnly: Only validates data, will not store in database; not recommended for production environment
 */
var config = {
  appId: "YOUR_APPID",
  serverUrl: "YOUR_SERVER_URL",
  debugMode: "debug"
};
TDAnalytics.init(config);
```

1. TE backend adds Debug device
   To avoid Debug mode going live in production environment, it is specified that only designated devices can enable Debug mode. Only when client has enabled Debug mode and device ID is configured in TE backend's "Tracking Management" page's "Debug Data" section can Debug mode be enabled.

Device ID can be obtained through the following three ways:

- #device_id property in event data on TE platform
- Client log: SDK will print device DeviceId after initialization is complete
- Call through instance interface: Get Device ID

Debug mode may affect data collection quality and App stability, only use for integration phase data validation, do not use in production environment.

---

# Auto-tracking

In config when creating instance, enable auto-tracking events you need, SDK will automatically collect mini game behaviors, currently the following events support auto-tracking:

Currently supported automated data collection includes:

1. Mini game returns to foreground event
1. Mini game enters background, and records the duration of this visit (from start to entering background)

Next we will introduce each data collection method in detail

### 1. Enable Auto-tracking Events

In config, elements in `autoTrack` parameter represent the switch for each auto-tracking event, set to `true` to enable auto-tracking:

```
var config = {
    appId: "YOUR_APPID",
    serverUrl: "YOUR_SERVER_URL",
    autoTrack: {
         appLaunch: true, // Auto-track ta_mg_launch
         appShow: true, // Auto-track ta_mg_show
         appHide: true, // Auto-track ta_mg_hide
         properties: { // Auto-track custom properties staticKey: 'staticValue'},
         callback: (eventType:any) =>{ // Auto-track callback
           if (eventType === 'appShow')
           {
            return { appShowKey: 'appShowValue' };
           }
           else if (eventType === 'appHide')
           {
            return { appHideKey: 'appHideValue' };
           }
           else {
             return {};
           }
         }
     }
};
TDAnalytics.init(config);
```

- appLaunch: Auto-track mini game initialization
- appShow: Auto-track mini game start, or from background to foreground
- appHide: Auto-track mini game from foreground to background
- properties: Auto-track custom properties (supports appShow/appHide)
- callback: Auto-track callback (supports appShow/appHide)

If you need the first auto-tracking event to carry account, visitor and static public properties, you can pass the following configuration during initialization:

```
TDAnalytics.init(config, () => {
  TDAnalytics.login("TA")
  TDAnalytics.setDistinctId("DIS_TA")
  TDAnalytics.setSuperProperties({
    key: "value"
  });
});
```

### 2. Auto-tracking Event Details

#### 2.1 Mini Game Initialization

Mini game initialization will be triggered when mini game is first opened, or when user kills process and reopens, will only trigger once in process lifecycle, detailed event introduction:

- Event name: ta_mg_launch
- Auto-tracking properties:
- `#scene`, scene value, taken from WeChat provided scene value
- `#start_reason`, app start source, is parameter obtained from `getLaunchOptionsSync` interface

Through mini game initialization event, you can calculate daily user usage times, average usage times per user, including grouping by scene value to view different scene value user usage situations.

#### 2.2 Mini Game Start

Mini game start will be triggered when mini game is started, or when mini game is called back from background to foreground, detailed event introduction:

- Event name: ta_mg_show
- Auto-tracking properties:
- `#scene`, scene value, taken from WeChat provided scene value

Mini game start is affected by foreground/background switching (many records), so not suitable for direct analysis, but can mark user's usage in behavior path, can serve as initial behavior of user behavior path

#### 2.3 Mini Game Hide

Mini game hide will be triggered when mini game enters background, and records this usage duration, detailed event introduction:

- Event name: ta_mg_hide
- Auto-tracking properties:
- `#scene`, scene value, taken from WeChat provided scene value
- `#duration`, numeric type, represents the duration from this start (ta_mg_show) to hide

Mini game hide event will record usage duration (unit is seconds), so can directly calculate user total usage duration and average duration per user, can also divide by initialization times to calculate single usage duration.

---

# Preset Properties

#### 1. Preset Properties for All Events

Preset properties collected by each platform will have certain differences, you can refer to the following documents: Android Platform, iOS Platform

**Mini game platform preset properties for all events:**

**Property Name** | **Chinese Name** | **Property Type** | **Description**
#ip | IP Address | Text | User's IP address, TE will use this to get user's geographic location information
#country | Country | Text | User's country, generated based on IP address
#country_code | Country Code | Text | User's country code (ISO 3166-1 alpha-2, i.e. two uppercase English letters), generated based on IP address
#province | Province | Text | User's province, generated based on IP address
#city | City | Text | User's city, generated based on IP address
#device_model | Device Model | Text | User device's model, such as iPhone 8
#device_id | Device ID | Text | User's device ID, UUID generated during initialization
#screen_height | Screen Height | Number | User device's screen height, such as 1920
#screen_width | Screen Width | Number | User device's screen height, such as 1080
#manufacturer | Device Manufacturer | Text | User device's manufacturer, such as Apple, vivo
#os_version | Operating System Version | Text | iOS 11.2.2, Android 8.0.0, etc.
#os | Operating System | Text | Such as Android, iOS
#network_type | Network Status | Text | Network status when uploading event, such as WIFI, 3G, 4G
#lib | SDK Type | Text | SDK type you integrated, such as MG (mini game)
#lib_version | SDK Version | Text | SDK version you integrated
#scene | Scene Value | Number | Scene value passed when WeChat mini game starts
#mp_platform | Mini Game Platform | Text | Identifies the platform where app is located
#zone_offset | Timezone Offset | Number | Data time offset hours relative to UTC time

#### 2. Auto-tracking Event Preset Properties

The following preset properties are unique preset properties in each auto-tracking event

- Mini program start (ta_mp_show) preset properties
  **Property Name** | **Chinese Name** | **Property Type** | **Description**
  #url_path | Page Path | Text | Mini program start displayed page path
  #start_reason | App Start Source | Text | Content is JSON string, is parameter obtained from `getLaunchOptionsSync` interface

- Mini game hide (ta_mg_hide) preset properties
  **Property Name** | **Chinese Name** | **Property Type** | **Description**
  #duration | Event Duration | Number | Represents the duration from this start `ta_mg_show` to hide `ta_mg_hide`, unit is seconds

#### 3. Get Preset Properties

When server tracking needs some preset properties from App side, you can get client preset properties through this method, then pass to server.

```
//Get property object
var presetProperties = TDAnalytics.getPresetProperties();
//Generate event preset properties
var properties = presetProperties.toEventPresetProperties();
/*
      {
         "#device_model":"iPhone 5",
         "#device_id":"3204487163-1624513721217",
         "#screen_width":320,
         "#screen_height":568,
         "#os":"iOS",
         "#os_version":"10.0.1",
         "#network_type":"wifi",
         "#zone_offset":8,
         "#manufacturer":"Apple"
       }
 */
//Get a preset property
var os=presetProperties.os;//OS type, such as Android
var osVersion=presetProperties.osVersion;//System version number
var networkType=presetProperties.networkType;//Network type
var manufacture=presetProperties.manufacturer;//Device manufacturer
var deviceModel=presetProperties.deviceModel;//Device model
var screenWidth=presetProperties.screenWidth;//Screen width
var screenHeight=presetProperties.screenHeight;//Screen height
var deviceId=presetProperties.deviceId;//Device ID
var zoneOffset=presetProperties.zoneOffset;//Timezone offset value
```

IP, country city information is generated by server parsing, client does not provide interface to get these properties
