---
code: rn_sdk_support
name: "React Native"
wikiToken: BNJxwC9F9i9i9MkJyYQcbUs2nAf
parentWikiToken: EaDPwgIujiz2GKk0rWxct8ZNn4g
updateTime: 1764555635000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=rn_sdk_support
---

# React Native

This guide will introduce how to use SDK features in React Native.

**Latest Version: **v3.2.0

**Update Time:** 2025-12-01

**Resource Download: **Source code

::: warning Note

This document applies to v3.0.0 and later versions. For historical versions, please refer to ReactNative Integration Guide (V2)

:::

### 1. SDK Integration

react-native-thinking-data has two integration methods: automatic and manual. We recommend using automatic integration.

#### 1.1 Automatic Integration

Add react-native-thinking-data in package.json file

```
"dependencies": {
    "react-native-thinking-data": "3.2.0"
}
```

### 2. SDK Initialization

Here is the sample code for SDK initialization:

```
import TDAnalytics,{TDAutoTrackEventType} from "react-native-thinking-data";
TDAnalytics.init({
    appId: "xxx",
    serverUrl: "https://xxx"
});
```

Parameter Description:

- `appId`: Your project's APPID, which can be obtained from the TE backend project management page
- `serverUrl`: Data upload URL
- If you are using cloud service, enter: https://global-receiver-ta.thinkingdata.cn
- If you are using a private deployment version, please bind a domain to the data collection address and configure an HTTPS certificate: https://YOUR_DATA_COLLECTION_DOMAIN
<!-- unsupported block: 34 -->

Since Android 9.0+ restricts HTTP requests by default, please make sure to use HTTPS protocol

### 3. Common Features

Before using common features, we recommend you first understand the user identification rules. SDK will generate a random number as the visitor ID by default and persistently store it locally. Before user login, the visitor ID will be used as the identity identification ID. Note: Visitor ID will change when user reinstalls the App or changes device.

#### 3.1 Setting Account ID

When user logs in, you can call `login` to set the user's account ID. TE platform will use account ID as the identity identification ID, and the set account ID will be retained until `logout` is called. Multiple calls to `login` will overwrite the previous account ID.

```
TDAnalytics.login("TA")
```

`login` can be called multiple times. Each call will check whether the passed account ID is the same as the previously saved ID. If same, the call will be ignored. If different, it will overwrite the previous ID.

<!-- unsupported block: 34 -->

**This method will not upload a login event**

#### 3.2 Setting Common Event Properties

Common event properties refer to properties that every event will have. You can call `setSuperProperties` to set common event properties. We recommend you set common event properties before sending events. For some important properties, such as user's membership level, source channel, etc., these properties need to be set in every event. In this case, you can set these properties as common event properties.

```
TDAnalytics.setSuperProperties({
    'channel': 'ta',//string
    'age': 1,//number
    'isSuccess': true,//boolean
    'birthday': new Date(),//time
    'object': {
      'key': 'value'
    },//object
    'object_arr': [
      { 'key': 'value' }
    ],//object array
    'arr': ['value']//array
})
```

Common event properties will be saved to cache and don't need to be called every time the App starts. If `setSuperProperties` is called to upload a previously set common event property, it will overwrite the previous property.

- Key is the property name, string type, must start with a letter, contain numbers, letters and underscore "\_", maximum 50 characters, case insensitive, TE will convert to lowercase
- Value is the property value, supports string, number, boolean, time, object, object array, array
<!-- unsupported block: 34 -->

**Event property and user property requirements are consistent with common event properties**

#### 3.3 Enabling Auto-tracking

The following sample code enables auto-tracking for install, start, and end events. If you want to learn more about auto-tracking events, you can read the auto-tracking feature introduction

```
TDAnalytics.enableAutoTrack(TDAutoTrackEventType.APP_START | TDAutoTrackEventType.APP_END | TDAutoTrackEventType.APP_CRASH | TDAutoTrackEventType.APP_INSTALL)
```

#### 3.4 Sending Events

You can call `track` to upload events. We recommend you set event properties and sending conditions according to your previously prepared tracking document. Here is an example of user purchasing a product:

