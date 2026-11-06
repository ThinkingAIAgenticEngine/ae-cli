---
code: flutter_sdk_installation
name: "Flutter"
wikiToken: OxdhwoyTDiS4kLknBKBcxZH3n7C
parentWikiToken: EaDPwgIujiz2GKk0rWxct8ZNn4g
updateTime: 1763002927000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=flutter_sdk_installation
---

# Flutter

This guide will introduce how to use Flutter SDK to integrate into your project. We recommend reading the data rules chapter before starting integration.

**Latest Version: **3.3.1

**Update Time: **2025-11-10

**Resource Download:\*\*** \*\*Source code

::: warning Note

This document applies to v3.0.0 and later versions. For historical versions, please refer to Flutter Integration Guide (V2)

:::

### 1. SDK Integration

Add `thinking_analytics` dependency in your Flutter project's `pubspec.yaml` file:

```
dependencies:
  thinking_analytics: ^3.3.1
```

<!-- unsupported block: 19 -->

Versions after 3.3.0 support Flutter For OpenHarmony for HarmonyOS platform. Currently supports Flutter 3.7.12 and 3.22.0 versions

Features not supported on HarmonyOS platform:

1. Custom timezone feature not supported
1. Dynamic common properties for auto-tracking events not supported
1. JS integration not supported

### 2. Initialization

ThinkingData SDK needs to be initialized after user agrees to Privacy Policy

<!-- unsupported block: 19 -->

Versions 3.3.0 and later do not need await

```
// Determine whether to enable data collection based on privacy policy
import 'package:thinking_analytics/td_analytics.dart';
if (privacy policy authorized)
{
   //SDK initialization
   await TDAnalytics.init(APPID, SERVER_URL);
}
```

Parameter Description:

- `APPID`: Your project's APPID, can be obtained from TE backend project management page
- `SERVER_URL`: Data upload URL
- If you are using cloud service, enter: https://global-receiver-ta.thinkingdata.cn
- If you are using private deployment version, please bind domain to data collection address and configure HTTPS certificate: https://YOUR_DATA_COLLECTION_DOMAIN
<!-- unsupported block: 34 -->

Since Android 9.0+ restricts HTTP requests by default, please make sure to use HTTPS protocol

### 3. Common Features

Before using common features, we recommend you first understand the user identification rules. SDK will generate random number as visitor ID by default and persistently store it locally. Before user login, visitor ID will be used as identity identification ID. Note: Visitor ID will change when user reinstalls App or changes device.

#### 3.1 Setting Account ID

When user logs in, you can call `login` to set user's account ID. TE platform will use account ID as identity identification ID, and the set account ID will be retained until `logout` is called. Multiple calls to `login` will overwrite the previous account ID.

```
// User's login unique identifier, this data corresponds to #account_id in reported data, now #account_id value is TA
TDAnalytics.*login*("TA");
```

`login` can be called multiple times. Each call will check whether the passed account ID is the same as the previously saved ID. If same, the call will be ignored. If different, it will overwrite the previous ID.

<!-- unsupported block: 34 -->

**This method will not upload login event**

#### 3.2 Setting Common Event Properties

Common event properties refer to properties that every event will have. You can call `setSuperProperties` to set common event properties. We recommend you set common event properties before sending events. For some important properties, such as user's membership level, source channel, etc., these properties need to be set in every event. In this case, you can set these properties as common event properties.

```
TDAnalytics.setSuperProperties({
  "channel": "ta",//string
  "age": 1,//number
  "isSuccess": true,//boolean
  "birthday": DateTime.now(),//time
  "object": {"key": "value"},//object
  "object_arr": [{"key": "value"}],//object array
  "arr": ["value"]//array
});
```

Common event properties will be saved to cache and don't need to be called every time App starts. If `setSuperProperties` is called to upload a previously set common event property, it will overwrite the previous property.

