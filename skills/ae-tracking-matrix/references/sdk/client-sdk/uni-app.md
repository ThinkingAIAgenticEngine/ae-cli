---
code: uniapp_sdk_installation
name: "uni-app"
wikiToken: GbYiwd3aTiL4m3k73D6cVoSknAb
parentWikiToken: EaDPwgIujiz2GKk0rWxct8ZNn4g
updateTime: 1764068108000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=uniapp_sdk_installation
---

# uni-app

::: tip Tip

Before integration, please read the pre-installation preparation first.

uni-app SDK supports platforms: iOS, Android, Web, WeChat Mini Program, Baidu Mini Program, ByteDance Mini Program, Alipay Mini Program, DingTalk Mini Program, Kuaishou Mini Program, QQ Mini Program, JD Mini Program, 360 Mini Program.

:::

**Latest Version:** 3.0.0 Download

**Update Time:** 2023-11-10

**Resource Download:** Source code

::: warning Note

This document applies to v3.0.0 and later versions. For historical versions, please refer to uni-app Integration Guide (V1), SDK Download (V1)

:::

### 1. SDK Integration

Download and unzip uni-app SDK

You can directly put `tdanalytics.uniapp.js` into your project and reference it in source code:

```
import TDAnalytics from './tdanalytics.uniapp.js'
```

### 2. Initialization

After importing TE SDK, you can use TDAnalytics in code:

```
var config = {
    appId: "YOUR_APPID",
    serverUrl: "YOUR_SERVER_URL",
    autoTrack: {
        appLaunch: true, // Auto-track ta_mp_launch
        appShow: true, // Auto-track ta_mp_show
        appHide: true, // Auto-track ta_mp_hide
    }
};
// Initialize
TDAnalytics.init(config)
```

TE configuration object parameter description:

- `appId`: Your project's APP ID, required, can be viewed on TE backend project management page
- `serverUrl`: Data reporting URL, required
- If you are using cloud service, enter: https://global-receiver-ta.thinkingdata.cn
- If you are using private deployment version, please confirm the reporting address with operations team
- `autoTrack`: Optional, indicates whether to enable auto-tracking feature. Each element represents the following auto-tracking events, all disabled by default:
- `appLaunch`: Auto-track mini program initialization
- `appShow`: Auto-track mini program start, or from background to foreground
- `appHide`: Auto-track mini program from foreground to background
  ::: warning Note

Before reporting data, please add the data transmission URL to the server domain's request list in the development settings of WeChat Public Platform or other platforms.

:::

### 3. Common Features

Before using common features, we recommend you first understand the user identification rules. SDK will generate random number as visitor ID by default and persistently store it locally. Before user login, visitor ID will be used as identity identification ID. Note: Visitor ID will change when user clears cache or changes device.

#### 3.1 Setting Account ID

When user logs in, you can call `login` to set user's account ID. TE platform will use account ID as identity identification ID, and the set account ID will be retained until `logout` is called. Multiple calls to `login` will overwrite the previous account ID.

```
// User's login unique identifier, this data corresponds to #account_id in reported data, now #account_id value is TA
TDAnalytics.login("TA");
```

<!-- unsupported block: 34 -->

**This method will not upload login event**

#### 3.2 Setting Common Event Properties

Common event properties refer to properties that every event will have. You can call `setSuperProperties` to set common event properties. We recommend you set common event properties before sending events. For some important properties, such as user's membership level, source channel, etc., these properties need to be set in every event. In this case, you can set these properties as common event properties.

```
var superProperties = {
    channel : "ta", //string
    age : 1,//number
    isSuccess : true,//boolean
    birthday :  new Date(),//object
    object : { key : "value" },//object
    object_arr : [ { key : "value" } ],//object array
    arr : [ "value" ]//array
};
TDAnalytics.setSuperProperties(superProperties);//set common event properties
```

Common event properties will be saved to cache and don't need to be called every time on startup. If `setSuperProperties` is called to upload a previously set common event property, it will overwrite the previous property.