```
TDAnalytics.track({
    eventName:"product_buy",
    properties:{
    'product_name':'product name'
    }
})
```

#### 3.5 Setting User Properties

For general user properties, you can call `userSet` to set them. Properties uploaded using this interface will overwrite previous property values. If the user property did not exist before, it will create a new user property. The type will be consistent with the uploaded property type. Here is an example of setting username:

```
//username is TA
TDAnalytics.userSet({ username:"TA"})
//username is TE
TDAnalytics.userSet({ username:"TE"})
```

### 4. Best Practices

The following sample code includes all the above operations. We recommend using the following steps:

```
import TDAnalytics,{TDAutoTrackEventType} from "react-native-thinking-data";
if (privacy policy authorized)
{
   //SDK initialization
   TDAnalytics.init({appId: "xxx",serverUrl: "https://xxx",});
   //enable auto-tracking
   TDAnalytics.enableAutoTrack(TDAutoTrackEventType.APP_START | TDAutoTrackEventType.APP_END | TDAutoTrackEventType.APP_CRASH | TDAutoTrackEventType.APP_INSTALL)
   //if user is logged in, you can set user's account ID as unique identity
   TDAnalytics.login("TA")
    //after setting common event properties, every event will have common event properties
   TDAnalytics.setSuperProperties({
     'channel': 'ta',//string
     'age': 1,//number
     'isSuccess': true,//boolean
     'birthday': new Date(),//time
     'object': {'key': 'value'},//object
     'object_arr': [{ 'key': 'value'}],//object array
    'arr': ['value']//array
})
   //send event
   TDAnalytics.track({
        eventName:"product_buy",
        properties:{
          'product_name':'product name'
        }
    })
   //set user properties
   TDAnalytics.userSet({ username:"TE"})
}

```

---

# Advanced Guide

### 1. Setting User ID

SDK instance will use random UUID as the default visitor ID for each user by default. This ID will be used as the identity identification ID when user is not logged in. Note that visitor ID will change when user reinstalls App or changes device.

#### 1.1 Setting Visitor ID

::: tip Tip

Generally, you don't need to customize visitor ID. Please make sure you understand the user identification rules before setting visitor ID.

If you need to replace visitor ID, you should call it immediately after SDK initialization is completed. Do not call it multiple times to avoid generating useless accounts.

:::

If your App has its own visitor ID management system for each user, you can call `setDistinctId` to set visitor ID:

```
// Set visitor ID to Thinker
TDAnalytics.setDistinctId("Thinker");
```

If you need to get the current visitor ID, you can call `getDistinctId`:

```
//return visitor ID
async () => {
  var distinct_id = await TDAnalytics.getDistinctId()
}
```

#### 1.2 Setting Account ID

When user logs in, you can call `login` to set the user's account ID. TE platform will use account ID as the identity identification ID, and the set account ID will be retained until `logout` is called. Multiple calls to `login` will overwrite the previous account ID.

```
// User's login unique identifier, this data corresponds to #account_id in the reported data, now #account_id is TA
TDAnalytics.login("TA");
```

<!-- unsupported block: 34 -->

**This method will not upload a login event**

#### 1.3 Clearing Account ID

After user logs out, you can call `logout` to clear account ID. Before the next `login` call, visitor ID will be used as the identity identification ID.

```
TDAnalytics.logout();
```

We recommend you call `logout` at explicit logout events, such as when user performs account deregistration action, rather than when closing App.

<!-- unsupported block: 34 -->

**This method will not upload a logout event**

### 2. Sending Events

#### 2.1 Regular Events

After SDK initialization is completed, you can perform data tracking and collect user behavior information. Regular events can generally meet business scenario requirements. You can also use first-time, updatable events according to your actual business scenarios.

```
//store purchase event
TDAnalytics.track({
    eventName:"product_buy",
    properties:{
      'product_name':'product name'
    }
})
```

#### 2.2 First-time Events

First-time events refer to events that will only be recorded once for a certain device or other dimension ID. For example, in some scenarios, you may want to record an activation event on a certain device, you can use first-time events to report data.