- Key is the property name, string type, must start with a letter, contain numbers, letters and underscore "\_", maximum 50 characters, case insensitive, TE will convert to lowercase
- Value is the property value, supports string, number, boolean, time, object, object array, array
<!-- unsupported block: 34 -->

**Event property and user property requirements are consistent with common event properties**

#### 3.3 Enabling Auto-tracking

The following sample code enables install, start, close events. If you want to learn more about SDK auto-tracking capabilities, you can view auto-tracking feature detailed introduction

```
TDAnalytics.*enableAutoTrack*(TDAutoTrackEventType.*APP_START *|
    TDAutoTrackEventType.*APP_END *|
    TDAutoTrackEventType.*APP_INSTALL *|
    TDAutoTrackEventType.*APP_CRASH*);
```

#### 3.4 Sending Events

We recommend you set event properties and sending conditions according to your previously prepared document. Event name is `String` type, must start with a letter, can contain numbers, letters and underscore "\_", maximum 50 characters, case insensitive.

```
TDAnalytics.track('product_buy', properties: <String, dynamic>{'product_name': 'product name'});
```

Event name is string type, must start with a letter, can contain numbers, letters and underscore "\_", maximum 50 characters.

#### 3.5 Setting User Properties

For general user properties, you can call `userSet` to set them. Properties uploaded using this interface will overwrite previous property values. If the user property did not exist before, it will create a new user property. The type will be consistent with the uploaded property type. Here is an example of setting username:

```
TDAnalytics.userSet(<String, dynamic>{'user_name': 'TA'});  //username is TA
TDAnalytics.userSet(<String, dynamic>{'user_name': 'TE'});  //userName is TE
```

### 4. Best Practices

The following sample code includes all the above operations. We recommend using the following steps:

```
import 'package:thinking_analytics/td_analytics.dart';
if (privacy policy authorized)
{
   //SDK initialization
   await TDAnalytics.*init*('APP_ID', 'https://SERVER_URL');
   //Enable auto-tracking events
   TDAnalytics.*enableAutoTrack*(TDAutoTrackEventType.*APP_START *|
    TDAutoTrackEventType.*APP_END *|
    TDAutoTrackEventType.*APP_INSTALL *|
    TDAutoTrackEventType.*APP_CRASH*);
   //If user is logged in, you can set user's account ID as unique identity
   TDAnalytics.login('TA');
   //After setting common event properties, every event will have common event properties
   TDAnalytics.setSuperProperties({
     "channel": "ta",//string
     "age": 1,//number
     "isSuccess": true,//boolean
     "birthday": DateTime.now(),//time
     "object": {"key": "value"},//object
     "object_arr": [{"key": "value"}],//object array
     "arr": ["value"]//array
    });
   //Send event
   TDAnalytics.track('product_buy', properties: <String, dynamic>{'product_name': 'product name'});
   //Set user properties
   TDAnalytics.userSet(<String, dynamic>{'user_name': 'TE'});
}
```

---

# Advanced Guide

### 1. Setting User ID

SDK instance will use random UUID as the default visitor ID for each user by default. This ID will be used as the identity identification ID when user is not logged in. Note that visitor ID will change when user reinstalls App or changes device.

#### 1.1 Setting Visitor ID

::: tip Tip

Generally, you don't need to customize visitor ID. Please make sure you understand the user identification rules before setting visitor ID.

If you need to replace visitor ID, you should call it immediately after SDK initialization is completed. Do not call it multiple times to avoid generating useless accounts

:::

If your App has its own visitor ID management system for each user, you can call `setDistinctId` to set visitor ID:

```
// Set visitor ID to Thinker
TDAnalytics.*setDistinctId*("Thinker");
```

If you need to get the current visitor ID, you can call `getDistinctId`:

```
//Return visitor ID
String distinctId = await TDAnalytics.getDistinctId();
```

#### 1.2 Setting Account ID

