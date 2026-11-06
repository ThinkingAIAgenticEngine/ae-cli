---
code: laya_sdk_installation
name: "LayaAir"
wikiToken: LA2HwgcB7iAfNukIXjBckwVinXg
parentWikiToken: BAU2w0eipiqGnckeUsIc0mYQnZc
updateTime: 1751965860000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=laya_sdk_installation
---

# LayaAir

::: tip Note

Before integration, please read the Pre-installation Guide first.

LayaAir SDK supported platforms: iOS, Android, Web, WeChat Mini Game, Huawei Quick Game, ByteDance Mini Game, bilibili Mini Game, vivo Mini Game, OPPO Mini Game, Xiaomi Quick Game, Baidu Mini Game, QQ Mini Game, Taobao Creative Interactive Mini Program, Alipay Mini Game, WKWebView.

:::

**Latest Version:** v3.0.2

**Update Time:** 2024-02-09

**Resource Download:** Source Code, SDK Download

::: warning Warning

This document applies to v3.0.0 and later versions, for historical versions please refer to LayaAir Integration Guide (V2), SDK Download (v2.2.4)

:::

### I. Integrate SDK

Download and unzip LayaAir SDK

:::: el-tabs

::: el-tab-pane label=TypeScript Integration

If your project is a TypeScript project, the integration steps are as follows:

1. Put the declaration file tdanalytics.laya.d.ts into the libs directory
1. Put the SDK file (tdanalytics.mg.layats.min.js) into the bin/js directory
1. Modify the bin/index.js file to load TE SDK:

```
// Load TE SDK before loading bundle.js
loadLib("js/tdanalytics.mg.layats.min.js");
loadLib("js/bundle.js");
```

:::

::: el-tab-pane label=JavaScript Integration

If your project is a JavaScript project, you can directly put `tdanalytics.mg.laya.min.js` into your project and reference it in the source code:

```
import TDAnalytics from "./tdanalytics.mg.laya.min";
```

:::

::::

### II. Initialization

After importing TE SDK, you can use TDAnalytics in your code:

```
// TE SDK configuration object
var config = {
  appId: "YOUR_APPID", // Project APP ID
  serverUrl: "YOUR_SERVER_URL", // Upload address
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
- `serverUrl`: Data upload URL, required
- If you are using cloud service, enter: https://global-receiver-ta.thinkingdata.cn
- If you are using a privately deployed version, please confirm the upload address with your operations team
- `autoTrack`: Optional, indicates whether to enable auto-tracking feature, each element represents the following auto-tracking events, all disabled by default:
- `appLaunch`: Auto-track mini program initialization
- `appShow`: Auto-track mini game startup, or from background to foreground
- `appHide`: Auto-track mini game from foreground to background, and record the duration of this visit (from startup to entering background)
  ::: warning Warning

Before uploading data, please add the data transfer URL to the server domain's request list in the WeChat public platform or other platform's development settings.

:::

### III. Common Features

Before using common features, we recommend that you first understand the user identification rules; SDK will generate a random number as a visitor ID by default, and persistently store the visitor ID locally; before the user logs in, the visitor ID will be used as the identity identification ID. Note: The visitor ID will change when the user clears cache or changes the device.

#### 3.1 Set Account ID

When a user logs in, you can call `login` to set the user's account ID. The TE platform will use the account ID as the identity identification ID, and the set account ID will be retained until `logout` is called. Calling `login` multiple times will override the previous account ID.

```
// The user's unique login identifier, this data corresponds to #account_id in the reported data, at this time #account_id is "TA"
TDAnalytics.login("TA");
```

<!-- unsupported block: 34 -->

**This method will not upload a login event**

#### 3.2 Set Public Event Properties

Public event properties refer to properties that will be present in every event. You can call `setSuperProperties` to set public event properties. We recommend that you set public event properties before sending events. For some important properties, such as user membership level, source channel, etc., these properties need to be set in every event, you can set these properties as public event properties.

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
TDAnalytics.setSuperProperties(superProperties);//Set public event properties
```