```
// Example: report device first-time event, assuming event name is DEVICE_FIRST
TDAnalytics.trackFirst({
    eventName:'device_activation',
    properties: {
        KEY_NUMBER: 1.02,
        KEY_STRING: "name",
        KEY_LIST: [1, 2, 3],
        KEY_BOOL: true,
        KEY_DateTime: "2020-05-12 06:27:18.371"
    },
    eventId:'YOUR_ACCOUNT_ID'
})
```

If you want to use other dimensions other than device to judge whether it's first-time, you can customize first_check_id for first-time events:

```
// Set user ID as first_check_id for first-time event, to collect user first-time activation event
TDAnalytics.trackFirst({
    eventName:'device_activation',
    properties: {
        KEY_NUMBER: 1.02,
        KEY_STRING: "name",
        KEY_LIST: [1, 2, 3],
        KEY_BOOL: true,
        KEY_DateTime: "2020-05-12 06:27:18.371"
    },
    eventId:'TA'
})
```

<!-- unsupported block: 34 -->

Note: Since the verification of whether it's first-time is completed on the server side, first-time events will be delayed by 1 hour before being stored in database.

#### 2.3 Updatable Events

You can use updatable events to implement the need to modify event data in specific scenarios. Updatable events need to specify an ID that identifies the event, and pass it when creating the updatable event object. TE backend will determine the data to be updated based on event name and event ID.

```
// Example: report updatable event, assuming event name is UPDATABLE_EVENT
// After reporting, event property status is 3, price is 100
TDAnalytics.trackUpdate({
    eventName:'UPDATABLE_EVENT',
    properties: { status: 3, price: 100},
    eventId:'test_event_id'
})
// After reporting, event property status is updated to 5, price remains unchanged
TDAnalytics.trackUpdate({
    eventName:'UPDATABLE_EVENT',
    properties: { status: 5},
    eventId:'test_event_id'
})
```

#### 2.4 Overwritable Events

Overwritable events are similar to updatable events, the difference is that overwritable events will completely overwrite previous data with the latest data. From the effect, it's equivalent to deleting the previous data and storing the latest data. TE backend will determine the data to be updated based on event name and event ID.

```
// Example: report overwritable event, assuming event name is OVERWRITE_EVENT
// After reporting, event property status is 3, price is 100
TDAnalytics.trackOverwrite({
    eventName:'OVERWRITE_EVENT',
    properties: { status: 3, price: 100},
    eventId:'test_event_id'
})
// After reporting, event property status is updated to 5, price property is deleted
TDAnalytics.trackOverwrite({
    eventName:'OVERWRITE_EVENT',
    properties: { status: 5},
    eventId:'test_event_id'
})
```

#### 2.5 Common Event Properties

Common event properties refer to properties that every event will upload. Based on property update frequency, common event properties are divided into `static common event properties` and `dynamic common event properties`. You can choose different common event property setting methods according to your specific business scenario requirements; we recommend you set common event properties before sending events. For the same event, when common event property, event custom property, preset property have the same Key, we will assign values according to the following priority: `custom property>dynamic common event property>static common event property>preset property`.

##### 2.5.1 Setting Static Common Event Properties

Static common event properties are low-frequency changing properties that every event will have, such as user membership level. After setting static common event properties via `setSuperProperties`, SDK will get the set common event properties as event properties when collecting events.

```
TDAnalytics.setSuperProperties({ vip_level: 2})
```

Static common event properties will be saved to cache and don't need to be called every time the App starts. If the property already exists, the newly set property will overwrite the original property value. If the property did not exist before, it will create a new property. Besides property setting, we also provide other APIs to operate static common event properties to meet daily business needs.

```
//clear a common event property
TDAnalytics.unsetSuperProperty("superKey")
//clear all common event properties
TDAnalytics.clearSuperProperties()
//get all common event properties
async () => {
  var properties = await TDAnalytics.getSuperProperties()
}
```

##### 2.5.2 Setting Dynamic Common Event Properties

Dynamic common event properties are high-frequency changing properties that every event will have, such as user's coin count. After setting dynamic common property class via `setDynamicSuperPropertiesTracker`, SDK will automatically get the properties from `getDynamicSuperProperties` when collecting events and add them to the triggered event.

```
var coin = 0;
TDAnalytics.setDynamicSuperProperties(function () {
    return { coin: coin++ }
 })
```