- Key is the property name, string type, must start with a letter, contain numbers, letters and underscore "\_", maximum 50 characters, case insensitive, TE will convert to lowercase
- Value is the property value, supports string, number, boolean, time, object, object array, array
<!-- unsupported block: 34 -->

**Event property, user property requirements are consistent with common event properties**

#### 3.3 Sending Events

You can call `track` to upload events. We recommend you set event properties and sending conditions according to your previously prepared tracking document. Here is an example of user purchasing a product:

```
TDAnalytics.track({
    eventName: "product_buy", // Event name
    properties: {
        product_name: "product name"
    } //Event properties
});
```

Event name is string type, must start with a letter, can contain numbers, letters and underscore "\_", maximum 50 characters.

#### 3.4 Setting User Properties

For general user properties, you can call `userSet` to set them. Properties uploaded using this interface will overwrite previous property values. If the user property did not exist before, it will create a new user property. The type will be consistent with the uploaded property type. Here is an example of setting username:

```
//username is TA
TDAnalytics.userSet({
    properties: {
        username: "TA"
    }
});
//userName is TE
TDAnalytics.userSet({
    properties: {
        username: "TE"
    }
});
```

### 4. Best Practices

The following sample code includes all the above operations. We recommend using the following steps:

```
var config = {
  appId: "YOUR_APPID", // Project APP ID
  serverUrl: "YOUR_SERVER_URL", // Reporting address
  autoTrack: {
    appLaunch: true, // Auto-track ta_mp_launch
    appShow: true, // Auto-track ta_mg_show
    appHide: true, // Auto-track ta_mp_hide
  }
};
// Create TE instance
TDAnalytics.init(config);
// User's login unique identifier, this data corresponds to #account_id in reported data, now #account_id value is TA
TDAnalytics.login("TA");
//Set common event properties
var superProperties = {
    channel : "ta", //string
    age : 1,//number
    isSuccess : true,//boolean
    birthday :  new Date(),//object
    object : { key : "value" },//object
    object_arr : [ { key : "value" } ],//object array
    arr : [ "value" ]//array
};
TDAnalytics.setSuperProperties(superProperties);
//Send event
TDAnalytics.track({
    eventName: "product_buy", // Event name
    properties: {
        product_name: "product name"
    } //Event properties
);
//Set user properties
TDAnalytics.userSet({
    properties: {
        username: "TE"
    }
});
```

---

# Advanced Guide

### 1. Setting User ID

SDK instance will use random number as the default visitor ID for each user by default. This ID will be used as the identity identification ID when user is not logged in. Note that visitor ID will change when user clears cache or changes device.

#### 1.1 Setting Visitor ID

::: tip Tip

Generally, you don't need to customize visitor ID. Please make sure you understand the user identification rules before setting visitor ID.

:::

If your App has its own visitor ID management system for each user, you can call `identify` to set visitor ID:

```
// Set visitor ID to Thinker
TDAnalytics.setDistinctId("Thinker");
```

If you need to get the current visitor ID, you can call `getDistinctId`:

```
//Return visitor ID
let distinctId = TDAnalytics.getDistinctId();
```

<!-- unsupported block: 34 -->

If you need to set it, you must call this interface before initialization

#### 1.2 Setting Account ID

When user logs in, you can call `login` to set user's account ID. TE platform will use account ID as identity identification ID, and the set account ID will be retained until `logout` is called. Multiple calls to `login` will overwrite the previous account ID.

```
//User's login unique identifier, this data corresponds to #account_id in reported data, now #account_id value is TA
TDAnalytics.login("TA");
```

<!-- unsupported block: 34 -->

**This method will not upload login event**

#### 1.3 Clearing Account ID

After user logs out, you can call `logout` to clear account ID. Before the next `login` call, visitor ID will be used as identity identification ID.

```
// Remove "#account_id" from reported data, subsequent data will not have "#account_id"
TDAnalytics.logout();
```

We recommend you call `logout` at explicit logout events, such as when user performs account deregistration action, rather than when closing App.

<!-- unsupported block: 34 -->

**This method will not upload logout event**

### 2. Sending Events