Public event properties will be saved to the cache and do not need to be called every time the App starts. If you call `setSuperProperties` to upload a previously set public event property, it will override the previous property.

- Key is the property name, is a string type, can only start with a letter, contain numbers, letters and underscores "\_", maximum length 50 characters, case-insensitive, TE will uniformly convert to lowercase letters
- Value is the property value, supports string, number, boolean, time, object, object array, array
<!-- unsupported block: 34 -->

**Event properties and user properties requirements are the same as public event properties**

#### 3.3 Send Event

You can call `track` to upload events. It is recommended that you set event properties and conditions for sending information based on your previously documented tracking plan. Here is an example of a user purchasing a product:

```
TDAnalytics.track({
    eventName: "product_buy", // Event name
    properties: {
        product_name: "Product Name"
    } //Event properties
});
```

The event name is a string type, can only start with a letter, can contain numbers, letters and underscores "\_", maximum length 50 characters.

#### 3.4 Set User Properties

For general user properties, you can call `userSet` to set them. Properties uploaded using this interface will override existing property values. If the user property did not exist before, it will be created with the same type as the uploaded property. Here is an example of setting the username:

```
//At this time username is TA
TDAnalytics.userSet({
    properties: {
        username: "TA"
    }
});
//At this time userName is TE
TDAnalytics.userSet({
    properties: {
        username: "TE"
    }
});
```

### IV. Best Practices

The following example code includes all the above operations. We recommend following these steps:

```
var TDAnalytics = require("./tdanalytics.wx.min.js");
var config = {
  appId: "YOU-APP-ID", // Project's APP ID
  serverUrl: "https://youserverurl.com", // Data upload address
  autoTrack: {
    appLaunch: true, // Auto-track ta_mp_launch
    appShow: true, // Auto-track ta_mp_show
    appHide: true, // Auto-track ta_mp_hide
    pageShow: true, // Auto-track ta_mp_view
    pageShare: true // Auto-track ta_mp_share
  }
};
// Initialize
TDAnalytics.init(config);
// The user's unique login identifier, this data corresponds to #account_id in the reported data, at this time #account_id is "TA"
TDAnalytics.login("TA");
//Set public event properties
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

###

###

---

# Advanced Guide

### I. Set User ID

The SDK instance defaults to using a random number as the default visitor ID for each user, which will serve as the identity identification ID for users in an unauthenticated state. Note that the visitor ID will change when the user clears cache or changes the device.

#### 1.1 Set Visitor ID

::: tip Note

Generally, you do not need to customize the visitor ID. Please ensure you understand the user identification rules before setting the visitor ID.

:::

If your App has its own visitor ID management system for each user, you can call `setDistinctId` to set the visitor ID:

```
// Set the visitor ID to "Thinker"
TDAnalytics.setDistinctId("Thinker");
```

If you need to get the current visitor ID, you can call `getDistinctId`:

```
TDAnalytics.getDistinctIdAsync((distinctId)=>{
//Return visitor ID
});
```

<!-- unsupported block: 34 -->

If you need to set it, you must call this interface before initialization

#### 1.2 Set Account ID

When a user logs in, you can call `login` to set the user's account ID. The TE platform will use the account ID as the identity identification ID, and the set account ID will be retained until `logout` is called. Calling `login` multiple times will override the previous account ID.

```
//The user's unique login identifier, this data corresponds to #account_id in the reported data, at this time #account_id is "TA"
TDAnalytics.login("TA");
```

<!-- unsupported block: 34 -->

**This method will not upload a login event**

#### 1.3 Clear Account ID

After a user logs out, you can call `logout` to clear the account ID. Before calling `login` again, the visitor ID will be used as the identity identification ID.

```
// Remove "#account_id" from reported data, subsequent data will not have "#account_id"
TDAnalytics.logout();
```

We recommend that you call `logout` only when there is an explicit logout behavior, such as when the user actively cancels their account, rather than when the App is closed.

<!-- unsupported block: 34 -->

**This method will not upload a logout event**

### II. Send Events

After the SDK initialization is complete, you can perform data tracking and collect user behavior information. Generally, ordinary events can meet business scenario requirements. You can also use first-time events, updatable events, etc. according to your actual business scenarios.

#### 2.1 Ordinary Events

You can call `track` to upload events. We recommend that you set event properties and conditions for sending events based on your previously documented tracking plan. Here is an example of a user purchasing a product

```
TDAnalytics.track({
    eventName: "product_buy", // Event name
    properties: {
        product_name: "Product Name"
    } //Event properties
});
```

#### 2.2 First-time Event

First-time events refer to events that will only be recorded once for a certain device or other dimensional ID. For example, in some scenarios, you may want to record an activation event on a certain device, then you can use first-time events to report the data.

```
TDAnalytics.trackFirst({
    eventName: "device_activation",
    properties: { key: "value" }
});
```

If you want to determine whether it is the first time based on other dimensions other than the device, you can customize the first_check_id for the first-time event:

```
// Set the user ID as the first_check_id of the first-time event to implement the collection of user first activation event
TDAnalytics.trackFirst({
  eventName: "account_activation",
  firstCheckId: "TA",
  properties: { key: "value" }
});
```

<!-- unsupported block: 34 -->

Note: Since the verification of whether it is the first time is completed on the server side, first-time events will be delayed by 1 hour before entering the database by default.

#### 2.3 Updatable Events

You can implement the need to modify event data in specific scenarios through updatable events. Updatable events need to specify an ID that identifies the event, and pass it when creating the updatable event object. The TE backend will determine the data to be updated based on the event name and event ID.

```
// Example: Report an event that can be updated, assuming the event name is UPDATABLE_EVENT
// After reporting, the event property status is 3, price is 100
TDAnalytics.trackUpdate({
  eventName: "UPDATABLE_EVENT",
  properties: { status: 3, price: 100 },
  eventId: "test_event_id"
});