#### 2.6 Recording Event Duration

If you need to record the duration of an event, you can call `timeEvent` to start timing. Configure the event name you want to time. When you upload the event, `#duration` property will be automatically added to your event properties to represent the recorded duration, in seconds. Note that the same event name can only have one timing task.

```
//The following example completes the statistics of user staying time on a product page
 //User enters product page, start timing
TDAnalytics.timeEvent("stay_shop")
/**do someting
    .......
    **/
//User leaves product page, timing ends, "stay_shop" event will have #duration property representing event duration
TDAnalytics.track({eventName:"stay_shop"})
```

### 3. User Properties

TE platform currently supports the following user property setting interfaces: `userSet`, `userSetOnce`, `userAdd`, `userUnset`, `userDelete`, `userAppend`, `userUniqAppend`

#### 4.1 userSet

For general user properties, you can call `userSet` to set them. Properties uploaded using this interface will overwrite previous property values. If the user property did not exist before, it will create a new user property. The type will be consistent with the uploaded property type. Here is an example of setting username:

```
// username is TA
TDAnalytics.userSet({ username: "TA" });
//username is TE
TDAnalytics.userSet({ username: "TE" });
```

#### 4.2 userSetOnce

If you want to upload a user property that only needs to be set once, you can call `userSetOnce` to set it. When the property already has a value, this information will be ignored. Here is an example of setting first payment time:

```
//first_payment_time is 2018-01-01 01:23:45.678
TDAnalytics.userSetOnce({first_payment_time: "2018-01-01 01:23:45.678" });
//first_payment_time remains 2018-01-01 01:23:45.678
TDAnalytics.userSetOnce({first_payment_time: "2018-12-31 01:23:45.678" });
```

#### 4.3 userAdd

When you want to upload numeric properties, you can call `userAdd` to perform cumulative operations on the property. If the property has not been set, it will be assigned 0 before calculation. Negative values can be passed, equivalent to subtraction operation. Here is an example of cumulative payment amount:

```
//total_revenue is 30
TDAnalytics.userAdd({ total_revenue: 30 });
//total_revenue is 678
TDAnalytics.userAdd({ total_revenue: 648 });
```

<!-- unsupported block: 34 -->

The property key must be a string, and Value must be a number.

#### 4.4 userUnset

When you want to clear a user's user property value, you can call `userUnset` to clear the specified property. If the property has not been created in the cluster, `userUnset` will **not** create the property

```
TDAnalytics.userUnset("usersetkey")
```

<!-- unsupported block: 34 -->

userUnset parameter is the user property name, type is string or string array, supports variable-length parameter form.

#### 4.5 userDelete

If you want to delete a user, you can call `userDelete` to delete the user. You will no longer be able to query this user's user properties, but the events generated by this user can still be queried.

```
TDAnalytics.userDelete()
```

#### 4.6 userAppend

You can call `userAppend` to append elements to Array type user properties.

```
TDAnalytics.userAppend({ user_list: ["apple", "ball"] });
```

#### 4.7 userUniqAppend

You can call `userUniqAppend` to append unique elements to Array (List) type user data. Calling `userUniqAppend` interface will deduplicate the appended user properties, `userAppend` interface does not deduplicate, user properties can have duplicates.

```
//user_list property value is ["apple", "ball"]
TDAnalytics.userAppend({ user_list: ["apple", "ball"] });
//user_list property value is ["apple","apple","ball","cube"]
TDAnalytics.userAppend({ user_list: ["apple", "cube"] });
//user_list property value is ["apple", "ball","cube"]
TDAnalytics.userUniqAppend({ user_list: ["apple", "cube"] });
```

### 4. Encryption Feature

SDK supports encryption feature. Client supports AES + RSA to encrypt data, then server decrypts the data. Encryption and decryption capabilities need to be coordinated between client and server. Please consult customer success personnel for details.

Set `enableEncrypt` property to true, and set default version number and public key.

```
import TDAnalytics, { TDAutoTrackEventType,TDThirdPartyType,TDTrackStatus} from "react-native-thinking-data";
TDAnalytics.init({
    appId: "xxx",
    serverUrl: "https://xxx",
    enableEncrypt: true,// enable data transmission encryption
    secretKey: {
        publicKey: "xxx",// encryption public key
        version: 1,// key version number
        symmetricEncryption: "AES",
        asymmetricEncryption: "RSA"
    }
});
```