When user logs in, you can call `login` to set user's account ID. TE platform will use account ID as identity identification ID, and the set account ID will be retained until `logout` is called. Multiple calls to `login` will overwrite the previous account ID.

```
// User's login unique identifier, this data corresponds to #account_id in reported data, now #account_id value is TA
TDAnalytics.login("TA");
```

<!-- unsupported block: 34 -->

**This method will not upload login event**

#### 1.3 Clearing Account ID

After user logs out, you can call `logout` to clear account ID. Before the next `login` call, visitor ID will be used as identity identification ID.

```
TDAnalytics.logout();
```

We recommend you call `logout` at explicit logout events, such as when user performs account deregistration action, rather than when closing App.

<!-- unsupported block: 34 -->

**This method will not upload logout event**

### 2. Sending Events

After SDK initialization is completed, you can perform data tracking and collect user behavior information. Regular events can generally meet business scenario requirements. You can also use first-time, updatable events according to your actual business scenarios.

#### 2.1 Regular Events

You can call `track` to upload events. We recommend you set event properties and sending conditions according to your previously prepared document. Here is an example of user purchasing a product:

```
TDAnalytics.track('pruoduct_buy', properties: <String, dynamic>{'product_name': 'product name'});
```

#### 2.2 First-time Events

First-time events refer to events that will only be recorded once for a certain device or other dimension ID. For example, in some scenarios, you may want to record an activation event on a certain device, you can use first-time events to report data.

```
//Example: report device first-time event, assuming event name is device_activation
var properties = {'key': 'value'};
TDFirstEventModel firstModel =TDFirstEventModel('device_activation','', properties);
TDAnalytics.*trackEventModel*(firstModel);
```

If you want to use other dimensions other than device to judge whether it's first-time, you can customize first_check_id for first-time events:

```
// Set user ID as first_check_id for first-time event, to collect user first-time activation event
var properties = {'key': 'value'};
TDFirstEventModel firstModel =TDFirstEventModel('device_activation','TA', properties);
TDAnalytics.trackEventModel(firstModel);
```

<!-- unsupported block: 34 -->

Note: Since the verification of whether it's first-time is completed on the server side, first-time events will be delayed by 1 hour before being stored in database.

#### 2.3 Updatable Events

You can use updatable events to implement the need to modify event data in specific scenarios. Updatable events need to specify an ID that identifies the event, and pass it when creating the updatable event object. TE backend will determine the data to be updated based on event name and event ID.

```
// Example: report updatable event, assuming event name is UPDATABLE_EVENT
// After reporting, event property status is 3, price is 100
var properties = {
  'status': 3,
  'price': 100
};
TDUpdatableEventModel updateModel = TDUpdatableEventModel('UPDATABLE_EVENT', 'test_event_id', properties);
TDAnalytics.trackEventModel(updateModel);

// After reporting, event property status is updated to 5, price remains unchanged
var properties_new = {
  'status': 5
};
var updateModel_new = TDUpdatableEventModel('UPDATABLE_EVENT', 'test_event_id', properties_new);
TDAnalytics.trackEventModel(updateModel_new);
```

#### 2.4 Overwritable Events

Overwritable events are similar to updatable events, the difference is that overwritable events will completely overwrite previous data with the latest data. From the effect, it's equivalent to deleting the previous data and storing the latest data. TE backend will determine the data to be updated based on event name and event ID.

```
// Example: report overwritable event, assuming event name is OVERWRITABLE_EVENT
// After reporting, event property status is 3, price is 100
var properties = {
    'status': 3,
    'price': 100
};
var overwriteModel = TDOverWritableEventModel('OVERWRITABLE_EVENT', 'test_event_id', properties);
TDAnalytics.trackEventModel(overwriteModel);

// After reporting, event property status is 5, price property is deleted
var properties_new = {
    'status': 5
};
var overwriteModel_new = TDOverWritableEventModel('OVERWRITABLE_EVENT', 'test_event_id', properties_new);
TDAnalytics.trackEventModel(overwriteModel_new);
```