// After reporting, the event property status is updated to 5, price remains unchanged
TDAnalytics.trackUpdate({
  eventName: "UPDATABLE_EVENT",
  properties: { status: 5 },
  eventId: "test_event_id"
});
```

#### 2.4 Overwritable Events

Overwritable events are similar to updatable events, the difference is that overwritable events will completely overwrite historical data with the latest data, which effectively is equivalent to deleting the previous data and storing the latest data. The TE backend will determine the data to be updated based on the event name and event ID.

```
// Example: Report an event that can be overwritten, assuming the event name is OVERWRITE_EVENT
// After reporting, the event property status is 3, price is 100
TDAnalytics.trackOverwrite({
  eventName: "OVERWRITE_EVENT",
  properties: { status: 3, price: 100 },
  eventId: "test_event_id"
});

// After reporting, the event property status is updated to 5, price property is deleted
TDAnalytics.trackOverwrite({
  eventName: "OVERWRITE_EVENT",
  properties: { status: 5 },
  eventId: "test_event_id"
});
```

#### 2.5 Public Event Properties

For some important properties, such as user device ID, source channel, user status, etc., these properties need to be set in every event, you can set these properties as public properties, i.e., properties that are present in every event. We recommend that you set public properties before sending events.

Public properties include two types, event public properties and dynamic public properties. During event reporting, public properties will be inserted into the data's properties. If at this time the public property has the same key value as a custom property set in the event, the property value will be determined according to the following priority: `Custom Properties > Dynamic Public Event Properties > Static Public Event Properties > Preset Properties`

##### 2.5.1 Static Public Event Properties

For some important properties, such as user channel, nickname, ID, etc., these properties need to be set in every event, you can call `setSuperProperties` to set static public event properties, static public event properties will take effect globally. When caching is enabled (default on), static public properties will be cached in `localStorage` or `cookie`.

Static public property parameter is a JSON object, and its format requirements are the same as event properties.

```
// Set public event properties, all data events will have these properties
TDAnalytics.setSuperProperties({ channel: "Channel Name", user_name: "User Name" });
```

Besides setting properties, we also provide other APIs to operate static public event properties to meet daily business needs.

```
// Get static public event properties
var superProperties = TDAnalytics.getSuperProperties();
// Clear one static public event property, for example clear previously set 'channel' property, subsequent data will not have this property
TDAnalytics.unsetSuperProperty("channel");
// Clear all static public event properties
TDAnalytics.clearSuperProperties();
```

##### 2.5.2 Dynamic Public Event Properties

By setting the callback function of dynamic public properties through `setDynamicSuperProperties`, SDK will trigger the callback function during event reporting and add the returned JSON object to event properties. The parameter of `setDynamicSuperProperties` is a function, the function needs to return a JSON object.

```
// Set dynamic public properties, trigger callback function during event reporting and add returned JSON object to event properties
TDAnalytics.setDynamicSuperProperties(function() {
  var d = new Date();
  d.setHours(10);
  return { date: d };
});
```

#### 2.6 Record Event Duration

If you need to record the duration of an event, you can call `timeEvent` to start timing. Configure the event name you want to time. When you upload that event, a `#duration` property will automatically be added to your event properties to represent the recorded duration in seconds. Note that only one timing task can exist for the same event name.