After SDK initialization is completed, you can perform data tracking and collect user behavior information. Regular events can generally meet business scenario requirements. You can also use first-time, updatable events according to your actual business scenarios.

#### 2.1 Regular Events

You can call `track` to upload events. We recommend you set event properties and sending conditions according to your previously prepared document. Here is an example of user purchasing a product

```
TDAnalytics.track(
    eventName: "product_buy", // Event name
    properties: {
        product_name: "product name"
    } //Event properties
);
```

#### 2.2 First-time Events

First-time events refer to events that will only be recorded once for a certain device or other dimension ID. For example, in some scenarios, you may want to record an activation event on a certain device, you can use first-time events to report data.

```
TDAnalytics.trackFirst({
    eventName: "device_activation",
    properties: { key: "value" }
});
```

If you want to use other dimensions other than device to judge whether it's first-time, you can customize first_check_id for first-time events:

```
// Set user ID as first_check_id for first-time event, to collect user first-time activation event
TDAnalytics.trackFirst({
  eventName: "account_activation",
  firstCheckId: "TA",
  properties: { key: "value" }
});
```

<!-- unsupported block: 34 -->

Note: Since the verification of whether it's first-time is completed on the server side, first-time events will be delayed by 1 hour before being stored in database.

#### 2.3 Updatable Events

You can use updatable events to implement the need to modify event data in specific scenarios. Updatable events need to specify an ID that identifies the event, and pass it when creating the updatable event object. TE backend will determine the data to be updated based on event name and event ID.

```
// Example: report updatable event, assuming event name is UPDATABLE_EVENT
// After reporting, event property status is 3, price is 100
TDAnalytics.trackUpdate({
  eventName: "UPDATABLE_EVENT",
  properties: { status: 3, price: 100 },
  eventId: "test_event_id"
});

// After reporting, event property status is updated to 5, price remains unchanged
TDAnalytics.trackUpdate({
  eventName: "UPDATABLE_EVENT",
  properties: { status: 5 },
  eventId: "test_event_id"
});
```

#### 2.4 Overwritable Events

Overwritable events are similar to updatable events, the difference is that overwritable events will completely overwrite previous data with the latest data. From the effect, it's equivalent to deleting the previous data and storing the latest data. TE backend will determine the data to be updated based on event name and event ID.

```
// Example: report overwritable event, assuming event name is OVERWRITE_EVENT
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

#### 2.5 Common Event Properties

For some important properties, such as user's device ID, source channel, user status, etc., these properties need to be set in every event. In this case, you can set these properties as common properties, i.e. properties that every event will have. We recommend you set common properties before sending events.

Common properties include two types: event common properties and dynamic common properties. When event is reported, common properties will be inserted into data's properties. If common property conflicts with custom property set in event with same key value, property will be judged according to the following priority: `custom property>dynamic common event property>static common event property>preset property`.

##### 2.5.1 Static Common Event Properties

For some important properties, such as user's channel, nickname, ID, etc., these properties need to be set in every event. You can call `setSuperProperties` to set static common event properties. Static common event properties will take effect globally. When caching is enabled (default enabled), static common properties will be cached and will still take effect on next startup.

Static common property parameter is a JSON object, its format requirements are consistent with event properties.

```
// Set common event properties, all data events will have these properties
TDAnalytics.setSuperProperties({
     channel: "Channel Name",
     user_name: "Username"
});
```

Besides property setting, we also provide other APIs to operate static common event properties to meet daily business needs.

```
// Get static common event properties
var superProperties = TDAnalytics.getSuperProperties();
// Clear a static common event property, for example clear previously set 'channel' property, subsequent data will not have this property
TDAnalytics.unsetSuperProperty("channel");
// Clear all static common event properties
TDAnalytics.clearSuperProperties();
```

##### 2.5.2 Dynamic Common Event Properties

Set dynamic common property callback function via `setDynamicSuperProperties`, SDK will trigger callback function when event is reported and add returned JSON object to event properties. `setDynamicSuperProperties` parameter is a function, the function needs to return a JSON object.

```
// Set dynamic common properties, trigger callback function when event is reported, and add returned JSON object to event properties
TDAnalytics.setDynamicSuperProperties(function() {
    var d = new Date();
    d.setHours(10);
    return { date: d };
});
```

#### 2.6 Recording Event Duration

If you need to record the duration of an event, you can call `timeEvent` to start timing. Configure the event name you want to time. When you upload the event, `#duration` property will be automatically added to your event properties to represent the recorded duration, in seconds. Note that the same event name can only have one timing task.