#### 2.5 Common Event Properties

Common event properties refer to properties that every event will upload. Based on property update frequency, common event properties are divided into `static common event properties` and `dynamic common event properties`. You can choose different common event property setting methods according to your specific business scenario requirements; we recommend you set common event properties before sending events. For the same event, when common event property, event custom property, preset property have the same Key, we will assign values according to the following priority: `custom property>dynamic common event property>static common event property>preset property`.

##### 2.5.1 Static Common Event Properties

Static common event properties are low-frequency changing properties that every event will have, such as user membership level. After setting static common event properties via `setSuperProperties`, SDK will get the set common event properties as event properties when collecting events.

```
Map<String, dynamic> superProperties = {
  'vip_level': 2
};
TDAnalytics.setSuperProperties(superProperties);
```

Static common event properties will be saved to cache and don't need to be called every time App starts. If the property already exists, the newly set property will overwrite the original property value; if the property did not exist before, it will create a new property. Besides property setting, we also provide other APIs to operate static common event properties to meet daily business needs.

```
// Clear property named SUPER_LIST common property
TDAnalytics.unsetSuperProperty('SUPER_LIST');
// Clear all common properties
TDAnalytics.clearSuperProperties();
//Get all common event properties
await TDAnalytics.getSuperProperties();
```

##### 2.5.2 Dynamic Common Event Properties

Dynamic common event properties are high-frequency changing properties that every event will have, such as user's coin count. After setting dynamic common property class via `setDynamicSuperProperties`, SDK will automatically get dynamic common event properties when collecting events and add them to the triggered event. Setting dynamic common properties requires passing a function that returns `Map<String, dyanmic>` type. Sample as follows:

```
// Set dynamic common properties, dynamic common properties do not support auto-tracking events
TDAnalytics.*setDynamicSuperProperties*((){
  return <String, dynamic> {
    'DYNAMIC_DATE': DateTime.now().toUtc(),
  };
});
```

<!-- unsupported block: 34 -->

Dynamic common properties currently do not support auto-tracking events.

#### 2.6 Recording Event Duration

If you need to record the duration of an event, you can call `timeEvent` to start timing. Configure the event name you want to time. When you upload the event, `#duration` property will be automatically added to your event properties to represent the recorded duration, in seconds. Note that the same event name can only have one timing task.

```
//The following example completes the statistics of user staying time on a product page
//User enters product page, start timing
TDAnalytics.timeEvent('stay_shop');
// do some thing...
//User leaves product page, timing ends, "stay_shop" event will have #duration property representing event duration
TDAnalytics.track("stay_shop");
```

### 3. User Properties

TE platform currently supports the following user property setting interfaces: `userSet`, `userSetOnce`, `userAdd`, `userUnset`, `userDelete`, `userAppend`, `userUniqAppend`

#### 3.1 userSet

For general user properties, you can call `userSet` to set them. Properties uploaded using this interface will overwrite previous property values. If the user property did not exist before, it will create a new user property. The type will be consistent with the uploaded property type. Here is an example of setting username.

```
TDAnalytics.userSet(<String, dynamic>{'user_name': 'TA'});  //username is TA
TDAnalytics.userSet(<String, dynamic>{'user_name': 'TE'});  //userName is TE
```

<!-- unsupported block: 34 -->

Property format requirements are consistent with event properties.

#### 3.2 userSetOnce

If you want to upload a user property that only needs to be set once, you can call `userSetOnce` to set it. When the property already has a value, this information will be ignored. Here is an example of setting first payment time:

```
//first_payment_time is 2018-01-01 01:23:45.678
TDAnalytics.userSetOnce(<String, dynamic>{'first_payment_time': '2018-01-01 01:23:45.678'});
//first_payment_time remains 2018-01-01 01:23:45.678
TDAnalytics.userSetOnce(<String, dynamic>{'first_payment_time': '2018-12-31 01:23:45.678'});
```