```
//The following example completes the statistics of the user's stay duration on a certain product page
TDAnalytics.timeEvent({
    eventName: "stay_shop"
});
/**do someting
    .......
**/
//User leaves the product page, timing ends, the "stay_shop" event will have a property #duration representing the event duration
TDAnalytics.track({
    eventName: "stay_shop",
    properties: {
        product_name: "Product Name"
    }
});
```

### III. User Properties

The user property setting APIs supported by TE platform are: `userSet`, `userSetOnce`, `userAdd`, `userUnset`, `userDelete`, `userAppend`, `userUniqAppend`.

#### 3.1 userSet

For general user properties, you can call `userSet` to set them. Properties uploaded using this interface will override existing property values. If the user property did not exist before, it will be created with the same type as the uploaded property. Here is an example of setting the username:

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

If you need to upload user properties that should only be set once, you can call `userSetOnce` to set them. When the property already has a value, this information will be ignored. Here is an example of setting the first payment time:

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

When you need to upload numeric properties, you can call `userAdd` to perform an accumulation operation on the property. If the property has not been set, it will be assigned 0 before calculation. If a negative value is passed, it is equivalent to a subtraction operation.

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

When you need to clear a user's user property value, you can call `userUnset` to clear the specified property. If the property has not been created in the cluster yet, `userUnset` **will not** create the property

```
// Clear the user property value named userPropertykey, i.e., set to NULL
TDAnalytics.userUnset({
    property: "userPropertykey"
});
```

#### 3.5 userDelete

If you need to delete a user, you can call `userDelete` to delete that user. You will no longer be able to query that user's user properties, but the events generated by that user can still be queried.

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

Starting from v1.6.0, you can call `userUniqAppend` to append unique elements to Array (List) type user data. Calling `userUniqAppend` interface will deduplicate the appended user properties, while `userAppend` interface does not deduplicate, user properties may contain duplicates.

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

### IV. Encryption Function

Starting from v2.1.0, SDK supports encryption function. The client supports AES + RSA to encrypt data, and then the server decrypts the data. The encryption and decryption capabilities require client and server to work together. Please consult your customer success manager for details.

Set `enableEncrypt` property to true, and set the default version number and public key.

```
var config = {
  appId: "YOUR_APP_ID", // Project APP ID
  serverUrl: "YOUR_SERVER_URL", // Upload address
  enableEncrypt: true, // Enable data transmission encryption
  secretKey: {
    publicKey:'YOUR_PUBLIC_KEY', // Encryption public key
    version:0 // Key version number
   }
};
// Initialize
TDAnalytics.init(config);
```

### V. Other Features

#### 5.1 Get Device ID

You can call `getDeviceId()` to get the device ID.

```
var deviceId = TDAnalytics.getDeviceId();
```

<!-- unsupported block: 34 -->

**Device ID will be saved in cache, if user clears cache, device ID will be reset.**