### 5. Enabling Integration with H5 Pages

If you need to integrate with JavaScript SDK that collects H5 page data, please call the following interface. For details, please refer to H5 and APP SDK Integration section

```
<WebView
  ref={webViewRef}
  source={localHtmlFile}
  onMessage={ event => {
    console.log(event.nativeEvent.data);
    TDAnalytics.h5ClickHandler(event.nativeEvent.data);
  }}
  javaScriptEnabled={true}
  injectedJavaScript='window.ThinkingData_APP_ReactNative_Bridge = function(data) { window.ReactNativeWebView.postMessage(data); };'
/>
```

### 6. Other Features

#### 6.1 Getting Device ID

You can call `getDeviceId` to get device ID:

```
async () => {
  var device_id = await TDAnalytics.getDeviceId()
}
```

#### 6.2 Time Calibration

SDK will use local time as event occurrence time by default. If user manually modifies device time, it will affect your business analysis. In this case, you can use time calibration operation to ensure the accuracy of event occurrence time. We provide `timestamp, NTP` two time calibration methods.

- You can use the current timestamp obtained from server to calibrate SDK time. After that, all calls without specified time, including event data and user property setting operations, will use the calibrated time as occurrence time.

```
// 1585633785954 is current unix timestamp in milliseconds, corresponding to Beijing time 2020-03-31 13:49:45
TDAnalytics.calibrateTime(1585633785954);
```

- You can also set NTP server address, then SDK will try to get current time from the passed NTP service address and calibrate SDK time. If correct result is not obtained within default timeout (3 seconds), local time will be used for data reporting.

```
// Use Apple's NTP service for time calibration
TDAnalytics.calibrateTimeWithNtp("time.apple.com");
```

<!-- unsupported block: 34 -->

1. Using NTP service for time calibration has some uncertainty, we recommend you prefer using timestamp calibration method

2. You need to carefully choose your NTP server address to ensure that user devices can quickly get server time under good network conditions

#### 6.3 Immediately Upload Data

In certain business scenarios, if you expect data to be immediately uploaded to TE server, you can call `flush` interface

```
TDAnalytics.flush();
```

---

# Real-time Debugging

During SDK integration, you can view SDK logs in IDE console or use TE's Debug feature for real-time debugging.

### 1. Printing SDK Logs

You can set enableLog to true during SDK initialization to enable SDK log switch. After enabling, data uploaded will be printed in IDE console.

```
TDAnalytics.init({
    appId: "xxx",
    serverUrl: "https://xxx",
    enableLog: true
});
```

<!-- unsupported block: 34 -->

After enabling logs, you can filter ThinkingAnalytics related logs in IDE to observe SDK data reporting.

### 2. Enabling Debug Mode

Enabling Debug mode requires two steps:

1. Enable Debug mode on client
   Here is sample code for enabling Debug mode on client:

```
/*
Set running mode to Debug mode
normal mode: data will be cached and uploaded according to certain caching strategy, default is NORMAL mode; recommended for production environment
debug mode: data is uploaded one by one. When problems occur, it will alert users via logs and exceptions; not recommended for production environment
debugOnly mode: only validate data, will not store; not recommended for production environment
 */
TDAnalytics.init({
    appId: "xxx",
    serverUrl: "https://xxx",
    mode:"debug"
});
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

### 1. Enabling Auto-tracking Events

You can call `enableAutoTrack` and pass a `TDAutoTrackEventType` type to enable auto-tracking. Currently supports six types:

- `ta_app_start`: App enters foreground, corresponding type is `TDAutoTrackEventType.APP_START`
- `ta_app_end`: App enters background, corresponding type is `TDAutoTrackEventType.APP_END`
- `ta_app_install`: First open after installation, corresponding type is `TDAutoTrackEventType.APP_INSTALL`
- `ta_app_crash`: App crashes due to uncaught exception, corresponding type is `TDAutoTrackEventType.APP_CRASH`
- `ta_app_view`: Triggered when APP uses Navigator route navigation, corresponding type is `TDAutoTrackEventType.APP_VIEW_SCREEN` (supported in 3.2.0 and later versions)
- `ta_app_click`: APP control click event triggered when user clicks control, corresponding type is `TDAutoTrackEventType.APP_CLICK` (supported in 3.2.0 and later versions)
  Notes about auto-tracking events:

1. Auto-tracking events are implemented in native SDK, so dynamic common properties currently cannot be added to auto-tracking events.
1. If you need to set visitor ID or common properties, please complete setting before enabling auto-tracking events.
   Sample code for enabling auto-tracking:

```
TDAnalytics.enableAutoTrack(TDAutoTrackEventType.APP_START | TDAutoTrackEventType.APP_END | TDAutoTrackEventType.APP_INSTALL| TDAutoTrackEventType.APP_CRASH | TDAutoTrackEventType.APP_CLICK | TDAutoTrackEventType.APP_VIEW_SCREEN);
```

### 2. Detailed Introduction

#### 2.1 Page View Events

App page view events support React Navigation ^2.0 ~ ^6.0

Triggered when APP uses navigation route navigation. Detailed event introduction:

- Event name: ta_app_view
- Preset properties:
  `#screen_name`: string type, page name

`#title`: string type, page title

`#referrer`: string type, previous address

- Enable method:
- Call `enableAutoTrack`, pass `TDAutoTrackEventType.APP_VIEW_SCREEN`

```
TDAnalytics.enableAutoTrack(TDAutoTrackEventType.APP_VIEW_SCREEN);
```

- Execute script

```
node node_modules/react-native-thinking-data/ThinkingDataRNHook.js -run
```

- Set page custom properties: When navigating via Navigation, you can add custom properties in params. SDK will automatically use the settings in params to supplement or overwrite App page view event properties.

```
navigation.navigate('PageB', {
  thinkingdataparams: {
    name: 'name_A',
    '#title': 'Second Page',
    '#screen_name': "page_B"
  }
});
```

If you need to customize #title and #screen_name, you can pass them in thinkingdataparams parameter.

- Ignore single page view event: When TDIgnoreViewScreen property with value true is added in thinkingdataparams, this page view event will be ignored

```
navigation.navigate('PageB', {
  thinkingdataparams: {
    name: 'name_A',
    '#title': 'Second Page',
    '#screen_name': "page_B",
    TDIgnoreViewScreen: true
  }
});
```

#### 2.2 Element Click Events

App element click events support React Native 0.23 ~ 0.70.0

APP control click event triggered when user clicks control

- Event name: ta_app_click
- Preset properties:
  `#screen_name`: string type, page name

`#title`: string type, page title

`#element_content`: string type, element content

- Enable method:
- Call `enableAutoTrack`, pass `TDAutoTrackEventType.APP_CLICK`

```
TDAnalytics.enableAutoTrack(TDAutoTrackEventType.APP_CLICK);
```

- Execute script:

```
node node_modules/react-native-thinking-data/ThinkingDataRNHook.js -run
```

- Set control custom properties: Add custom properties thinkingdataparams in control

```
<CustomButton
  title="Button"
  thinkingdataparams={{
    name: 'button',
    pro_key:'pro_value'
  }}
/>
```

- Ignore single control click event: When TDIgnoreViewClick property with value true is added in thinkingdataparams, this control click event will be ignored

```
<CustomButton
  title="Button"
  thinkingdataparams={{
    name: 'button',
    pro_key:'pro_value'
    TDIgnoreViewClick: true
  }}
/>
```

### 3. Setting Auto-tracking Event Custom Properties

You can call `enableAutoTrack` to set auto-tracking event properties

```
TDAnalytics.enableAutoTrack(TDAutoTrackEventType.APP_START,{
        auto_name: "xxx",
        auto_age: "xxx"
})
```

---

# Preset Properties

### 1. Preset Properties Description

Preset properties collected by iOS and Android platforms will have some differences. Please refer to the following documents:

iOS platform preset properties, Android platform preset properties

### 2. Getting Preset Properties

```
async () => {
  var presetProperties = await TDAnalytics.getPresetProperties()
}
```