#### 3.3 userAdd

When you want to upload numeric properties, you can call `userAdd` to perform cumulative operations on the property. If the property has not been set, it will be assigned 0 before calculation. Negative values can be passed, equivalent to subtraction operation. Here is an example of cumulative payment amount:

```
 //total_revenue is 30
TDAnalytics.userAdd(<String, num>{ 'total_revenue': 30});
//total_revenue is 678
TDAnalytics.userAdd(<String, num>{ 'total_revenue': 648});
```

#### 3.4 userUnset

If you need to reset a user's property, you can call `userUnset` to delete the specified user property value:

```
TDAnalytics.userUnset('USER_INT');
```

<!-- unsupported block: 34 -->

userUnset: The passed value is the Key of the property to be cleared.

#### 3.5 userDelete

If you want to delete a user, you can call `userDelete` to delete the user. You will no longer be able to query this user's user properties, but the events generated by this user can still be queried:

```
TDAnalytics.userDelete();
```

#### 3.6 userAppend

You can call `userAppend` to append elements to `List` type user properties:

```
TDAnalytics.userAppend(<String, List>{
  'USER_LIST': ['apple','ball'],
});
```

#### 3.7 userUniqAppend

You can call `userUniqAppend` to append elements to Array type user properties. Calling `userUniqAppend` interface will deduplicate the appended user properties, `userAppend` interface does not deduplicate, user properties can have duplicates.

```
//user_list property value is ["apple", "ball"]
TDAnalytics.userAppend(<String, List>{ 'user_list': ['apple','ball']});
//user_list property value is ["apple","apple","ball","cube"]
TDAnalytics.userAppend(<String, List>{ 'user_list': ['apple','cube']});
//user_list property value is ["apple", "ball","cube"]
TDAnalytics.useUniqrAppend(<String, List>{ 'user_list': ['apple','cube']});
```

### 4. Encryption Feature

SDK supports encryption feature. Client supports AES+RSA to encrypt data, then server decrypts the data. Encryption and decryption capabilities need to be coordinated between client and server. Please consult customer success personnel for details. You can enable data transmission encryption feature when initializing SDK.

```
TDConfig config = TDConfig();
config.appId = "APP_ID";
config.serverUrl = "SERVER_URL";
//Configure version number, public key and other secret key information
config.enableEncrypt(1,"publicKey");
TDAnalytics.*initWithConfig*(config);
```

### 5. Enabling Integration with H5 Pages

If you need to integrate with JavaScript SDK that collects H5 page data, please call the following interface. For details, please refer to H5 and APP SDK Integration section

```
controller = WebViewController();
TDAnalytics.setJsBridge(controller);
```

### 6. Other Features

#### 6.1 Getting Device ID

After SDK initialization is completed, device ID will be automatically generated and recorded in local cache. For the same app/game, one device's device ID is unchanged. You can call `getDeviceId` to get device ID:

```
String deviceId = await TDAnalytics.getDeviceId();
```

#### 6.2 Setting Default Timezone

By default, all data's occurrence time will be set to local time. If your product is distributed in multiple timezones and you want to align data time to a specified timezone, you can pass `timeZone` to set timezone. `timeZone` needs to be a valid timezone string, such as `UTC`, `Asia/Shanghai` etc.

By default, SDK will use local time when interface is called as event occurrence time for reporting. You can also set default timezone interface to specify default timezone, so all events will align event time according to your set timezone:

```
TDConfig config = TDConfig();
config.appId = "appId";
config.serverUrl = "serverUrl";
config.timeZone = "UTC";
TDAnalytics.*initWithConfig*(config);
```

<!-- unsupported block: 34 -->

Aligning event time with specified timezone will lose device local timezone information. If you need to preserve device local timezone information, you currently need to add related properties to events yourself.

#### 6.3 Time Calibration