#### 5.2 onCompelete Callback Function

For `track, userSet, userSetOnce, userAdd, userDel` interfaces, onComplete callback can be passed. onComplete can be passed directly after the original parameter list, or using parameter object method. If using parameter object, the parameter object must include onComplete, otherwise a parameter error will occur. Using uploading event as an example:

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

The parameter res of onComplete is object type, with two properties code and msg.

res.code is int type, defined as follows:

- 0: Success
- -1: Data format incorrect
- -2: APP ID invalid
- -3: Network or server exception
  Debug mode is defined as follows:

- 0: Success
- -1: Parameter or permission validation issue
- 1: Indicates field basic error, will give detailed error field and reason
- 2: Indicates whole record error
- -3: Network or server exception
  res.msg is a textual explanation of res.code.

#### 5.3 Set Event Cache Upload

Starting from v2.2.0, you can configure event cache upload during initialization.

```
// TE SDK configuration object
var config = {
  appId: "YOU-APP-ID", // Project's APP ID
  serverUrl: "https://youserverurl.com", // Data upload address
  enableBatch: true, // Whether to enable event cache batch upload, true=enable, false=disable
  batchConfig: {
    size: 5, // Event cache upload count
    interval: 5000 // Event cache upload interval (milliseconds)
  }
};
// Initialize
TDAnalytics.init(config);
```

### VI. Channel SDK Compatibility

#### 6.1 Tencent Advertising

##### 6.1.1 Solution Overview

After integrating TDAnalytics SDK, you don't need to additionally integrate Tencent advertising SDK. Once you complete TDAnalytics initialization method, the system will automatically trigger Tencent advertising SDK initialization. When you report registration, payment, and other key events, the system will automatically report these event information to Tencent advertising according to your configuration.

##### 6.1.2 Integration Process