```
//The following example completes the statistics of user staying time on a product page
TDAnalytics.timeEvent({
    eventName: "stay_shop"
});
/**do someting
    .......
**/
//User leaves product page, timing ends, "stay_shop" event will have #duration property representing event duration
TDAnalytics.track("stay_shop",{product_name:"product name"});
```

### 3. User Properties

TE platform supports the following user property setting APIs: `userSet`, `userSetOnce`, `userAdd`, `userUnset`, `userDel`, `userAppend`, `userUniqAppend`.

#### 3.1 userSet

For general user properties, you can call `userSet` to set them. Properties uploaded using this interface will overwrite previous property values. If the user property did not exist before, it will create a new user property. The type will be consistent with the uploaded property type. Here is an example of setting username:

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

If you want to upload a user property that only needs to be set once, you can call `userSetOnce` to set it. When the property already has a value, this information will be ignored. Here is an example of setting first payment time:

```
//first_payment_time is 2018-01-01 01:23:45.678
TDAnalytics.userSetOnce({
    properties: {
        first_payment_time: "2018-01-01 01:23:45.678"
    }
});
//first_payment_time remains 2018-01-01 01:23:45.678
TDAnalytics.userSetOnce({
    properties: {
        first_payment_time: "2018-12-31 01:23:45.678"
    }
});
```

#### 3.3 userAdd

When you want to upload numeric properties, you can call `userAdd` to perform cumulative operations on the property. If the property has not been set, it will be assigned 0 before calculation. Negative values can be passed, equivalent to subtraction operation.

```
//total_revenue is 30
TDAnalytics.userAdd({
    properties: {
        total_revenue: 30
    }
});
//total_revenue is 678
TDAnalytics.userAdd({
    properties: {
        total_revenue: 648
    }
});
```

#### 3.4 userUnset

When you want to clear a user's user property value, you can call `userUnset` to clear the specified property. If the property has not been created in the cluster, `userUnset` will **not** create the property.

```
// Clear the user's user property value named userPropertykey, i.e. set to NULL
TDAnalytics.userUnset({
    property: "userPropertykey"
});
```

#### 3.5 userDelete

If you want to delete a user, you can call `userDelete` to delete the user. You will no longer be able to query this user's user properties, but the events generated by this user can still be queried.

```
TDAnalytics.userDelete();
```

#### 3.6 userAppend