SDK will use local time as event occurrence time by default. If user manually modifies device time, it will affect your business analysis. In this case, you can use time calibration operation to ensure the accuracy of event occurrence time. We provide `timestamp, NTP` two time calibration methods.

- You can use the current timestamp obtained from server to calibrate SDK time. After that, all calls without specified time, including event data and user property setting operations, will use the calibrated time as occurrence time.

```
// 1585633785954 is current unix timestamp in milliseconds, corresponding to Beijing time 2020-03-31 13:49:45
TDAnalytics.calibrateTime(1585633785954);
```

- You can also set NTP server address, then SDK will try to get current time from the passed NTP service address and calibrate SDK time. If correct result is not obtained within default timeout (3 seconds), local time will be used for data reporting.

```
// Use Apple's NTP service for time calibration
TDAnalytics.*calibrateTimeWithNtp*("time.apple.com");
```

<!-- unsupported block: 34 -->

1. Using NTP service for time calibration has some uncertainty, we recommend you prefer using timestamp calibration method

2. You need to carefully choose your NTP server address to ensure that user devices can quickly get server time under good network conditions

---

# Real-time Debugging

During SDK integration, you can view SDK logs in IDE console or use TE's Debug feature for real-time debugging.

### 1. Printing SDK Logs

```
TDAnalytics.*enableLog*(true);
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
NORMAL mode: data will be cached and uploaded according to certain caching strategy, default is NORMAL mode; recommended for production environment
Debug mode: data is uploaded one by one. When problems occur, it will alert users via logs and exceptions; not recommended for production environment
DebugOnly mode: only validate data, will not store; not recommended for production environment
 */
TDConfig config = TDConfig();
config.appId = "appId";
config.serverUrl = "serverUrl";
config.setMode(TDMode.DEBUG);
TDAnalytics.*initWithConfig*(config);
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
- `ta_app_view`: Triggered when APP uses Navigator route navigation, corresponding type is `TDAutoTrackEventType.APP_VIEW_SCREEN`
- `ta_app_click`: APP control click event triggered when user clicks control, corresponding type is `TDAutoTrackEventType.APP_CLICK`
  Notes about auto-tracking events:

1. Auto-tracking events are implemented in native SDK, so dynamic common properties currently cannot be added to auto-tracking events.
1. If you need to set visitor ID or common properties, please complete setting before enabling auto-tracking events.
   Sample code for enabling auto-tracking:

```
TDAnalytics.enableAutoTrack(TDAutoTrackEventType.APP_START |
    TDAutoTrackEventType.APP_END |
    TDAutoTrackEventType.APP_INSTALL |
    TDAutoTrackEventType.APP_CRASH|
    TDAutoTrackEventType.APP_CLICK|
    TDAutoTrackEventType.APP_VIEW_SCREEN);
```

### 2. Detailed Introduction

#### 2.1 Page View Events

Triggered when APP uses Navigator route navigation. Detailed event introduction:

- Event name: ta_app_view
- Preset properties:
  `#screen_name`: string type, page name

`#title`: string type, page title

`#referrer`: string type, previous address

- Enable steps:
- Add global listener, add navigatorObservers in MaterialApp

```
import 'package:thinking_analytics/autotrack/td_page_view.dart';

void main() => runApp(new MaterialApp(
    navigatorObservers: TDNavigatorObserver.*wrap*([]), home: MyApp()));
```

- Call _enableAutoTrack to enable, sample code as follows:_

```
TDAnalytics.*enableAutoTrack*(TDAutoTrackEventType.*APP_VIEW_SCREEN*,
    autoTrackEventProperties: {
      "test_property": "test_property_value"
    },
    autoTrackPageConfig: TDAutoTrackConfig(
      pageConfigs: [
        TDAutoTrackPageConfig<Page1>(
          screenName: "Page1",
          title: "First Page",
        ),
        TDAutoTrackPageConfig<Page2>(
          screenName: "Page2",
          title: "Second Page",
          ignore: false,
          properties: {
            "multi_property": "multi_property_value"
          },
        )
      ],
));
```