1. Download Tencent advertising SDK, currently using version 1.5.4, other versions can also be used.
   Place dn-sdk-minigame.cjs.js in the same directory as TDAnalytics SDK.

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
        appid: 'wx123xyz123xyz123x',//WeChat mini game APPID, wx prefix, required
    },
    reportingToTencentSdk: 2,//1 Report only to Tencent 2 Report to both Tencent and TA 3 Report only to TA
    debugMode: 'debug'// If debug mode, will print Tencent advertising SDK local debug logs
})
```

1. Set User ID

- setOpenId
  openid is usually obtained asynchronously by calling backend interface (get openid method), please call sdk.setOpenId() method after obtaining openid. Only one of openid and unionid can be set, openid is preferred.

```
wx.request({
    url: 'Backend interface URL to get openid and determine if registered user',
    success: function(res){
        if(res.openid){
          // Set openid, must set openid before reporting registration behavior. setOpenId is a synchronous method, can report registration behavior immediately after setting.
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
  unionid is usually obtained asynchronously by calling backend interface (get unionid method), please call sdk.setUnionId() method after obtaining unionid. Only use this method to set unionid when openid is not available.

```
wx.request({
    url: 'Backend interface URL to get openid and determine if registered user',
    success: function(res){
        if(res.unionid){
          // Set unionid, please use openid first, only set unionid when openid is not available or backend uniformly uses unionid.
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

For the following specific events, need to report specified event name

Event

Event Name

Event Properties (need to include key)

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

##### Silent Wake-up

##### RE_ACTIVE

{

        backFlowDay: 30

}

##### Add Mini Game to Wishlist

##### ADD_TO_WISHLIST

{

        type: 'default',

}

##### Share Mini Game

##### SHARE

{

        target: 'APP_MESSAGE'

}

##### Create Role

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

# Native Support

### I. iOS Native Support

#### 1.1 Build iOS Project

- Build Preparation
- Publish Web platform application, record publish file path
- Build Configuration
- Open `Menu`-`Tools`-`app build` interface
- Project type select `XCode iOS`, check `Offline Version`
- Resource path select Web platform application publish path

#### **1.2 Configure iOS Project**

- Add iOS project dependency files
- `LayaProxyApi.h`
- `LayaProxyApi.mm`
- `ThinkingSDK.framework`
- Build Settings Settings
- Add `-ObjC` in `Other Linker Flags`

### II. Android Native Support

#### 2.1 Build Android Project

- Build Preparation
- Publish Web platform application, record publish file path
- Build Configuration
- Open `Menu - Tools - app build` interface
- Project type select `Android studio`, check `Offline Version`
- Resource path select Web platform application publish path

#### **2.2 Configure Android Project**

- In Android display mode app project, add dependency file `LayaProxyApi.java` to `demo`, as shown below
- Copy `ThinkingSDK.aar` to `app/libs` directory in project
- Add dependency in `build.gradle` file under `Module`

```
dependencies {
    ...
    implementation fileTree(dir: 'libs', include: ['*.aar'])
}
```

### III. Enable Native Support

When initializing SDK, add `enableNative: true` in `config` to enable Native support.

```
// TA SDK configuration object
var config = {
  appId: "YOUR_APPID", // Project APP ID
  serverUrl: "YOUR_SERVER_URL", // Upload address
  enableNative: true, // Allow calling Native code
  autoTrack: {
    appShow: true, // Auto-track startup event
    appHide: true, // Auto-track close event
    appClick: true, // Auto-track click event (only native effective)
    appView: true, // Auto-track view event (only native effective)
    appCrash: true, // Auto-track crash event (only native effective)
    appInstall: true // Auto-track install event (only native effective)
  }
};

// Initialize
TDAnalytics.init(config);
// Report a simple event, event name is test_event
TDAnalytics.track({
    eventName: "test_event"
});
```

###

---

# Real-time Debugging

During SDK integration, you can perform real-time debugging by viewing SDK logs in the IDE console or using TE's Debug feature.

#### I. Print SDK Logs

```
var config = {
    appId: "xxx",
    serverUrl: "xxx",
    enableLog:true
};
TDAnalytics.init(config);
```

<!-- unsupported block: 34 -->

After enabling logs, you can filter ThinkingAnalytics related logs in the IDE to observe SDK data reporting.

#### II. Enable Debug Mode

Enabling Debug mode requires the following two steps:

1. Enable Debug mode on the client side
   The following is an example code for enabling Debug mode on the client side:

```
/*
Set the running mode to Debug mode
none: Data will be stored in cache and reported according to a certain cache strategy. Default is NORMAL mode; recommended for production environment
debug: Data is reported one by one. When problems occur, users will be prompted with logs and exceptions; not recommended for production environment
debugOnly: Only validates data, will not be stored in database; not recommended for production environment
 */
var config = {
  appid: "YOUR_APPID",
  server_url: "YOUR_SERVER_URL",
  debugMode: "debug"
};
TDAnalytics.init(config);
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

In the instance's config, enable the auto-tracking events you need, and SDK will automatically collect mini game behaviors. Currently, the following types of events support auto-tracking:

Currently supported automatic data collection:

1. Mini game returns to foreground event
1. Mini game enters background, and records the duration of this visit (from startup to entering background)
   Next, we will detail the collection method for each type of data

### I. Enable Auto-tracking Events

In config, the elements in parameter `autoTrack` represent the switch for each auto-tracking event, set to `true` to enable auto-tracking:

```
var config = {
    appid: "YOUR_APPID",
    server_url: "YOUR_SERVER_URL",
    autoTrack: {
         appLaunch: true, // Auto-track ta_mg_launch
         appShow: true, // Auto-track ta_mg_show
         appHide: true, // Auto-track ta_mg_hide
         properties: { // Auto-track custom propertiesstaticKey: 'staticValue'},
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
```

- appLaunch: Auto-track mini program initialization
- appShow: Auto-track mini game startup, or from background to foreground
- appHide: Auto-track mini game from foreground to background
- properties: Auto-track custom properties (supports appShow/appHide)
- callback: Auto-track callback (supports appShow/appHide)

### II. Auto-tracking Event Details

#### 2.1 Mini Game Startup

Mini game startup will be triggered when mini game is started or mini game is brought from background to foreground, detailed event introduction:

- Event name: ta_mg_show
- Auto-track properties:
- `#scene`, scene value, from WeChat provided scene value
  Mini game startup is affected by foreground/background switching (large number of records), so it is not suitable for direct analysis, but can mark a user's usage in behavioral path, and can be used as the initial behavior of user behavioral path

#### 2.2 Mini Game Hide

Mini game hide will be triggered when mini game enters background, and records the duration of this usage, detailed event introduction:

- Event name: ta_mg_hide
- Auto-track properties:
- `#scene`, scene value, from WeChat provided scene value
- `#duration`, numeric type, represents the duration from this startup (ta_mg_show) to hide
  Mini game hide event records usage duration (in seconds), so you can directly calculate user total usage duration and average duration per person, or calculate single usage duration by dividing by initialization count.

---

# Preset Properties

#### I. Preset Properties for All Events

<!-- unsupported block: 34 -->

Preset properties collected by each platform will have certain differences. For details, please refer to the following documents: Android Platform, iOS Platform

**Mini Game Platform Preset Properties for All Events:**

**Property Name**

**Chinese Name**

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

User's country code (ISO 3166-1 alpha-2, i.e., two uppercase English letters), generated based on IP address

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

User's device model, such as iPhone 8, etc.

#device_id

Device ID

Text

User's device ID, taken from UUID generated during initialization

#screen_height

Screen Height

Number

User's device screen height, such as 1920, etc.

#screen_width

Screen Width

Number

User's device screen height, such as 1080, etc.

#manufacturer

Device Manufacturer

Text

User's device manufacturer, such as Apple, vivo, etc.

#os_version

Operating System Version

Text

iOS 11.2.2, Android 8.0.0, etc.

#os

Operating System

Text

Such as Android, iOS, etc.

#network_type

Network Status

Text

Network status when uploading event, such as WIFI, 3G, 4G, etc.

#lib

SDK Type

Text

The type of SDK you integrated, such as MG (Mini Game)

#lib_version

SDK Version

Text

The version of SDK you integrated

#scene

Scene Value

Number

Scene value passed when WeChat mini game starts

#mp_platform

Mini Game Platform

Text

Identifies the platform where the application is located

#zone_offset

Timezone Offset

Number

Number of hours the data time is offset relative to UTC time

#### II. Preset Properties for Auto-tracking Events

The following preset properties are unique to each auto-tracking event

- Mini Program Startup (ta_mp_show) preset properties
  **Property Name**

**Chinese Name**

**Property Type**

**Description**

#url_path

Page Path

Text

The path of the page displayed when mini program starts

#start_reason

App Start Source

Text

Content is JSON string, parameters from `getLaunchOptionsSync` interface

- Mini Game Hide (ta_mg_hide) preset properties
  **Property Name**

**Chinese Name**

**Property Type**

**Description**

#duration

Event Duration

Number

Represents the duration from this startup `ta_mg_show` to hide `ta_mg_hide`, in seconds

#### III. Get Preset Properties

When server-side tracking needs some preset properties from the App side, you can get the preset properties from the client side through this method and pass them to the server side.

```
//Get property object
TDAnalytics.getPresetPropertiesAsync((presetProperties)=>{
    //Generate event preset properties
    var properties = presetProperties.toEventPresetProperties();
});
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
var osVersion=presetProperties.osVersion;//System version number
var networkType=presetProperties.networkType;//Network type
var manufacture=presetProperties.manufacturer;//Device manufacturer
var deviceModel=presetProperties.deviceModel;//Device model
var screenWidth=presetProperties.screenWidth;//Screen width
var screenHeight=presetProperties.screenHeight;//Screen height
var deviceId=presetProperties.deviceId;//Device ID
var zoneOffset=presetProperties.zoneOffset;//Timezone offset value
```

<!-- unsupported block: 34 -->

IP, country and city information are generated by server-side analysis, client does not provide interface to get these properties
