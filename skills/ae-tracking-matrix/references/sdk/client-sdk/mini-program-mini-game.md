---
code: mp_sdk_installation
name: "Mini Program & Mini Game"
wikiToken: HBNXwSFSFiWQGWkt0ynccCeIn9g
parentWikiToken: FTcTwinIOi3OiRkK4MPc2Ex7neg
updateTime: 1770106195000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=mp_sdk_installation
---

# Mini Program & Mini Game

::: tip Tip

Before integration, please read the pre-installation preparation.

If you use game engine to develop mini games, please read integration solutions for common game engines: Egret White Egret Engine, LayaAir, CocosCreator.

:::

**Latest Version:** v3.4.4 Download (Mini Program) Download (Mini Game)

**Update Time:** 2026-02-03

**Resource Download:** Source code

::: warning Note

This document applies to v3.0.0 and later versions. For historical versions, please refer to Mini Program & Mini Game Integration Guide (V2), Mini Program SDK Download (v2.2.4), Mini Game SDK Download (v2.2.4)

:::

Mini Program & Mini Game SDK provides a set of standard API interfaces for common mini program platforms, quick apps, and mini game platforms to implement data reporting functionality. Currently, supported platforms and corresponding files are as follows:

**Mini Programs:**

- WeChat Mini Program: tdanalytics.wx.min.js
- Baidu Mini Program: tdanalytics.swan.min.js
- Douyin Mini Program: tdanalytics.tt.min.js
- Alipay Mini Program: tdanalytics.my.min.js
- DingTalk Mini Program: tdanalytics.dd.min.js
- Kuaishou Mini Program: tdanalytics.ks.min.js
- Quick App: tdanalytics.quick.min.js
- QQ Mini Program: tdanalytics.qq.min.js
- JD Mini Program: tdanalytics.jd.min.js
- 360 Mini Program: tdanalytics.qh.min.js
  **Mini Games:**

- WeChat Mini Game: tdanalytics.mg.wx.min.js
- QQ Mini Game: tdanalytics.mg.qq.min.js
- Douyin Mini Game: tdanalytics.mg.tt.min.js
- Baidu Mini Game: tdanalytics.mg.swan.min.js
- Bilibili Mini Game: tdanalytics.mg.bl.min.js
- Huawei Quick Game: tdanalytics.mg.huawei.min.js
- OPPO Quick Game: tdanalytics.mg.oppo.min.js
- VIVO Quick Game: tdanalytics.mg.vivo.min.js
- Meizu Quick Game: tdanalytics.mg.mz.min.js
- Xiaomi Quick Game: tdanalytics.mg.xiaomi.min.js
- Taobao Mini Game: tdanalytics.mg.tb.min.js
- Kuaishou Mini Game: tdanalytics.mg.ks.min.js
- Alipay Mini Game: tdanalytics.mg.my.min.js
- Meituan Mini Game: tdanalytics.mg.mt.min.js
- H5 Mini Game
- UC Mini Game
- Facebook Mini Game

### 1. Integrate SDK

:::: el-tabs

::: el-tab-pane label=Mini Program

Download Mini Program SDK, import corresponding SDK file in app.js (example with WeChat Mini Program):

```
var TDAnalytics = require("./tdanalytics.wx.min.js");
```

After importing SDK, you can create SDK instance and start reporting data:

```
// TE SDK configuration object
var config = {
  appId: "YOU-APP-ID", // Project APP ID
  serverUrl: "https://youserverurl.com", // Data reporting address
  autoTrack: {
    appLaunch: true, // Auto track ta_mp_launch
    appShow: true, // Auto track ta_mp_show
    appHide: true, // Auto track ta_mp_hide
    pageShow: true, // Auto track ta_mp_view
    pageShare: true // Auto track ta_mp_share
  }
};

// Initialize
TDAnalytics.init(config);
```

TE configuration object parameter description:

- `appId`: Your project's APP ID, required, can be viewed in TE backend project management page
- `serverUrl`: Data reporting URL, required
- If you are using cloud service, enter: https://global-receiver-ta.thinkingdata.cn
- If you are using privately deployed version, please confirm reporting address with operations team
- `enableBatch`: Data cached locally first, then batch sent, default is false
- `autoTrack`: Optional, indicates whether to enable auto tracking function. Each element represents the following auto tracking events, default all disabled:
- `appLaunch`: Auto track mini program initialization, triggers once per session
- `appShow`: Auto track mini program startup, or from background to foreground
- `appHide`: Auto track mini program from foreground to background, and record this visit duration (from startup to background)
- `pageShow`: Auto track mini program page show or switch to foreground, record page path and referrer path
- `pageShare`: Auto track mini program forward/share, record the page when forwarding
  **For details about auto tracking events, please refer to Auto Tracking Events section**

:::

::: el-tab-pane label=Quick App

Download Mini Program SDK, import corresponding SDK in app.ux file `tdanalytics.quick.min.js`:

```
var TDAnalytics = require("./tdanalytics.quick.min.js");
```

After that, you can create SDK instance and start reporting data:

```
// TE SDK configuration object
var config = {
  appId: "YOU-APP-ID", // Project APP ID
  serverUrl: "https://youserverurl.com", // Data reporting address
  persistenceComplete(ta) {
    // Callback when async storage initialization completes, can do some cache related delete operations
    //TDAnalytics.clearSuperProperties();
  }
};

// Initialize
TDAnalytics.init(config);
```

TE configuration object parameter description:

- `appId`: Your project's APP ID, required, can be viewed in TE backend project management page
- `serverUrl`: Data reporting URL, required
- If you are using cloud service, enter: https://global-receiver-ta.thinkingdata.cn
- If you are using privately deployed version, please confirm reporting address with operations team
- `persistenceComplete`: Optional. Quick app cache is read asynchronously, so before cache reading completes, query and delete operations on cache related fields will have unexpected results. To ensure cache query and delete during initialization phase can execute correctly, relevant operations need to be completed in persistenceComplete callback. Cache related data includes: user ID (#account_id and #distinct_id), device ID, common event properties etc.

**Further explanation of persistenceComplete:**

For SDK state issues caused by async calls, we set Ready state for each instance. When the following conditions are **all met**, we consider the instance is Ready:

- System info obtained: We get system info by calling platform provided `getSystemInfo()`
- Cache info read complete: Quick app reads cache asynchronously
- User actively called `TDAnalytics.init()`
  When instance has not entered Ready state, we will cache all reported data. After instance initialization completes, cache will be cleared to ensure correct state.

During different stages of async cache reading, please pay attention to the following notes:

1. When cache info has not been read, you can set common properties and login account.
1. When cache reading completes, we will use new value to override previous value in cache.
1. **Before cache reading completes, if you call functions that involve deleting or reading previous cache info, you cannot read or delete actual cache data.**
   For the above point 3, you can ensure call order by passing callback function (i.e. persistenceComplete) during initialization.

<!-- unsupported block: 34 -->

Note: Quick app does not support auto tracking events

:::

::: el-tab-pane label=Mini Game

Download Mini Game SDK, import corresponding SDK file in game.js (example with WeChat Mini Game):

```
var TDAnalytics = require("./tdanalytics.mg.wx.min.js");
```

```
// TE SDK configuration object
var config = {
  appId: "YOUR_APPID", // Project APP ID
  serverUrl: "YOUR_SERVER_URL", // Reporting address
  autoTrack: {
    appShow: true, // Auto track ta_mg_show
    appHide: true // Auto track ta_mg_hide
  }
};
// Initialize
TDAnalytics.init(config);
```

TE configuration object parameter description:

- `appId`: Your project's APP ID, required, can be viewed in TE backend project management page
- `serverUrl`: Data reporting URL, required
- If you are using cloud service, enter: https://global-receiver-ta.thinkingdata.cn
- If you are using privately deployed version, please confirm reporting address with operations team
- `autoTrack`: Optional, indicates whether to enable auto tracking function. Each element represents the following auto tracking events, default all disabled:
- `appShow`: Auto track mini game startup, or from background to foreground
- `appHide`: Auto track mini game from foreground to background, and record this visit duration (from startup to background)
  :::

::::

::: warning Note

Before reporting data, please first add the data transfer URL to the server domain request list in the development settings of WeChat Public Platform or other platforms.

:::

### 2. Common Features

Before using common features, we recommend you first understand the user identification rules. SDK generates random number as visitor ID by default and persists visitor ID locally. Before user logs in, visitor ID is used as identification ID. Note: Visitor ID will change when user clears cache or changes device.

#### 2.1 Set Account ID

When user logs in, you can call `login` to set user's account ID. TE platform will use account ID as identification ID. The set account ID will be kept until `logout` is called. Multiple calls to `login` will override previous account ID.

```
// User's unique login identifier, this data corresponds to #account_id in reported data, at this time #account_id value is TA
TDAnalytics.login("TA");
```

<!-- unsupported block: 34 -->

**This method will not upload login event**

#### 2.2 Set Common Event Properties

Common event properties refer to properties that every event will have. You can call `setSuperProperties` to set common event properties. We recommend you set common event properties before sending events. For some important properties, such as user's membership level, source channel, etc., these properties need to be set in every event. You can set these properties as common event properties.

```
var superProperties = {
    channel : "ta",
    age : 1,
    isSuccess : true,
    birthday :  new Date(),
    object : { key : "value" },
    object_arr : [ { key : "value" } ],
    arr : [ "value" ]
};
TDAnalytics.setSuperProperties(superProperties);
```

Common event properties will be saved to cache, no need to call every time on startup. If you call `setSuperProperties` to upload a previously set common event property, it will override the previous property.

- Key is the property name, string type, must start with letter, contains numbers, letters and underscore "\_", maximum length is 50 characters, case insensitive, TE will convert to lowercase letters
- Value is the property value, supports string, number, boolean, date, object, object array, array
<!-- unsupported block: 34 -->

**Event properties and user properties requirements are the same as common event properties**

#### 2.3 Send Event

You can call `track` to upload event. We recommend you set event properties and send event conditions based on previously documented tracking plan. Here is an example of user purchasing a product:

```
TDAnalytics.track({
    eventName: "product_buy", // Event name
    properties: {
        product_name: "product name"
    } // Event properties
});
```

Event name is string type, must start with letter, can contain numbers, letters and underscore "\_", maximum length is 50 characters.

#### 2.4 Set User Properties

For general user properties, you can call `userSet` to set. Properties uploaded using this interface will override original property values. If the user property did not exist before, it will create a new user property with the same type as the uploaded property. Here is an example of setting username:

```
// At this time username is TA
TDAnalytics.userSet({
    properties: {
        username: "TA"
    }
});
// At this time username is TE
TDAnalytics.userSet({
    properties: {
        username: "TE"
    }
});
```

### 3. Best Practices

The following example code includes all operations above. We recommend using it as follows

:::: el-tabs

::: el-tab-pane label=Mini Program

Download Mini Program SDK, after importing SDK, you can create SDK instance and start reporting data:

```
var TDAnalytics = require("./tdanalytics.wx.min.js");
var config = {
  appId: "YOU-APP-ID", // Project APP ID
  serverUrl: "https://youserverurl.com", // Data reporting address
  autoTrack: {
    appLaunch: true, // Auto track ta_mp_launch
    appShow: true, // Auto track ta_mp_show
    appHide: true, // Auto track ta_mp_hide
    pageShow: true, // Auto track ta_mp_view
    pageShare: true // Auto track ta_mp_share
  }
};
// Initialize
TDAnalytics.init(config);
// User's unique login identifier, this data corresponds to #account_id in reported data, at this time #account_id value is TA
TDAnalytics.login("TA");
// Set common event properties
var superProperties = {
    channel : "ta", // String
    age : 1,// Number
    isSuccess : true,// Boolean
    birthday :  new Date(),// Object
    object : { key : "value" },// Object
    object_arr : [ { key : "value" } ],// Object array
    arr : [ "value" ]// Array
};
TDAnalytics.setSuperProperties(superProperties);
// Send event
TDAnalytics.track({
    eventName: "product_buy", // Event name
    properties: {
        product_name: "product name"
    } // Event properties
});
// Set user properties
TDAnalytics.userSet({
    properties: {
        username: "TE"
    }
});
```

:::

::: el-tab-pane label=Quick App

Download Mini Program SDK, import corresponding SDK in app.ux (`tdanalytics.quick.min.js`)

You can create SDK instance and start reporting data:

```
var TDAnalytics = require("./tdanalytics.quick.min.js");
// TE SDK configuration object
var config = {
  appId: "YOU-APP-ID", // Project APP ID
  serverUrl: "https://youserverurl.com", // Data reporting address
  persistenceComplete(ta) {
    // Callback when async storage initialization completes, can do some cache related delete operations
    //TDAnalytics.clearSuperProperties();
  }
};
// Initialize
TDAnalytics.init(config);
// User's unique login identifier, this data corresponds to #account_id in reported data, at this time #account_id value is TA
TDAnalytics.login("TA");
// Set common event properties
var superProperties = {
    channel : "ta", // String
    age : 1,// Number
    isSuccess : true,// Boolean
    birthday :  new Date(),// Object
    object : { key : "value" },// Object
    object_arr : [ { key : "value" } ],// Object array
    arr : [ "value" ]// Array
};
TDAnalytics.setSuperProperties(superProperties);
// Send event
TDAnalytics.track({
    eventName: "product_buy", // Event name
    properties: {
        product_name: "product name"
    } // Event properties
});
// Set user properties
TDAnalytics.userSet({
    properties: {
        username: "TE"
    }
});

```

:::

::: el-tab-pane label=Mini Game

Download Mini Game SDK, import corresponding SDK file in game.js (example with WeChat Mini Game). After importing SDK, you can create SDK instance and start reporting data:

```
var TDAnalytics = require("./tdanalytics.mg.wx.min.js");
var config = {
  appId: "YOUR_APPID", // Project APP ID
  serverUrl: "YOUR_SERVER_URL", // Reporting address
  autoTrack: {
    appShow: true, // Auto track ta_mg_show
    appHide: true // Auto track ta_mg_hide
  }
};
// Initialize
TDAnalytics.init(config);
// User's unique login identifier, this data corresponds to #account_id in reported data, at this time #account_id value is TA
TDAnalytics.login("TA");
// Set common event properties
var superProperties = {
    channel : "ta", // String
    age : 1,// Number
    isSuccess : true,// Boolean
    birthday :  new Date(),// Object
    object : { key : "value" },// Object
    object_arr : [ { key : "value" } ],// Object array
    arr : [ "value" ]// Array
};
TDAnalytics.setSuperProperties(superProperties);
// Send event
TDAnalytics.track(
    eventName: "product_buy", // Event name
    properties: {
        product_name: "product name"
    } // Event properties
);
// Set user properties
TDAnalytics.userSet({
    properties: {
        username: "TE"
    }
});

```

:::

::::

---

# Advanced Guide

### 1. Set User ID

SDK instance uses random number as default visitor ID for each user by default. This ID will be used as identification ID when user is not logged in. Note that visitor ID will change when user clears cache or changes device.

#### 1.1 Set Visitor ID

::: tip Tip

Generally, you don't need to customize visitor ID. Please ensure you understand user identification rules before setting visitor ID.

:::

If your App has its own visitor ID management system for each user, you can call `setDistinctId` to set visitor ID:

```
// Set visitor ID to Thinker
TDAnalytics.setDistinctId("Thinker");
```

If you need to get current visitor ID, you can call `getDistinctId`:

```
// Return visitor ID
let distinctId = TDAnalytics.getDistinctId();
```

#### 1.2 Set Account ID

When user logs in, you can call `login` to set user's account ID. TE platform will use account ID as identification ID. The set account ID will be kept until `logout` is called. Multiple calls to `login` will override previous account ID.

```
// User's unique login identifier, this data corresponds to #account_id in reported data, at this time #account_id value is TA
TDAnalytics.login("TA");
```

<!-- unsupported block: 34 -->

**This method will not upload login event**

#### 1.3 Clear Account ID

After user performs logout behavior, you can call `logout` to clear account ID. Before next call to `login`, visitor ID will be used as identification ID.

```
// Remove #account_id from reported data, subsequent data will not have "#account_id"
TDAnalytics.logout();
```

We recommend you call `logout` during explicit logout event, such as when user performs account deregistration, rather than when closing App.

<!-- unsupported block: 34 -->

**This method will not upload logout event**

### 2. Send Event

After SDK initialization is complete, you can perform data tracking to collect user behavior information. Generally, normal events can meet business scenario requirements. You can also use first-time, updatable events according to your actual business scenarios.

#### 2.1 Normal Event

You can call `track` to upload event. We recommend you set event properties and send event conditions based on previously documented tracking plan. Here is an example of user purchasing a product

```
TDAnalytics.track({
    eventName: "product_buy", // Event name
    properties: {
        product_name: "product name"
    } // Event properties
});
```

#### 2.2 First-time Event

First-time event refers to event that will only be recorded once for a certain device or other dimension ID. For example, in some scenarios, you may want to record activation event on a certain device, then you can use first-time event to report data.

```
TDAnalytics.trackFirst({
    eventName: "device_activation",
    properties: { key: "value" }
});
```

If you want to judge whether it's first time based on other dimensions besides device, you can customize first_check_id for first-time event:

```
// Set user ID as first_check_id for first-time event, to implement user first activation event collection
TDAnalytics.trackFirst({
  eventName: "account_activation",
  firstCheckId: "TA",
  properties: { key: "value" }
});
```

<!-- unsupported block: 34 -->

Note: Since validation of whether it's first time is done on server side, first-time events are delayed by 1 hour before being stored in database by default.

#### 2.3 Updatable Event

You can use updatable event to implement requirements for modifying event data in specific scenarios. Updatable event needs to specify the ID that identifies the event and pass it when creating updatable event object. TE backend will determine the data to be updated based on event name and event ID.

```
// Example: Report updatable event, assuming event name is UPDATABLE_EVENT
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

Overwritable event is similar to updatable event, the difference is that overwritable event will completely overwrite historical data with latest data. From the effect, it's equivalent to deleting previous data and storing latest data. TE backend will determine the data to be updated based on event name and event ID.

```
// Example: Report overwritable event, assuming event name is OVERWRITE_EVENT
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

For some important properties, such as user's device ID, source channel, user status, etc., these properties need to be set in every event. You can set these properties as common properties, i.e. properties that every event will have. We recommend you set common properties before sending events.

Common properties include two types: event common properties and dynamic common properties. When event is reported, common properties will be inserted into data's properties. If common properties have the same key as custom properties set in event, the property value will be determined according to the following priority: `Custom Properties > Dynamic Common Properties > Static Common Properties > Preset Properties`

##### 2.5.1 Static Common Event Properties

For some important properties, such as user's channel, nickname, ID, etc., these properties need to be set in every event. You can call `setSuperProperties` to set static common event properties. Static common event properties will be effective globally. When cache is enabled (default on), static common properties will be cached and still effective on next startup.

The parameter for static common properties is a JSON object, and its format requirements are the same as event properties.

```
// Set common event properties, all data events will have these properties
TDAnalytics.setSuperProperties({
     channel: "channel name",
     user_name: "username"
});
```

Besides property setting, we also provide other APIs to manipulate static common event properties to meet daily business needs.

```
// Get static common event properties
var superProperties = TDAnalytics.getSuperProperties();
// Clear a static common event property, for example clear previously set 'channel' property, subsequent data will not have this property
TDAnalytics.unsetSuperProperty("channel");
// Clear all static common event properties
TDAnalytics.clearSuperProperties();
```

##### 2.5.2 Dynamic Common Event Properties

Through `setDynamicSuperProperties` to set callback function for dynamic common properties. SDK will trigger callback function when event is reported and add returned JSON object to event properties. `setDynamicSuperProperties` parameter is a function that needs to return a JSON object.

```
// Set dynamic common properties, trigger callback function when event is reported, and add returned JSON object to event properties
TDAnalytics.setDynamicSuperProperties(function() {
    var d = new Date();
    d.setHours(10);
    return { date: d };
});
```

#### 2.6 Record Event Duration

If you need to record the duration of an event, you can call `timeEvent` to start timing. Configure the event name you want to time. When you upload the event, `#duration` property will be automatically added to your event properties to represent the recorded duration, in seconds. Note that the same event name can only have one timing task.

```
// The following example completes statistics of user's stay time on a product page
TDAnalytics.timeEvent({
    eventName: "stay_shop"
});
/**do someting
    .......
**/
// User leaves product page, timing ends, "stay_shop" event will have #duration property representing event duration
TDAnalytics.track({
    eventName: "stay_shop",
    properties: {
        product_name: "product name"
    }
});
```

### 3. User Properties

TE platform supported user property setting APIs are: `userSet`, `userSetOnce`, `userAdd`, `userUnset`, `userDelete`, `userAppend`, `userUniqAppend`.

#### 3.1 userSet

For general user properties, you can call `userSet` to set. Properties uploaded using this interface will override original property values. If the user property did not exist before, it will create a new user property with the same type as the uploaded property. Here is an example of setting username:

```
// username is TA
TDAnalytics.userSet({
    properties: {
        username: "TA"
    }
});
// username is TE
TDAnalytics.userSet({
    properties: {
        username: "TE"
    }
});
```

#### 3.2 userSetOnce

If the user property you want to upload only needs to be set once, you can call `userSetOnce` to set. When the property already has a value, this information will be ignored. Here is an example of setting first payment time:

```
// first_payment_time is 2018-01-01 01:23:45.678
TDAnalytics.userSetOnce({
    properties: {
        first_payment_time: "2018-01-01 01:23:45.678"
    }
});
// first_payment_time is still 2018-01-01 01:23:45.678
TDAnalytics.userSetOnce({
    properties: {
        first_payment_time: "2018-12-31 01:23:45.678"
    }
});
```

#### 3.3 userAdd

When you want to upload numeric properties, you can call `userAdd` to perform accumulation operation on that property. If the property has not been set, it will assign 0 then perform calculation. If negative value is passed, it's equivalent to subtraction operation.

```
// At this time total_revenue is 30
TDAnalytics.userAdd({
    properties: {
        total_revenue: 30
    }
});
// At this time total_revenue is 678
TDAnalytics.userAdd({
    properties: {
        total_revenue: 648
    }
});
```

#### 3.4 userUnset

When you want to clear user's user property value, you can call `userUnset` to clear specified property. If the property has not been created in the cluster, `userUnset` **will not** create that property

```
// Clear the user property value named userPropertykey, set to NULL
TDAnalytics.userUnset({
    property: "userPropertykey"
});
```

#### 3.5 userDelete

If you want to delete a user, you can call `userDelete` to delete that user. You will no longer be able to query that user's user properties, but events generated by that user can still be queried.

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

Since v1.6.0, you can call `userUniqAppend` to append unique elements to Array (List) type user data. Calling `userUniqAppend` interface will deduplicate appended user properties. `userAppend` interface does not deduplicate, user properties may have duplicates.

```
// At this time user_list property value is ["apple", "ball"]
TDAnalytics.userAppend({
    properties: {
        user_list: ["apple", "ball"]
    }
});
// At this time user_list property value is ["apple", "apple", "ball", "cube"]
TDAnalytics.userAppend({
    properties: {
        user_list: ["apple", "cube"]
    }
});
// At this time user_list property value is ["apple", "ball", "cube"]
TDAnalytics.userUniqAppend({
    properties: {
        user_list: ["apple", "cube"]
    }
});
```

### 4. Encryption Feature

Since v2.1.0, SDK supports AES+RSA encrypted data. Data encryption feature requires cooperation between client and server. For specific usage, please consult customer success personnel.

Set `enableEncrypt` property to true, and set default version number and public key.

```
var config = {
  appId: "YOUR_APP_ID", // Project APP ID
  serverUrl: "YOUR_SERVER_URL", // Reporting address
  enableEncrypt: true, // Enable data transfer encryption
  secretKey: {
    publicKey:'YOUR_PUBLIC_KEY', // Encryption public key
    version:0 // Key version number
   }
};
// Initialize
TDAnalytics.init(config);
```

To support data encryption, you need to additionally import crypto-js and jsencrypt (example with WeChat Mini Program)

- npm import crypto-js
- Download jsencrypt.min.js and import into project
- Execute the following code before SDK initialization:

```
const cryptojs = require('crypto-js');
const jsencrypt = require('./jsencrypt.min')
Object.defineProperty(Object.prototype, "CryptoJS", { value: cryptojs });
Object.defineProperty(Object.prototype, "JSEncrypt", { value: jsencrypt });
```

### 5. Other Features

#### 5.1 Get Device ID

You can call `getDeviceId()` to get device ID.

```
var deviceId = TDAnalytics.getDeviceId();
```

<!-- unsupported block: 34 -->

**Device ID will be saved in cache. If user clears cache, device ID will be reset.**

#### 5.2 onComplete Callback Function

For interfaces like `track, userSet, userSetOnce, userAdd, userDel`, onComplete callback is supported. You can pass onComplete directly after original parameter list, or use parameter object method. If using parameter object, the parameter object must include onComplete, otherwise parameter error will occur. Example with uploading event:

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

res.code is int type, defined as follows:

- 0: Success
- -1: Data format incorrect
- -2: APP ID invalid
- -3: Network or server exception
  Debug mode defined as follows:

- 0: Success
- -1: Parameter or permission validation issue
- 1: Indicates basic field error, will give detailed error field and reason
- 2: Indicates entire record error
- -3: Network or server exception
  res.msg is text explanation of res.code.

#### 5.3 Set Event Cache Reporting

Since v2.2.0, you can configure to enable event cache reporting during initialization.

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

#### 5.4 Set Default Timezone

By default, SDK uses local time at interface call time as event occurrence time for reporting. Since v3.0.3, you can also set default timezone during initialization, so all events will align event time according to the timezone you set:

```
var config = {
  appId: "YOU-APP-ID", // Project APP ID
  serverUrl: "https://youserverurl.com", // Data reporting address
  zoneOffset:8
};
```

<!-- unsupported block: 34 -->

Note: Aligning event time with specified timezone will lose device local timezone information. If you need to preserve device local timezone information, you currently need to add related properties to events yourself.

### 6. Channel SDK Compatibility

#### 6.1 Tencent Advertising

##### 6.1.1 Solution Overview

After integrating TDAnalytics SDK, you don't need to additionally integrate Tencent Advertising SDK. Once you complete TDAnalytics initialization method, the system will automatically trigger Tencent Advertising SDK initialization. When you report key events like registration, payment, etc., the system will automatically report these event information to Tencent Advertising according to your configuration.

##### 6.1.2 Integration Process

1. Download Tencent Advertising SDK, currently using version 1.5.4, other versions can also be used.
   Place dn-sdk-minigame.cjs.js file in the same directory as TDAnalytics SDK.

1. Initialize
<!-- unsupported block: 19 -->

TDAnalytics SDK version needs >= 3.0.4

```
TDAnalytics.init({
    appId: 'AppId',
    serverUrl: 'ServerUrl',
    tgaInitParams: {
        user_action_set_id: 100001,// Data source ID, number, required
        secret_key: '5e853xxxxxxd57a690xxxxxxxxxx',// Encryption key, required
        appid: 'wx123xyz123xyz123x',// WeChat Mini Game APPID, starts with wx, required
    },
    reportingToTencentSdk: 2,//1 Only report to Tencent 2 Report to Tencent and TE 3 Only report to TE
    debugMode: 'debug'// If debug mode, will print Tencent Advertising SDK local debug logs
})
```

1. Set User ID

- setOpenId
  openid is usually obtained asynchronously by calling backend interface (get openid method). Please call _ sdk.setOpenId() _ method to set after obtaining openid. Only one of openid and unionid can be set, openid is preferred.

```
TDAnalytics.init({
    appId: 'AppId',
    serverUrl: 'ServerUrl',
    tgaInitParams: {
        user_action_set_id: 100001,// Data source ID, number, required
        secret_key: '5e853xxxxxxd57a690xxxxxxxxxx',// Encryption key, required
        appid: 'wx123xyz123xyz123x',// WeChat Mini Game APPID, starts with wx, required
        openId:'wx_openid'// WeChat platform OpenId
    },
    reportingToTencentSdk: 2,//1 Only report to Tencent 2 Report to Tencent and TE 3 Only report to TE
    debugMode: 'debug'// If debug mode, will print Tencent Advertising SDK local debug logs
})
```

- setUnionId
  unionid is usually obtained asynchronously by calling backend interface (get unionid method). Please call _ sdk.setUnionId() _ method to set after obtaining unionid. Use this method to set unionid only when openid is not available.

```
TDAnalytics.init({
    appId: 'AppId',
    serverUrl: 'ServerUrl',
    tgaInitParams: {
        user_action_set_id: 100001,// Data source ID, number, required
        secret_key: '5e853xxxxxxd57a690xxxxxxxxxx',// Encryption key, required
        appid: 'wx123xyz123xyz123x',// WeChat Mini Game APPID, starts with wx, required
        unionId:'wx_unionId'// WeChat platform unionId
    },
    reportingToTencentSdk: 2,//1 Only report to Tencent 2 Report to Tencent and TE 3 Only report to TE
    debugMode: 'debug'// If debug mode, will print Tencent Advertising SDK local debug logs
})
```

1. Report Behavior

```
TDAnalytics.track({
    eventName: "product_buy", // Event name
    properties: {
        product_name: "product name"
    } // Event properties
});
```

For the following specific events, need to report with specified event name

Event

Event Name

Event Properties (must include the key)

##### Mini Game Startup

##### START_APP

None

##### Payment

##### PURCHASE

{

        value: 600

}

##### Registration

##### REGISTER

##### Silent Wake

##### RE_ACTIVE

{

        backFlowDay: 30

}

##### Favorite Mini Game

##### ADD_TO_WISHLIST

{

        type: 'default',

}

##### Share Mini Game

##### SHARE

{

        target: 'APP_MESSAGE'

}

##### Create Character

##### CREATE_ROL

{

        name: 'SuperMan'

}

##### Complete Tutorial

##### TUTORIAL_FINISH

None

##### Game Level Up

##### UPDATE_LEVEL

{

        level: 2,

        power: 85,

}

##### View Mall Page

##### VIEW_CONTENT

{

// Key scene visit: Mall

        item: 'Mall',

}

##### View Game Activity

##### VIEW_CONTENT

{

// Key scene visit: Activity

item: 'Activity',

}

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

# Multi Instance

Since v1.3.0, this SDK supports multi instances. We call the instance ta that is initialized through the method described above as main instance, and instances created through the method described in this section as sub instances.

Multiple instances share device related preset properties (including device ID), other properties are not shared, including:

- `#distinct_id` visitor ID
- `#account_id` account ID
- Common event properties, dynamic common properties
- `timeEvent` monitored events
  You can create sub instance to report data to another project, or report data with another set of user IDs.

```
// Initialize configuration 1
var config_1 = {
  appId: "app-id-1",
  serverUrl: "https://youserverurl.1.com"
};
TDAnalytics.init(config_1);

// Initialize configuration 2
var config_2 = {
  appId: "app-id-2",
  serverUrl: "https://youserverurl.2.com"
};
TDAnalytics.init(config_2);

// Report event to configuration 1 (no app-id passed, default report to configuration 1)
TDAnalytics.track({
    eventName: 'event_from_appid_1'
});
// Report event to configuration 1 (specify app-id-1)
TDAnalytics.track({
    eventName: 'event_from_appid_1'
}, 'app-id-1');
// Report event to configuration 2 (specify app-id-2)
TDAnalytics.track({
    eventName: 'event_from_appid_2'
}, 'app-id-2');
```

If you need each instance's persistence data to be stored separately, you can set `persistenceName` in config to customize storage path

```
var config = {
  appId: "app-id-1",
  serverUrl: "https://youserverurl.1.com",
  persistenceName:"persistence_name" // Can be customized, needs to be different for each instance
};
TDAnalytics.init(config);
```

If you need to create sub instance for the same AppId, you can use `initInstance` to set instance alias. These two instances report data to the same appId, but use different initialization configuration info. For example, configuration 1 uses normal mode to report data, configuration 2 uses Batch mode to report data.

Example code:

```
// Initialize configuration 1
TDAnalytics.init({
  appId: "app-id-1",
  serverUrl: "https://youserverurl.1.com"
});

// Initialize configuration 2
TDAnalytics.initInstance("td",{
  appId: "app-id-1",
  serverUrl: "https://youserverurl.1.com",
  enableBatch: true
});
```

---

# Real-time Debugging

During SDK integration, you can perform real-time debugging by viewing SDK logs in IDE console or using TE's Debug function.

### 1. Print SDK Logs

You can set enableLog to true during SDK initialization to enable SDK log switch. After enabling, reported data will be printed in browser console.

```
var config = {
    appId: "xxx",
    serverUrl: "xxx",
    enableLog:true
};
TDAnalytics.init(config);
```

### 2. Enable Debug Mode

Enabling Debug mode requires the following two steps:

1. Client enables Debug mode
   The following is example code for client enabling Debug mode:

```
/*
Set running mode to Debug mode
none: Data will be cached and reported according to certain cache strategy, default is NORMAL mode; recommended for production environment
debug: Data is reported one by one. When problems occur, logs and exceptions will be displayed to users; not recommended for production environment
debugOnly: Only validates data, will not be stored in database; not recommended for production environment
 */
var config = {
  appid: "YOUR_APPID",
  server_url: "YOUR_SERVER_URL",
  debugMode: "debug"
};
TDAnalytics.init(config);
```

1. TE backend adds Debug device
   To avoid Debug mode going live in production environment, only specified devices can enable Debug mode. Only when Debug mode is enabled on client and the device ID is configured in TE backend's "Tracking Management" page's "Debug Data" section can Debug mode be enabled.

Device ID can be obtained through the following three ways:

- #device_id property in event data in TE platform
- Client log: Device DeviceId will be printed after SDK initialization completes
- Through instance interface call: Get device ID
<!-- unsupported block: 34 -->

Debug mode may affect data collection quality and App stability, only use for integration phase data validation, do not use in production environment.

---

# Auto Tracking

After version 1.2.0, we provide auto tracking function. You just need to enable the auto tracking events you need in the config when creating instance. SDK will automatically collect some behaviors of mini program. Currently, the following events support auto tracking:

Current supported automatic data collection:

1. Mini program initialization, triggers once per user session
1. Mini program startup, including startup and background to foreground
1. Mini program to background, and record this visit duration (from startup to background)
1. Mini program page show or switch to foreground, automatically record page path and referrer path
1. Mini program forward/share, automatically record the page when forwarding
1. Mini program page unload, automatically record when page unloads (supported in version 3.2.0 and above)
1. Mini program page favorite, automatically record when page is favorited (supported in version 3.2.0 and above)
1. Mini program page element click, automatically record when page element is clicked (supported in version 3.2.0 and above)
   Next, we will introduce each data collection method in detail

### 1. Enable Auto Tracking Events

In config, elements in parameter `autoTrack` represent switch for each auto tracking event. Set to `true` to enable auto tracking:

```
var config = {
  appid: "YOU-APP-ID",
  server_url: "https://youserverurl.com",
  autoTrack: {
    appLaunch: true, // Auto track ta_mp_launch
    appShow: true, // Auto track ta_mp_show
    appHide: true, // Auto track ta_mp_hide
    pageShow: true, // Auto track ta_mp_view
    pageShare: true, // Auto track ta_mp_share
    pageLeave: true,// Auto track ta_page_leave
    mpFavorite: true,// Auto track ta_add_favorite
    mpClick: true,// Auto track ta_mp_click
    properties: { // Auto tracking custom properties
        staticKey: 'staticValue'
    },
    callback: (eventType:any) => { // Auto tracking callback
        if (eventType === 'appShow') {
            return { appShowKey: 'appShowValue' };
        } else if (eventType === 'appHide') {
            return { appHideKey: 'appHideValue' };
        } else {
            return {};
        }
    }
  }
};
```

- `appLaunch`: Auto track mini program initialization
- `appShow`: Auto track mini program startup, or from background to foreground
- `appHide`: Auto track mini program from foreground to background
- `pageShow`: Auto track mini program page show or switch to foreground
- `pageShare`: Auto track mini program forward/share
- `pageLeave`: Auto track mini program page unload
- `mpFavorite`: Auto track page favorite
- `mpClick`: Auto track page element click
- `properties`: Auto tracking custom properties (supports appShow/appHide)
- `callback`: Auto tracking callback (supports appShow/appHide)
  Due to different running environments and structures, different platforms support different auto tracking events. Support list as follows:

**Platform**

**appLaunch**

**appShow**

**appHide**

**pageShow**

**pageShare**

**pageLeave**

**mpFavorite**

**mpClick**

Mini Program

√

√

√

√

√

√

√

√

Mini Game

√

√

√

### 2. Auto Tracking Events Details

#### 2.1 Mini Program Initialization

Mini program initialization will trigger when mini program is first opened, or user kills process and reopens. It will only trigger once in process lifecycle. Detailed event introduction:

- Event name: ta_mp_launch
- Auto tracking properties:
- `#scene`: Scene value, from scene value provided by WeChat
- `#start_reason`: App startup source, content is JSON string, parameters obtained from `getLaunchOptionsSync` interface
  Through mini program initialization event, you can calculate daily user usage count, per capita usage count, including grouping by scene value to view user usage for different scene values.

#### 2.2 Mini Program Startup

Mini program startup will trigger when mini program is started, or mini program is called from background to foreground. Detailed event introduction:

- Event name: ta_mp_show
- Auto tracking properties:
- `#scene`, scene value, from scene value provided by WeChat
- `#url_path`, page path, path of page shown when mini program starts
- `#start_reason`: App startup source, content is JSON string, parameters obtained from `getLaunchOptionsSync` interface
  Mini program startup is affected by foreground/background switching (more records), so it's not suitable for direct analysis. But it can mark a user session in behavior path, can be used as initial behavior of user behavior path.

#### 2.3 Mini Program Hide

Mini program hide will trigger when mini program is put to background, and record this usage duration. Detailed event introduction:

- Event name: ta_mp_hide
- Auto tracking properties:
- `#scene`, scene value, from scene value provided by WeChat
- `#duration`, numeric type, represents duration from this startup (ta_mp_show) to hide
  Mini program hide event records usage duration (unit is seconds), so you can directly calculate total user usage duration and per capita duration, can also divide by initialization count to calculate single usage duration.

#### 2.4 Mini Program Page View

Mini program page view will trigger when mini program page is opened, or mini program page is shown when called from background to foreground. It records page path and referrer path. Detailed event introduction:

- Event name: ta_mp_view
- Auto tracking properties:
- `#scene`, scene value, from scene value provided by WeChat
- `#url_path`, page path, path of shown page
- `#referrer`, referrer path, path of previous page before shown page, i.e. path before redirect. If it's the homepage shown when starting mini program, value is "direct open"
  Through mini program page view event, you can calculate each page's pv, uv, and user's usage path in mini program.

#### 2.5 Mini Program Page Forward/Share

Mini program page forward/share will trigger when forward button is clicked (including forward button in upper right navigation bar, and forward button in page). Detailed event introduction:

- Event name: ta_mp_share
- Auto tracking properties:
- `#scene`, scene value, from scene value provided by WeChat
- `#url_path`, page path, path of page when forwarding
  Mini program page forward/share event is suitable for analyzing page share rate, can help you optimize page forwarding.

#### 2.6 Mini Program Page Unload

Triggers when mini program page is unloaded (e.g. going to other pages). Detailed event introduction:

- Event name: ta_page_leave
- Auto tracking properties:
- `#duration`, page stay duration
- `#url_path`, page path, path when page is unloaded

#### 2.7 Mini Program Page Favorite

Triggers when mini program page is favorited. Detailed event introduction:

- Event name: ta_add_favorite
- Auto tracking properties:
- `#url_path`, page path, path when page is unloaded

#### 2.7 Mini Program Page Element Click

Triggers when mini program page element is clicked. Detailed event introduction:

- Event name: ta_mp_click
- Auto tracking properties:
- `#element_id`, element ID
- `#element_type`, element type
- `#element_content`, element content
- `#element_name`, element name

---

# Preset Properties

### 1. Preset Properties for All Events

The following preset properties are preset properties that all events (including auto tracking events) will have in Mini Program/Mini Game SDK

**Property Name**

**English Name**

**Property Type**

**Description**

#ip

IP Address

Text

User's IP address, TE will use this to obtain user's geographic location information

#country

Country

Text

User's country, generated based on IP address

#country_code

Country Code

Text

User's country code (ISO 3166-1 alpha-2, i.e. two uppercase English letters), generated based on IP address

#province

Province

Text

User's province, generated based on IP address

#city

City

Text

User's city, generated based on IP address

#device_model

Device Model

Text

User device's model, such as iPhone 8 etc.

#device_id

Device ID

Text

User's device ID, UUID generated during initialization

#screen_height

Screen Height

Numeric

User device's screen height, such as 1920 etc.

#screen_width

Screen Width

Numeric

User device's screen width, such as 1080 etc.

#manufacturer

Device Manufacturer

Text

User device's manufacturer, such as Apple, vivo etc.

#os_version

Operating System Version

Text

iOS 11.2.2, Android 8.0.0 etc.

#os

Operating System

Text

Such as Android, iOS etc.

#network_type

Network Type

Text

Network status when uploading event, such as WIFI, 3G, 4G etc.

#lib

SDK Type

Text

The type of SDK you integrated, such as MP (Mini Program), MG (Mini Game) etc.

#lib_version

SDK Version

Text

The version of SDK you integrated

#scene

Scene Value

Numeric

Scene value passed when mini program/mini game starts

#mp_platform

Mini Program Platform

Text

Identifies the platform where the app is located

#zone_offset

Timezone Offset

Numeric

Data time offset hours relative to UTC time

#system_language

System Language

Text

User device's system language (ISO 639-1, i.e. two lowercase English letters), such as zh, en etc.

### 2. Preset Properties for Auto Tracking Events

The following preset properties are unique preset properties for each auto tracking event

- Mini Program Startup (ta_mp_show) preset properties
  **Property Name**

**English Name**

**Property Type**

**Description**

#url_path

Page Path

Text

Path of page shown when mini program starts

#start_reason

App Startup Source

Text

Content is JSON string, parameters obtained from `getLaunchOptionsSync` interface

- Mini Program Hide (ta_mp_hide) preset properties
  **Property Name**

**English Name**

**Property Type**

**Description**

#duration

Event Duration

Numeric

Represents duration from this startup `ta_mp_show` to hide `ta_mp_hide`, unit is seconds

- Mini Program Page View (ta_mp_view) preset properties
  **Property Name**

**English Name**

**Property Type**

**Description**

#url_path

Page Path

Text

Page path, path of shown page

#referrer

Referrer Path

Text

Path of previous page before shown page, i.e. path before redirect. If it's the homepage shown when starting mini program, value is "direct open"

- Mini Program Page Forward/Share (ta_mp_share) preset properties
  **Property Name**

**English Name**

**Property Type**

**Description**

#url_path

Page Path

Text

Path of mini program page when forwarded

### 3. Get Preset Properties

When server-side tracking needs some preset properties from App client side, you can get client-side preset properties through this method, then pass to server side.

```
// Get property object
var presetProperties = TDAnalytics.getPresetProperties();
// Generate event preset properties
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
// Get a specific preset property
var os=presetProperties.os;// OS type, such as Android
var osVersion=presetProperties.osVersion;// System version number
var networkType=presetProperties.networkType;// Network type
var manufacture=presetProperties.manufacturer;// Device manufacturer
var deviceModel=presetProperties.deviceModel;// Device model
var screenWidth=presetProperties.screenWidth;// Screen width
var screenHeight=presetProperties.screenHeight;// Screen height
var deviceId=presetProperties.deviceId;// Device ID
var zoneOffset=presetProperties.zoneOffset;// Timezone offset value
```

<!-- unsupported block: 34 -->

IP, country and city information are parsed and generated by server side, client side does not provide interface to get these properties

###