autoTrackEventProperties: Set auto-tracking common properties

autoTrackPageConfig: Page view related configuration information, can customize title and screenName for each page, ignore is whether to ignore this page collection, properties is this page's custom properties

<!-- unsupported block: 19 -->

Need to enable early, otherwise the first page's lifecycle has passed, cannot collect the first page's view event

#### 2.1 Element Click Events

APP control click event triggered when user clicks control

- Event name: ta_app_click
- Preset properties:
  `#screen_name`: string type, page name

`#title`: string type, page title

`#element_type`: string type, element type

`#element_content`: string type, element content

- Enable steps

```
TDAnalytics.*enableAutoTrack*(TDAutoTrackEventType.*APP_CLICK*);
```

- Control custom properties
  Set custom properties via TDElementKey

- First parameter: Element ID, corresponds to property #element_id
- properties: Custom properties
- isIgnore: Whether to ignore this control auto-tracking event

```
import 'package:thinking_analytics/autotrack/td_autotrack_config.dart';

ElevatedButton(
    key: TDElementKey("Element ID", properties: {"key": "value"},isIgnore: true),
    onPressed: () {},
    child: Text(
      "Button 2",
      style: TextStyle(fontSize: 14),
    )),
```

### 3. Setting Auto-tracking Event Custom Properties

You can call `setAutoTrackProperties` to set or update custom properties

```
TDAnalytics.*enableAutoTrack*(TDAutoTrackEventType.*APP_START*,
    autoTrackEventProperties: {
  'auto_test': 'stu',
  'auto_arr': [1, 2, 3],
  'auto_obj': {'obj_test': 'xxx'}
});
```

---

# Preset Properties

### 1. Preset Properties Description

Preset properties collected by iOS and Android platforms will have some differences. Please refer to the following documents:

iOS platform preset properties, Android platform preset properties

### 2. Getting Preset Properties

v2.0.1 and later versions can call `getPresetProperties()` method to get preset properties.

When server-side tracking needs some preset properties from App side, you can use this method to get App side preset properties and then pass to server.

```
//Get property object
TDPresetProperties presetProperties = await TDAnalytics.getPresetProperties();

//Generate event preset properties
Map<String, dynamic>? eventPresetProperties = presetProperties.toEventPresetProperties();
/*
   {
  "#carrier": "China Telecom",
  "#os": "iOS",
  "#device_id": "A8B1C00B-A6AC-4856-8538-0FBC642C1BAD",
  "#screen_height": 2264,
  "#bundle_id": "com.sw.thinkingdatademo",
  "#manufacturer": "Apple",
  "#device_model": "iPhone7",
  "#screen_width": 1080,
  "#system_language": "zh",
  "#os_version": "10",
  "#network_type": "WIFI",
  "#zone_offset": 8
    }
*/

//Get a specific preset property
String bundleId = presetProperties.bundleId;//package name
String os = presetProperties.os;//os type, such as Android, iOS
String systemLanguage = presetProperties.systemLanguage;//phone system language type
int screenWidth = presetProperties.screenWidth;//screen width
int screenHeight = presetProperties.screenHeight;//screen height
String deviceModel = presetProperties.deviceModel;//device model
String deviceId = presetProperties.deviceId;//device unique identifier
String carrier = presetProperties.carrier;//phone SIM card carrier info, dual SIM dual standby, takes primary card's carrier info
String manufacture = presetProperties.manufacturer;//phone manufacturer such as HuaWei, Apple
String networkType = presetProperties.networkType;//network type
String osVersion = presetProperties.osVersion;//system version number
double zoneOffset = presetProperties.zoneOffset;//timezone offset value
```

<!-- unsupported block: 34 -->

IP, country and city information are generated from server-side parsing, client does not provide interface to get these properties

###