You can call `userAppend` to append elements to Array type user data.

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
//user_list property value is ["apple", "ball"]
TDAnalytics.userAppend({
    properties: {
        user_list: ["apple", "ball"]
    }
});
//user_list property value is ["apple","apple","ball","cube"]
TDAnalytics.userAppend({
    properties: {
        user_list: ["apple", "cube"]
    }
});
//user_list property value is ["apple", "ball","cube"]
TDAnalytics.userUniqAppend({
    properties: {
        user_list: ["apple", "cube"]
    }
});
```

### 4. Encryption Feature

SDK supports encryption feature. Client supports AES + RSA to encrypt data, then server decrypts the data. Encryption and decryption capabilities need to be coordinated between client and server. Please consult customer success personnel for details.

Set `enableEncrypt` property to true, and set default version number and public key.

```
var config = {
  appId: "YOUR_APP_ID", // Project APP ID
  serverUrl: "YOUR_SERVER_URL", // Reporting address
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

#### 5.1 Getting Device ID

You can call `getDeviceId()` to get device ID.

```
var deviceId = TDAnalytics.getDeviceId();
```

<!-- unsupported block: 34 -->

**Device ID will be saved in cache, user clears cache, device ID will be reset.**

#### 5.2 onCompelete Callback Function

::: tip Tip

This callback function is invalid for Android and iOS platforms.

:::

For `track, userSet, userSetOnce, userAdd, userDel` etc. interfaces, supports passing onComplete callback. Can directly pass onComplete after original parameter list, or use parameter object way. If using parameter object, parameter object must include onComplete, otherwise parameter error will occur. Using uploading event as example:

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

onComplete's parameter res is object type, has two properties code and msg.

res.code is int type, defined as:

- 0: Success
- -1: Data format incorrect
- -2: APP ID invalid
- -3: Network or server exception
  Debug mode defined as:

- 0: Success
- -1: Parameter or permission verification issue
- 1: Indicates field basic error, will give detailed error field and reason
- 2: Indicates entire error
- -3: Network or server exception
  res.msg is text explanation of res.code.

#### 5.3 Setting Event Cache Reporting

You can configure to enable event cache reporting when initializing.

```
// TE SDK configuration object
var config = {
  appId: "YOU-APP-ID", // Project APP ID
  serverUrl: "https://youserverurl.com", // Data reporting address
  enableBatch: true, // Whether to enable event cache batch reporting, true=enable, false=disable
  batchConfig: {
    size: 5, // Event cache reporting count
    interval: 5000 // Event cache reporting interval (milliseconds)
  }
};
// Initialize
TDAnalytics.init(config);
```

---

# Native Support

### 1. iOS Native Support

#### 1.1 Build iOS Project

- Create new iOS project
- Open `HBuilderX` - `Publish` - `Generate App Package Resources`
- Copy local package App resources to project directory's `Pandora -> apps` path

#### **1.2 Configure iOS Project**

- Add iOS project dependency files
  Use CocoaPods to install SDK

Create and edit Podfile content (if exists, edit directly):

Create Podfile, execute command in command line under project (.xcodeproj) file directory:

```
pod init
```

Edit Podfile content as follows:

```
pod 'TAGameEngine'
```

Execute installation command

```
pod install
```

### 2. Android Native Support

#### 1.1 Build Android Project

- Create new Android project
- Open `HBuilderX` - `Publish` - `Generate App Package Resources`
- Copy app resources to project assets->apps

#### **2.2 Configure Android Project**

- Add the following configuration dependencies in `Project` level `build.gradle` file

```
buildscript {
    repositories {
        jcenter()
        mavenCentral()
    }
}
```

- Add dependencies in `Module` project directory's `build.gradle` file:

```
implementation 'cn.thinkingdata.android:TAGameEngine:1.2.0'
implementation 'cn.thinkingdata.android:ThinkingAnalyticsSDK:3.0.0.1'
```

### 3. Enable Native Support

When initializing SDK, add `enableNative: true` in `config` to enable Native support.

```
// TA SDK configuration object
var config = {
  appId: "YOUR_APPID", // Project APP ID
  serverUrl: "YOUR_SERVER_URL", // Reporting address
  enableNative: true, // Allow calling Native code
  autoTrack: {
    appLaunch: true, // Auto-track ta_mp_launch
    appShow: true, // Auto-track ta_mp_show
    appHide: true, // Auto-track ta_mp_hide
    appInstall:true,//Auto-track install event (only valid for native)
    appCrash: true, // Auto-track crash event (only valid for native)
  }
};
// Initialize
TDAnalytics.init(config);
// Report a simple event, event name is test_event
//Send event
TDAnalytics.track({
    eventName: "product_buy", // Event name
    properties: {
        product_name: "product name"
    } //Event properties
);
```

---

# Multi-instance

This SDK supports multi-instance. We call the instance initialized through the method described above as main instance, and instance created through the method described in this section as sub-instance.

Multiple instances share device-related preset properties (including device ID), other properties are not shared, including:

- `#distinct_id` visitor ID
- `#account_id` account ID
- Common event properties, dynamic common properties
- `timeEvent` monitored events
  You can create sub-instance to report data to another project, or report data with another set of user ID.

```
//Initialization configuration 1
var config_1 = {
  appId: "app-id-1",
  serverUrl: "https://youserverurl.1.com"
};
TDAnalytics.init(config_1);

//Initialization configuration 2
var config_2 = {
  appId: "app-id-2",
  serverUrl: "https://youserverurl.2.com"
};
TDAnalytics.init(config_2);

//Report event to configuration 1 (no app-id, default report to configuration 1)
TDAnalytics.track({
    eventName: 'event_from_appid_1'
});
//Report event to configuration 1 (specify app-id-1)
TDAnalytics.track({
    eventName: 'event_from_appid_1'
}, 'app-id-1');
//Report event to configuration 2 (specify app-id-2)
TDAnalytics.track({
    eventName: 'event_from_appid_2'
}, 'app-id-2');
```

---

# Real-time Debugging

During SDK integration, you can view SDK logs in IDE console or use TE's Debug feature for real-time debugging.

### 1. Printing SDK Logs

You can set enableLog to true during SDK initialization to enable SDK log switch. After enabling, reported data will be printed in browser console.

```
var config = {
    appId: "xxx",
    serverUrl: "xxx",
    enableLog:true
};
```

### 2. Enabling Debug Mode

Enabling Debug mode requires two steps:

1. Enable Debug mode on client
   Here is sample code for enabling Debug mode on client:

```
/*
Set running mode to Debug mode
none: data will be cached and uploaded according to certain caching strategy, default is NORMAL mode; recommended for production environment
debug: data is uploaded one by one. When problems occur, it will alert users via logs and exceptions; not recommended for production environment
debugOnly: only validate data, will not store; not recommended for production environment
 */
var config = {
  appid: "YOUR_APPID",
  server_url: "YOUR_SERVER_URL",
  debugMode: "debug"
};
TDAnalytics.init(config);
```

2. Add Debug device in TE backend
   To avoid Debug mode going live in production environment, only specified devices can enable Debug mode. Debug mode can only be enabled when Debug mode is enabled on client and device ID is configured in TE backend's "Tracking Management" page's "Debug Data" section.

Device ID can be obtained through three ways:

- #device_id property in event data on TE platform
- Client log: Device DeviceId will be printed after SDK initialization completes
- Instance interface call: Get Device ID
<!-- unsupported block: 34 -->

Debug mode may affect data collection quality and App stability, only use for integration stage data verification, do not use in production environment.

---

# Auto-tracking

We provide auto-tracking feature. Just enable the events you need to auto-track in config when creating instance, SDK will automatically track mini program's behaviors. Currently the following events support auto-tracking:

Currently supported auto-tracking data:

1. Mini program initialization, user session only triggers once
1. Mini program start, including start and from background to foreground
1. Mini program enters background, and records this session's time (from start to entering background)
   Next will introduce each data collection method in detail

### 1. Enable Auto-tracking Events

In config, parameter `autoTrack` elements represent each auto-tracking event switch. Set to `true` to enable auto-tracking:

```
var config = {
  appid: "YOU-APP-ID",
  server_url: "https://youserverurl.com",
  autoTrack: {
    appLaunch: true, // Auto-track ta_mp_launch
    appShow: true, // Auto-track ta_mp_show
    appHide: true, // Auto-track ta_mp_hide
  }
};
```

- `appLaunch`: Auto-track mini program initialization
- `appShow`: Auto-track mini program start, or from background to foreground
- `appHide`: Auto-track mini program from foreground to background

### 2. Auto-tracking Events Details

#### 2.1 Mini Program Initialization

Mini program initialization will be triggered when mini program is first opened, or user kills process and reopens. Within process lifecycle, only triggers once. Detailed event introduction:

- Event name: ta_mp_launch
- Auto-tracking properties:
- `#scene`, scene value, taken from WeChat provided scene value
  Through mini program initialization event, you can calculate daily user usage count, average usage count per user, including grouping by scene value, viewing different scene values' user usage.

#### 2.2 Mini Program Start

Mini program start will be triggered when mini program is started, or mini program is brought back from background to foreground. Detailed event introduction:

- Event name: ta_mp_show
- Auto-tracking properties:
- `#scene`, scene value, taken from WeChat provided scene value
- `#url_path`, page path, mini program start displayed page path
  Mini program start is affected by foreground/background switching (more records), so it's not suitable for direct analysis. But can mark user's session in behavior path, can be used as user behavior path's initial behavior

#### 2.3 Mini Program Hide

Mini program hide will be triggered when mini program enters background, and records this session's duration. Detailed event introduction:

- Event name: ta_mp_hide
- Auto-tracking properties:
- `#scene`, scene value, taken from WeChat provided scene value
- `#duration`, numeric type, indicates this session's (ta_mp_show) duration until hide
  Mini program hide event records usage duration (in seconds), so you can directly calculate user total usage time and average time, can also divide by initialization count to calculate single usage duration.

---

# Preset Properties

### 1. Preset Properties for All Events

The following preset properties are preset properties that all events in uni-app mini program platform will have (including auto-tracking events)

**Property Name**

**Chinese Name**

**Property Type**

**Description**

#ip

IP Address

Text

User's IP address, TE will use this to get user's geographic location information

#country

Country

Text

User's country, generated from IP address

#country_code

Country Code

Text

User's country code (ISO 3166-1 alpha-2, i.e. two uppercase English letters), generated from IP address

#province

Province

Text

User's province, generated from IP address

#city

City

Text

User's city, generated from IP address

#device_model

Device Model

Text

User's device model, such as iPhone 8 etc.

#device_id

Device ID

Text

User's device ID, taken from UUID generated at initialization

#screen_height

Screen Height

Number

User's device screen height, such as 1920 etc.

#screen_width

Screen Width

Number

User's device screen height, such as 1080 etc.

#manufacturer

Device Manufacturer

Text

User's device manufacturer, such as Apple, vivo etc.

#os_version

OS Version

Text

iOS 11.2.2, Android 8.0.0 etc.

#os

OS

Text

Such as Android, iOS etc.

#network_type

Network Status

Text

Network status when uploading event, such as WIFI, 3G, 4G etc.

#lib

SDK Type

Text

SDK type you integrated, such as MP (Mini Program), MG (Mini Game) etc.

#lib_version

SDK Version

Text

SDK version you integrated

#scene

Scene Value

Number

Scene value passed when WeChat mini program starts

#mp_platform

Mini Program Platform

Text

Identifies application's platform

#zone_offset

Timezone Offset

Number

Data time offset hours relative to UTC time

#system_language

System Language

Text

User's device system language (ISO 639-1, i.e. two lowercase English letters), such as zh, en etc.

### 2. Preset Properties for Auto-tracking Events

The following preset properties are unique preset properties in each auto-tracking event

- Mini program start (ta_mp_show) preset properties
  **Property Name**

**Chinese Name**

**Property Type**

**Description**

#url_path

Page Path

Text

Mini program start displayed page path

- Mini program hide (ta_mp_hide) preset properties
  **Property Name**

**Chinese Name**

**Property Type**

**Description**

#duration

Event Duration

Number

Indicates this session `ta_mp_show` to hide `ta_mp_hide` duration, unit is seconds

### 3. Getting Preset Properties

When server-side tracking needs some preset properties from App side, you can use this method to get client side preset properties and then pass to server.

```
//Get property object
var presetProperties=TDAnalytics.getPresetProperties();
//Generate event preset properties
var properties=presetProperties.toEventPresetProperties();
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
//Get a specific preset property
var os=presetProperties.os;//os type, such as Android
var osVersion=presetProperties.osVersion;//system version number
var networkType=presetProperties.networkType;//network type
var manufacture=presetProperties.manufacture;//device manufacturer
var deviceModel=presetProperties.deviceModel;//device model
var screenWidth=presetProperties.screenWidth;//screen width
var screenHeight=presetProperties.screenHeight;//screen height
var deviceId=presetProperties.deviceId;//device ID
var zoneOffset=presetProperties.zoneOffset;//timezone offset value
```

<!-- unsupported block: 34 -->

IP, country and city information are generated from server-side parsing, client does not provide interface to get these properties
