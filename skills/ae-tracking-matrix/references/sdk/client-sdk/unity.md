---
code: unity_sdk_installation
name: "Unity"
wikiToken: Vlbrwj9vYijvVIkwaCtcIABFnMf
parentWikiToken: BAU2w0eipiqGnckeUsIc0mYQnZc
updateTime: 1773313260000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=unity_sdk_installation
---

# Unity

::: tip Tip

Before integration, please read the pre-installation preparation first.

Unity SDK: Supports iOS, Android, HarmonyOS, Unity Editor, Windows, Mac, WebGL, Switch, Xbox, PS4/5 game terminals. Supports WeChat Mini Game, Douyin Mini Game, OPPO and other mini game platforms.

Minimum compatible Unity 5.4.0 version, size approximately 320 KB

:::

**Latest Version:** v3.4.6

**Update Time:** 2026-03-12

**Resource Download: **Source code, SDK Download

::: warning Note

This document applies to v3.0.0 and later versions. For historical versions, please refer to Unity Integration Guide (V2), SDK Download (v2.6.1)

:::

### 1. SDK Integration

#### 1.1 Manual Integration

1. Download Unity SDK resource files
1. Double click `ta_unity_sdk.unitypackage` file or import via `Assets > Import Package > Custom Package`, import `ta_unity_sdk.unitypackage`
<!-- unsupported block: 19 -->

When upgrading unitypackage from 3.3.0 to 3.4+.x, need to delete original SDK before importing

Purpose: Unity/Tuanjie engine export to HarmonyOS platform occasionally has .ts file loss issue. Currently all ts files renamed to .tslib. If not deleting original files, file name duplication issue will occur.

#### 1.2 Package Manager Integration

From v2.4.1, supports `Package Manager` automatic SDK integration.

1. Open `Window` - `Package Manager` menu
1. Click `+`, then select `Add package from git URL...`
1. Enter `https://github.com/ThinkingDataAnalytics/unity-sdk.git`, then click `Add`, wait for loading to complete

### 2. Initialization

Recommend using manual SDK initialization. We also provide prefab automatic initialization method.

#### 2.1 Manual Initialization

```
using ThinkingData.Analytics;
//Initialization method 1
TDAnalytics.Init("APPID","SERVER");
//Initialization method 2
TDConfig config = new TDConfig("APPID","SERVER");
TDAnalytics.Init(config);
```

#### 2.2 Automatic Initialization

::: tip Tip

SDK integrated via Package Manager only supports partial configuration. Please refer to actual configuration.

:::

1. Add `TDAnalytics` prefab and set SDK configuration
   Configuration in above figure:

**Configuration**

- **Start Manually**: Whether to enable manual initialization

1. If enabled, need to manually call `TDAnalytics.Init()` to initialize SDK.
1. If not enabled, SDK will be automatically initialized when `TDAnalytics` prefab loads.

- **Enable Log**: Whether to enable logs. If enabled, will print reporting status for debugging convenience. You can also verify event reporting correctness in Editor mode. For properties that don't meet requirements, will be displayed as `warning` log in console.

**Configs**

Each Config identifies an instance. To report data to multiple projects, click "+" button at bottom right to add project configuration. You can add multiple Token configurations with different APP IDs.

- **APP ID**: Needs configuration. Your project's APP_ID, given when applying for project, please enter here.
- **SERVER URL**: Needs configuration. Data receiver URL:
- If you are using cloud service, please enter: https://global-receiver-ta.thinkingdata.cn
- If you are using private deployment version, please enter: https://DATA_COLLECTION_ADDRESS
- **MODE**: SDK instance running mode. Production environment must use NORMAL mode.
<!-- unsupported block: 34 -->

Note: Since some devices disable plaintext transmission by default, strongly recommend using HTTPS format receiver address

### 3. Common Features

Before using common features, we recommend you first understand the user identification rules. SDK will generate random number as visitor ID by default and persistently store it locally. Before user login, visitor ID will be used as identity identification ID. Note: Visitor ID will change when user reinstalls App or changes device.

#### 3.1 Setting Account ID

When user logs in, you can call `Login` to set user's account ID. TE platform will use account ID as identity identification ID, and the set account ID will be retained until `Logout` is called. Multiple calls to `Login:` will overwrite the previous account ID.

```
// User's login unique identifier, this data corresponds to #account_id in reported data, now #account_id value is TA
TDAnalytics.Login("TA");
```

<!-- unsupported block: 34 -->

**This method will not upload login event**

#### 3.2 Setting Common Event Properties

Common event properties refer to properties that every event will have. You can call `SetSuperProperties` to set common event properties. We recommend you set common event properties before sending events. For some important properties, such as user's membership level, source channel, etc., these properties need to be set in every event. In this case, you can set these properties as common event properties.

```
Dictionary<string, object> superProperties = new Dictionary<string, object>();
superProperties["channel"] = "ta";//string
superProperties["age"] = 1;//number
superProperties["isSuccess"] = true;//boolean
superProperties["birthday"] = DateTime.Now;//time
superProperties["object"] = new Dictionary<string, object>(){{ "key", "value"}};//object
superProperties["object_arr"] = new List<object>() {new Dictionary<string, object>(){{ "key", "value" }}};//object array
superProperties["arr"] = new List<object>() { "value" };//array
TDAnalytics.SetSuperProperties(superProperties);//set common event properties
```

Common event properties will be saved to cache and don't need to be called every time App starts. If `setSuperProperties:` is called to set a previously set common event property, it will overwrite the previous property.

- Event property is `Dictionary<string, object>` type, where each element represents a property
- Key is the property name, string type, must start with a letter, contain numbers, letters and underscore "\_", maximum 50 characters, case insensitive, TE will convert to lowercase
- Value is the property value, supports string, number, boolean, time, object, object array, array
<!-- unsupported block: 34 -->

**Event property and user property requirements are consistent with common event properties**

#### 3.3 Enabling Auto-tracking

Below is sample code to enable install, start, close events. If you want to learn more about SDK auto-tracking capabilities, you can view auto-tracking feature detailed introduction

<!-- unsupported block: 19 -->

HarmonyOS platform this feature is temporarily disabled

```
//Enable auto-tracking for install, start, close events
TDAnalytics.EnableAutoTrack(TDAutoTrackEventType.AppInstall | TDAutoTrackEventType.AppStart | TDAutoTrackEventType.AppEnd);
```

#### 3.4 Sending Events

You can call `Track` to upload events. We recommend you set event properties and sending conditions according to your previously prepared tracking document. Here is an example of user purchasing a product

```
Dictionary<string, object> properties = new Dictionary<string, object>(){{"product_name", "product name"}};
TDAnalytics.Track("product_buy", properties);
```

Event name is string type, must start with a letter, can contain numbers, letters and underscore "\_", maximum 50 characters.

#### 3.5 Setting User Properties

For general user properties, you can call `UserSet` to set them. Properties uploaded using this interface will overwrite previous property values. If the user property did not exist before, it will create a new user property.

```
//username is TA
TDAnalytics.UserSet(new Dictionary<string, object>(){{"user_name", "TA"}});
//username is TE
TDAnalytics.UserSet(new Dictionary<string, object>(){{"user_name", "TE"}});
```

### 4. Best Practices

The following sample code includes all the above operations. We recommend using the following steps:

```
using ThinkingData.Analytics;
if (privacy policy authorized)
{  // Initialize SDK
   TDAnalytics.Init("APPID", "SERVER");
   //Enable auto-tracking events
   TDAnalytics.EnableAutoTrack(TDAutoTrackEventType.AppInstall | TDAutoTrackEventType.AppStart | TDAutoTrackEventType.AppEnd);
   //If user is logged in, you can set user's account ID as unique identity
   TDAnalytics.Login("TA");
   //After setting common event properties, every event will have common event properties
   Dictionary<string, object> superProperties = new Dictionary<string, object>();
   superProperties["channel"] = "ta";//string
   superProperties["age"] = 1;//number
   superProperties["isSuccess"] = true;//boolean
   superProperties["birthday"] = DateTime.Now;//time
   superProperties["object"] = new Dictionary<string, object>(){{ "key", "value"}};//object
   superProperties["object_arr"] = new List<object>() {new Dictionary<string, object>(){{ "key", "value" }}};//object array
   superProperties["arr"] = new List<object>() { "value" };//array
   TDAnalytics.SetSuperProperties(superProperties);//set common event properties
   //Send event
   Dictionary<string, object> properties = new Dictionary<string, object>(){{"product_name", "product name"}};
   TDAnalytics.Track("product_buy", properties);
   //Set user properties
   TDAnalytics.UserSet(new Dictionary<string, object>(){{"user_name", "TA"}});
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

If your App has its own visitor ID management system for each user, you can call `SetDistinctId` to set visitor ID:

```
// Set visitor ID to Thinker
TDAnalytics.SetDistinctId("Thinker");
```

If you need to get the current visitor ID, you can call `GetDistinctId`:

```
//Return visitor ID
String distinctId = TDAnalytics.GetDistinctId();
```

#### 1.2 Setting Account ID

When user logs in, you can call `login` to set user's account ID. TE platform will use account ID as identity identification ID, and the set account ID will be retained until `logout` is called. Multiple calls to `login` will overwrite the previous account ID.

```
// User's login unique identifier, this data corresponds to #account_id in reported data, now #account_id value is TA
TDAnalytics.Login("TA");
```

<!-- unsupported block: 34 -->

**This method will not upload login event**

#### 1.3 Clearing Account ID

After user logs out, you can call `Logout` to clear account ID. Before the next `login` call, visitor ID will be used as identity identification ID.

```
TDAnalytics.Logout();
```

We recommend you call `Logout` at explicit logout events, such as when user performs account deregistration action, rather than when closing App.

<!-- unsupported block: 34 -->

**This method will not upload logout event**

### 2. Sending Events

After SDK initialization is completed, you can perform data tracking and collect user behavior information. Regular events can generally meet business scenario requirements. You can also use first-time, updatable events according to your actual business scenarios.

#### 2.1 Regular Events

You can call `Track` to upload events. We recommend you set event properties and sending conditions according to your previously prepared document. Here is an example of user purchasing a product:

```
Dictionary<string, object> properties = new Dictionary<string, object>{
    {"product_name", "product name"}
};
TDAnalytics.Track("product_buy", properties);
```

#### 2.2 First-time Events

First-time events refer to events that will only be recorded once for a certain device or other dimension ID. For example, in some scenarios, you may want to record an event that happens first time on a certain device, you can use first-time events to report data.

```
Dictionary<string, object> properties = new Dictionary<string, object>() {
    { "status", 1}
};
TDFirstEventModel firstEvent = new TDFirstEventModel("first_event");
firstEvent.Properties = properties;
TDAnalytics.Track(firstEvent);
```

If you want to use other dimensions other than device to judge whether it's first-time, you can customize first_check_id for first-time events:

```
// Set user ID as first_check_id for first-time event, to collect user first-time activation event
Dictionary<string, object> properties = new Dictionary<string, object>() {
    { "status", 1}
};
TDFirstEventModel firstEvent = new TDFirstEventModel("first_event", "any-user-id");
firstEvent.Properties = properties;
TDAnalytics.Track(firstEvent);
```

<!-- unsupported block: 34 -->

Note: Since the verification of whether it's first-time is completed on the server side, first-time events will be delayed by 1 hour before being stored in database.

#### 2.3 Updatable Events

You can use updatable events to implement the need to modify event data in specific scenarios. Updatable events need to specify an ID that identifies the event, and pass it when creating the updatable event object. TE backend will determine the data to be updated based on event name and event ID.

```
// Example: report updatable event, assuming event name is UPDATABLE_EVENT
// After reporting, event property status is 3, price is 100
TDUpdatableEventModel updatableEvent = new TDUpdatableEventModel("UPDATABLE_EVENT", "test_event_id");
updatableEvent.Properties = new Dictionary<string, object>{
    {"status", 3},
    {"price", 100}
};
TDAnalytics.Track(updatableEvent);

// After reporting, event property status is updated to 5, price remains unchanged
TDUpdatableEventModel updatableEvent_new = new TDUpdatableEventModel("UPDATABLE_EVENT", "test_event_id");
updatableEvent_new.Properties = new Dictionary<string, object>{
    {"status", 5}
};
TDAnalytics.Track(updatableEvent_new);
```

#### 2.4 Overwritable Events

Overwritable events are similar to updatable events, the difference is that overwritable events will completely overwrite previous data with the latest data. From the effect, it's equivalent to deleting the previous data and storing the latest data. TE backend will determine the data to be updated based on event name and event ID.

```
// Example: report overwritable event, assuming event name is OVERWRITABLE_EVENT
// After reporting, event property status is 3, price is 100
TDOverwritableEventModel overWritableEvent = new TDOverwritableEventModel("OVERWRITABLE_EVENT", "test_event_id");
overWritableEvent.Properties = new Dictionary<string, object>{
    {"status", 3},
    {"price", 100}
};
TDAnalytics.Track(overWritableEvent);

// After reporting, event property status is updated to 5, price property is deleted
TDOverwritableEventModel overWritableEvent_new = new TDOverwritableEventModel("OVERWRITABLE_EVENT", "test_event_id");
overWritableEvent_new.Properties = new Dictionary<string, object>{
    {"status", 5}
};
TDAnalytics.Track(overWritableEvent_new);
```

#### 2.5 Common Event Properties

Common event properties refer to properties that every event will upload. Based on property update frequency, common event properties are divided into `static common event properties` and `dynamic common event properties`. You can choose different common event property setting methods according to your specific business scenario requirements; we recommend you set common event properties before sending events. For the same event, when common event property, event custom property, preset property have the same Key, we will assign values according to the following priority: `custom property>dynamic common event property>static common event property>preset property`.

##### 2.5.1 Static Common Event Properties

Static common event properties are low-frequency changing properties that every event will have, such as user membership level. After setting static common event properties via `setSuperProperties`, SDK will get the set common event properties as event properties when collecting events.

```
Dictionary<string, object> superProperties = new Dictionary<string, object>() {
    {"vip_level", 2}
};
TDAnalytics.SetSuperProperties(superProperties);
```

Static common event properties will be saved to cache and don't need to be called every time App starts. If the property already exists, the newly set property will overwrite the original property value; if the property did not exist before, it will create a new property. Besides property setting, we also provide other APIs to operate static common event properties to meet daily business needs.

```
// Clear property named CHANNEL common property
TDAnalytics.UnsetSuperProperty("CHANNEL");
// Clear all common properties
TDAnalytics.ClearSuperProperties();
// Get all common properties
TDAnalytics.GetSuperProperties();
```

##### 2.5.2 Dynamic Common Event Properties

Dynamic common event properties are high-frequency changing properties that every event will have, such as user's coin count. To set dynamic common properties, need to first create dynamic common property class and implement `TDDynamicSuperPropertiesHandler` interface, override `public Dictionary<string, object> GetDynamicSuperProperties()` method. The method's return value is the dynamic common properties to set. Then call `SetDynamicSuperProperties` passing dynamic common property object. Sample as follows:

```
// 1.Define dynamic common property implementation, this example sets coin dynamic change
public class DynamicProp : TDDynamicSuperPropertiesHandler
{
    int coin = 0;
    public Dictionary<string, object> GetDynamicSuperProperties()
    {
         coin++;
         return new Dictionary<string, object>() {
             {"coin",coin}
         };
    }
}
// 2.Set dynamic common properties
TDAnalytics.SetDynamicSuperProperties(new DynamicProp());
```

#### 2.6 Recording Event Duration

If you need to record the duration of an event, you can call `TimeEvent` to start timing. Configure the event name you want to time. When you upload the event, `#duration` property will be automatically added to your event properties to represent the recorded duration, in seconds. Note that the same event name can only have one timing task.

```
//The following example completes the statistics of user staying time on a product page
//User enters product page, start timing
TDAnalytics.TimeEvent("stay_shop");
 /**do someting
    .......
 **/
//User leaves product page, timing ends, "stay_shop" event will have #duration property representing event duration
TDAnalytics.Track("stay_shop");
```

### 3. User Properties

TE platform supports the following user property setting APIs: `UserSet`, `UserSetOnce`, `UserAdd`, `UserUnset`, `UserDelete`, `UserAppend`, `UserUniqAppend`.

#### 3.1 UserSet

For general user properties, you can call `UserSet` to set them. Properties uploaded using this interface will overwrite previous property values. If the user property did not exist before, it will create a new user property.

```
//username is TA
TDAnalytics.UserSet(new Dictionary<string, object(){
    {"user_name", "TA"}
});
//username is TE
TDAnalytics.UserSet(new Dictionary<string, object(){
    {"user_name", "TE"}
});
```

#### 3.2 UserSetOnce

If you want to upload a user property that only needs to be set once, you can call `UserSetOnce` to set it. When the property already has a value, this information will be ignored:

```
//first_payment_time is 2018-01-01 01:23:45.678
TDAnalytics.UserSetOnce(new Dictionary<string, object(){
    {"first_payment_time","2018-01-01 01:23:45.678"}
});
 //first_payment_time remains 2018-01-01 01:23:45.678
TDAnalytics.UserSetOnce(new Dictionary<string, object(){
    {"first_payment_time","2018-12-31 01:23:45.678"}
});
```

#### 3.3 UserAdd

When you want to upload numeric properties, you can call `UserAdd` to perform cumulative operations on the property. If the property has not been set, it will be assigned `0` before calculation. Negative values can be passed, equivalent to subtraction operation.

```
//total_revenue is 30
TDAnalytics.UserAdd(new Dictionary<string, object(){
    {"total_revenue",30}
});
//total_revenue is 678
TDAnalytics.UserAdd(new Dictionary<string, object(){
    {"total_revenue",648}
})
```

<!-- unsupported block: 34 -->

The property key must be a string, and Value must be a number.

#### 3.4 UserUnset

If you need to reset a user's property, you can call `UserUnset` to clear the specified user property value. This interface supports passing string or list type parameters:

```
// Delete single user property
TDAnalytics.UserUnset("userPropertyName");
// Delete multiple user properties
List<string> listProps = new List<string>();
listProps.Add("aaa");
listProps.Add("bbb");
listProps.Add("ccc");

TDAnalytics.UserUnset(listProps);
```

<!-- unsupported block: 34 -->

UserUnset: The passed value is the Key of the property to be cleared.

#### 3.5 UserDelete

If you want to delete a user, you can call `UserDelete` to delete the user. You will no longer be able to query this user's user properties, but the events generated by this user can still be queried.

```
TDAnalytics.UserDelete();
```

#### 3.6 UserAppend

From v1.4.0, you can call `UserAppend` to append elements to `List` type user properties:

```
List<string> stringList = new List<string>();
stringList.Add("apple");
stringList.Add("ball");
// Append 3 elements to user property named user_list
TDAnalytics.UserAppend(new Dictionary<string, object{
    {"user_list", stringList }
});
```

#### 3.7 UserUniqAppend

From v2.4.0, you can call `UserUniqAppend` to **deduplicate and append** elements to `List` type user properties. Calling `UserUniqAppend` interface will deduplicate the appended user properties, `UserAppend` interface does not deduplicate, user properties can have duplicates.

```
//user_list property value is ["apple", "ball"]
List<string> stringList = new List<string>();
stringList.Add("apple");
stringList.Add("ball");
TDAnalytics.UserAppend(new Dictionary<string, object{
    {"user_list", stringList}
});

List<string> stringList1 = new List<string>();
stringList1.Add("apple");
stringList1.Add("cube");
//user_list property value is ["apple","apple","ball","cube"]
TDAnalytics.UserAppend(new Dictionary<string, object{
    {"user_list", stringList1}
});
//user_list property value is ["apple","ball","cube"]
TDAnalytics.UserUniqAppend(new Dictionary<string, object{
    {"user_list", stringList1}
});
```

### 4. Encryption Feature

From v2.4.0, SDK supports AES+RSA data encryption. Data encryption feature needs to be coordinated between client and server. Please consult customer success personnel for specific usage methods.

Set `TDConfig` object's `enableEncrypt` property to `true` respectively, and set default version number and public key.

```
TDConfig tdConfig = new TDConfig(appId, serverUrl);
// Enable encryption transmission (only supports iOS/Android), set default version number, public key
tdConfig.EnableEncrypt("YOUR_ENCRYPT_PUBLIC_KEY", 1);
TDAnalytics.Init(tdConfig);
```

### 5. Other Features

#### 5.1 Getting Device ID

You can call `GetDeviceId` to get device ID:

```
TDAnalytics.GetDeviceId();
// Use device ID as visitor ID
// TDAnalytics.SetDistinctId(TDAnalytics.GetDeviceId());
```

#### 5.2 Setting Default Timezone

By default, SDK will use local time when interface is called as event occurrence time for reporting. You can also set default timezone interface to specify default timezone, so all events will align event time according to your set timezone:

```
TDConfig tdConfig = new TDConfig(appId, serverUrl);
tdConfig.timezone = TDTimeZone.UTC;
TDAnalytics.Init(tdConfig);
```

<!-- unsupported block: 34 -->

Aligning event time with specified timezone will lose device local timezone information. If you need to preserve device local timezone information, you currently need to add related properties to events yourself.

#### 5.3 Time Calibration

SDK will use local time as event occurrence time by default. If user manually modifies device time, it will affect your business analysis. In this case, you can use time calibration operation to ensure the accuracy of event occurrence time. We provide `timestamp, NTP` two time calibration methods.

- You can use the current timestamp obtained from server to calibrate SDK time. After that, all calls without specified time, including event data and user property setting operations, will use the calibrated time as occurrence time.

```
// 1585633785954 is current unix timestamp in milliseconds, corresponding to Beijing time 2020-03-31 13:49:45
TDAnalytics.CalibrateTime(1585633785954);
```

- You can also set NTP server address, then SDK will try to get current time from the passed NTP service address and calibrate SDK time. If correct result is not obtained within default timeout (3 seconds), local time will be used for data reporting.

```
// Use Apple's NTP service for time calibration
TDAnalytics.CalibrateTimeWithNtp("time.apple.com");
```

<!-- unsupported block: 34 -->

1. Using NTP service for time calibration has some uncertainty, we recommend you prefer using timestamp calibration method

2. You need to carefully choose your NTP server address to ensure that user devices can quickly get server time under good network conditions

#### 5.4 Immediately Upload Data

In certain business scenarios, if you expect data to be immediately uploaded to TE server, you can call `Flush` interface

```
TDAnalytics.Flush();
```

#### 5.5 Getting Country/Region Code

In certain business scenarios, if you need to know user device's country/region code, you can get it via `GetLocalRegion`

```
TDAnalytics.GetLocalRegion();
```

#### 5.6 Lua Call Support

If you need to call directly in Lua files, you can use encapsulated Lua API. Click to download

After downloading, import `TDAnalytics.lua` and `TDAnalyticsProxy.cs` into project.

Usage example:

```
local config = {
    appId = "AppId",
    serverUrl = "ServerUrl",
    enableLog = true, --whether to enable log, default false--
    mode = 'debug' --default normal--
}
--SDK initialization--
TDAnalytics.init(config);

--If user is logged in, you can set user's account ID as unique identity
TDAnalytics.login("TA")

--After setting common event properties, every event will have common event properties
local superProperties = {}
superProperties["channel"] = "ta" -- string
superProperties["age"] = 1 -- number
superProperties["isSuccess"] = true -- boolean
superProperties["birthday"] = os.date("%Y-%m-%d %H:%M:%S") -- time
superProperties["object"] = { key="value" } -- object
superProperties["object_arr"] = { { key="value" } } -- object array
superProperties["arr"] = { "value" } -- array
TDAnalytics.setSuperProperties(superProperties) -- set common event properties

--Send event
TDAnalytics.track("product_buy", {
    product_name="product name"
});

--Set user properties
TDAnalytics.userSet({
    user_name = "TE"
})
```

#### 5.7 WeChat Auto Data Collection

For WeChat mini game platform, currently supports show event, hide event, launch event auto-tracking. Integration method:

- Download WeChat mini game plugin
  Window->Package Manager-> + -> Add package from git url

PackageManager(git install URL): https://github.com/wechat-miniprogram/minigame-tuanjie-transform-sdk.git

- Custom macro
  Edit -> Project Settings -> Scripting Define Symbols

Add global macro parameter TD_WEIXIN_GAME_MODE

Click Apply button to complete setting

- Assembly add dependency
  Project window layout ThinkingAnalytics folder -> TDAnalytics(Assembly Definition) -> Assembly Definition References -> + -> WxWasmSDKRuntime

Usage example:

```
// Enable auto-tracking events, supports show, hide, launch events
TDAnalytics.EnableAutoTrack(TDAutoTrackEventType.AppStart | TDAutoTrackEventType.AppEnd | TDAutoTrackEventType.AppInstall);
```

### 6. Channel SDK Compatibility

#### 6.1 Tencent Ads

##### 6.1.1 Solution Overview

After integrating TDAnalytics SDK, you don't need to additionally integrate Tencent Ads SDK. Once you complete TDAnalytics initialization method, the system will automatically trigger Tencent Ads SDK initialization. When you report registration, payment and other key events, the system will automatically report these event information to Tencent Ads according to your configuration.

##### 6.1.2 Integration Process

1. Download Tencent Ads SDK, currently using 1.5.4 version. Other versions also work.
1. Initialize
<!-- unsupported block: 19 -->

TDAnalytics SDK version needs >= 3.1.1

```
TDConfig config = new TDConfig("APPID","SERVER");
config.reportingToTencentSdk = 2; //1 report only to Tencent 2 report to Tencent and TE 3 report only to TE
TDAnalytics.Init(config);
```

If you need to report data to Tencent, need to do following:

After exporting WeChat mini game project, import dn-sdk-minigame.js file into project, modify game.js to import dn-sdk and complete initialization

```
import { SDK } from "./dn-sdk-minigame.js";
try {
  // Initialize
  GameGlobal.dnSDK = new SDK({
    user_action_set_id: 123xxxxxx,
    secret_key: 'xxxxxxxxxxxxxxxxxxx',
    appid: 'xxxxxxxxxxxxx',
  });
  // Report startup
  GameGlobal.dnSDK.onAppStart();
} catch {

}
```

1. Set User ID

- setOpenId
  openid is generally obtained asynchronously via backend interface call (get openid method). Please call _sdk.setOpenId()_ method after getting openid. openid and unionid can only set one, prefer openid.

After getting openid, call

```
TDAnalytics.login(openid);
```

- setUnionId
  unionid is generally obtained asynchronously via backend interface call (get unionid method). Please call _sdk.setUnionId()_ method after getting unionid. Use this method to set unionid only when openid is not available.

After getting openid, call

```
TDAnalytics.setDistinctId(unionid);
```

1. Report behavior

```
Dictionary<string, object> properties = new Dictionary<string, object>(){{"product_name", "product name"}};
TDAnalytics.Track("product_buy", properties);
```

For specific events below, need to report specified event names

Event

Event Name

Event Properties (need to include keys)

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

##### Silent Wake Up

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

##### Complete New User Guide

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
Dictionary<string, object> properties = new Dictionary<string, object>();
properties["level"] = 2;
properties["power"] = 85;
TDAnalytics.Track("product_buy", properties);
```

---

# Third Party Data

From v2.4.0 supports third party data integration feature. Below is sample code to sync data from multiple platforms:

```
TDAnalytics.EnableThirdPartySharing(TDThirdPartyType.APPSFLYER | TDThirdPartyType.ADJUST | TDThirdPartyType.TRADPLUS | TDThirdPartyType.TRACKING | TDThirdPartyType.TOPON | TDThirdPartyType.BRANCH | TDThirdPartyType.IRONSOURCE);
```

### 1.Appsflyer

Call API before AppsFlyer SDK calls start method.

```
TDAnalytics.EnableThirdPartySharing(TDThirdPartyType.APPSFLYER);
```

After creating role (optional).

```
TDAnalytics.Login("account_id");
TDAnalytics.EnableThirdPartySharing(TDThirdPartyType.APPSFLYER);
```

If TE's Login method is called (will modify account_id) or SetDistinctId method is called (will modify distinct_id), need to call EnableThirdPartySharing again to sync data.

### 2.Adjust

Call before Adjust SDK initialization.

```
TDAnalytics.EnableThirdPartySharing(TDThirdPartyType.ADJUST);
```

After creating role (optional).

```
TDAnalytics.Login("account_id");
TDAnalytics.EnableThirdPartySharing(TDThirdPartyType.ADJUST);
```

### 3.Branch

Call before Branch initialize the session.

```
TDAnalytics.EnableThirdPartySharing(TDThirdPartyType.BRANCH);
```

After creating role (optional).

```
TDAnalytics.Login("account_id");
TDAnalytics.EnableThirdPartySharing(TDThirdPartyType.BRANCH);
```

### 4.TopOn

Call before ATSDK._init._

```
TDAnalytics.EnableThirdPartySharing(TDThirdPartyType.TOPON);
```

### 5.Tradplus

Call before TradPlusSdk._initSdk._

```
TDAnalytics.EnableThirdPartySharing(TDThirdPartyType.TRADPLUS);
```

### 6.IronSource

Call after IronSourceSdk initialization.

```
TDAnalytics.EnableThirdPartySharing(TDThirdPartyType.IRONSOURCE);
```

---

# Native SDK Pluggable

::: tip Tip

From v2.6.0 supports dynamic switching of iOS/Android native platform execution code logic. Default executes Objective-C/Java logic. After switching, executes C# code logic.

For iOS/Android apps already online, after users update to "execute C# code logic" version, will lose persistent data, including device ID, account ID, visitor ID, event common properties, etc. May be judged as new user. Please choose carefully.

:::

## 1. Pluggable Process

### 1.1 iOS Platform

<!-- unsupported block: 34 -->

Default executes Objective-C code logic. After switching executes C# code logic.

- After downloading Unity SDK, unzip to `ta_unity_sdk.unitypackage` file. Double click to select import SDK. In import interface, uncheck `Plugins/iOS` directory, then import
<!-- unsupported block: 34 -->

Note: If Unity SDK has already been imported, need to check Plugins/iOS directory files. If there are no files or directories other than "ThinkingSDK", "TAThirdParty", "ThinkingAnalytics.m", directly delete Plugins/iOS. Otherwise delete above files and directories.

- Open `Project Settings` interface, switch to `iOS` tab, find `Scripting Define Symbols`, add new line input `TE_DISABLE_IOS_OC` then click `Apply` button to complete setting. Finally after development is completed, normally export Xcode project

### 1.2 Android Platform

<!-- unsupported block: 34 -->

Default executes Java code logic. After switching executes C# code logic.

- After downloading Unity SDK, unzip to `ta_unity_sdk.unitypackage` file. Double click to select import SDK. In import interface, uncheck `Plugins/Android` directory, then import
<!-- unsupported block: 34 -->

Note: If Unity SDK has already been imported, need to check Plugins/Android directory files. If there are no files or directories other than "ThinkingSDK.aar", "ThinkingSDK-gameengine.aar", "ThinkingSDK-thirdparty.aar", directly delete Plugins/Android. Otherwise delete above files.

- Open `Project Settings` interface, switch to `Android` tab, find `Scripting Define Symbols`, add new line input `TE_DISABLE_ANDROID_JAVA` then click `Apply` button to complete setting. Finally after development is completed, normally export Android project

---

# Multi-instance

### 1. Creating Multi-instance

In actual business, if you expect to send data to multiple projects, you can use our provided multi-instance feature.

Pass different project information to complete SDK initialization, can create multiple SDK instances.

```
//Multi-instance initialization
TDConfig tdConfig_1 = new TDConfig(appId_1, serverUrl_2);
TDConfig tdConfig_2 = new TDConfig(appId_2, serverUrl_2);
//Initialize first instance
TDAnalytics.Init(tdConfig_1);
//Initialize second instance
TDAnalytics.Init(tdConfig_2);
//Use multi-instance for data tracking
Dictionary<string, object> properties = new Dictionary<string, object(){
    {"product_name", "product name"}
};
//Use first instance to report data
TDAnalytics.Track("product_buy", properties, appId_1);
//Use second instance to report data
TDAnalytics.Track("product_buy", properties, appId_2);
//If not passing project ID, will default use first instance to report data
TDAnalytics.Track("product_buy", properties);
```

<!-- unsupported block: 34 -->

Visitor ID, account ID, common properties, etc. are not shared across multiple projects. Need to set separately for each APP ID instance.

### 2. Creating Light Instance

```
//First create an SDK instance
TDAnalytics.Init("APPID", "SERVER");
//Then call createLightInstance to generate light instance
string lightKey = TDAnalytics.LightInstance();
//Then set login information, report events according to lightKey
TDAnalytics.Login("123ABCabc@thinkingdata.cn", lightKey);
TDAnalytics.Track("some_event", lightKey);
```

<!-- unsupported block: 34 -->

Light instance and parent instance have same APPID, reporting address and some settings, but other information is not shared.

---

# Real-time Debugging

During SDK integration, you can view SDK logs in IDE console or use TE's Debug feature for real-time debugging.

### 1. Printing SDK Logs

```
// Enable printing data Log
TDAnalytics.EnableLog(true);
```

<!-- unsupported block: 34 -->

After enabling logs, you can filter TDAnalytics related logs in IDE to observe SDK data reporting.

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
TDConfig tdConfig = new TDConfig(appId, serverUrl);
tdConfig.mode = TDMode.Debug;
TDAnalytics.Init(tdConfig);
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

### 1. Enable Auto-tracking Events

<!-- unsupported block: 19 -->

HarmonyOS platform this feature is temporarily disabled

You can call `EnableAutoTrack` passing `TDAutoTrackEventType` to enable specified event auto-tracking.

```
public enum TDAutoTrackEventType
{
    None = 0,
    AppStart = 1 << 0,
    AppEnd = 1 << 1,
    AppCrash = 1 << 4,
    AppInstall = 1 << 5,
    AppSceneLoad = 1 << 6,
    AppSceneUnload = 1 << 7,
    All = AppStart | AppEnd | AppInstall | AppCrash | AppSceneLoad | AppSceneUnload
}
```

Auto-tracking event description:

- **AppStart**: When game enters foreground, will trigger `ta_app_start` report. Preset property `#resume_from_background` indicates whether this startup is from restart.
<!-- unsupported block: 19 -->

Note: WeChat mini game AppStart event becomes show event, event name: _`ta_mg_show`_, adds property _`start_reason`_

- **AppEnd**: When game enters background, will trigger `ta_app_end` report. Preset property `#duration` field indicates this game's foreground duration, in seconds.
<!-- unsupported block: 19 -->

Note: WeChat mini game AppEnd event becomes hide event, event name: _`ta_mg_hide`_

- **AppCrash**: When uncaught exception occurs, will trigger `ta_app_crash` report. Currently Android platform handles virtual machine uncaught exceptions. iOS platform handles Unix signal exceptions and NSException exceptions.
- **AppInstall**: When app is first opened after installation, triggers `ta_app_install` report. Does not distinguish between reinstall after uninstall. This time is only reported once after installation, subsequent updates will not report.
<!-- unsupported block: 19 -->

Note: WeChat mini game AppInstall event becomes launch event, event name: _`ta_mg_launch`_, adds property _`start_reason`_

- **AppSceneLoad**: When game scene (Scene) loads, triggers `ta_scene_loaded` report
- **AppSceneUnload**: When game scene (Scene) unloads, triggers `ta_scene_unloaded` report
  You can pass `TDAutoTrackEventType.All` to enable all currently supported auto-tracking events, or enable partial auto-tracking events according to your project needs.

```
// Enable all auto-tracking events
TDAnalytics.EnableAutoTrack(TDAutoTrackEventType.All);

// Enable auto-tracking for start and close events
TDAnalytics.EnableAutoTrack(TDAutoTrackEventType.AppStart | TDAutoTrackEventType.AppEnd);
```

<!-- unsupported block: 34 -->

Note: If you need to set custom visitor ID or common event properties, need to complete before enabling auto-tracking events. Auto-tracking events currently do not support dynamic common properties.

About `AppCrash`, if on `iOS` and `Android` platforms you only want to collect `Objective-C` and `Java` exceptions, not collect `C#` exceptions. In v2.3.1 and above versions, you can configure switch by adding `ta_public_config.xml` in `Resources` directory:

```
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- ThinkingAnalytics disable C# Exception -->
    <bool name="DisableCSharpException">true</bool>
</resources>
```

### 2. Setting Auto-tracking Event Custom Properties

From v2.2.4, you can pass custom properties to be collected when calling `EnableAutoTrack` to enable auto-tracking.

```
// Enable auto-tracking events and set custom properties
TDAnalytics.EnableAutoTrack(TDAutoTrackEventType.All, new Dictionary<string, object>() {
    {"custom_key", "custom_value"}
});
```

You can also call `SetAutoTrackProperties` to specify custom properties for specific auto-tracking events.

<!-- unsupported block: 34 -->

Note: `SetAutoTrackProperties` will not enable auto-tracking event collection. Need to use with `EnableAutoTrack` method.

```
// Set custom properties for single auto-tracking event
TDAnalytics.SetAutoTrackProperties(TDAutoTrackEventType.AppStart, new Dictionary<string, object>()
{
    {"start_key", "start_value"}
});

// Set custom properties for multiple auto-tracking events
TDAnalytics.SetAutoTrackProperties(TDAutoTrackEventType.AppInstall | TDAutoTrackEventType.AppStart, new Dictionary<string, object>()
{
    {"install_crash_key", "install_crash_value"}
});

// Enable all auto-tracking events
TDAnalytics.EnableAutoTrack(TDAutoTrackEventType.All);
```

### 3. Setting Auto-tracking Event Callback

From v2.4.0, supports setting auto-tracking event callback to dynamically set custom properties, or execute custom code at corresponding event trigger time. To set auto-tracking event callback, need to first create class and implement `TDAutoTrackEventHandler` interface, override `public Dictionary<string, object> GetAutoTrackEventProperties(int type, Dictionary<string, object>properties)` method. The method's return value is the auto-tracking event properties to set. Then call `EnableAutoTrack` passing auto-tracking event callback object:

```
// 1.Auto-tracking event callback implementation
public class AutoTrackECB : TDAutoTrackEventHandler
{
    public Dictionary<string, object> GetAutoTrackEventProperties(int type, Dictionary<string, object>properties)
    {
        return new Dictionary<string, object>()
        {
            {"AutoTrackEventProperty", DateTime.Today}
        };
    }
}
// 2.Enable auto-tracking and set event callback
TDAnalytics.EnableAutoTrack(TDAutoTrackEventType.All, new AutoTrackECB());
```

### 4. Enable Scene Auto-tracking Events

From v2.4.1, supports auto-tracking scene load and unload events.

By registering scene load, unload delegate events, to enable scene auto-tracking events.

Recommend calling in `MonoBehaviour` script's `OnEnable` method.

```
    private void OnEnable()
    {
        // Listen to scene load, unload events
        SceneManager.sceneLoaded += TDAnalytics.OnSceneLoaded;
        SceneManager.sceneUnloaded += TDAnalytics.OnSceneUnloaded;
    }
```

From v2.5.1, you can call `EnableAutoTrack` method to enable scene auto-tracking events

```
// Enable all auto-tracking events
TDAnalytics.EnableAutoTrack(TDAutoTrackEventType.All);

// Enable auto-tracking for start and close events
TDAnalytics.EnableAutoTrack(TDAutoTrackEventType.AppSceneLoad | TDAutoTrackEventType.AppSceneUnload);
```

---

# Preset Properties

### 1. Preset Properties Description

<!-- unsupported block: 34 -->

Preset properties collected by each platform will have some differences. Please refer to the following documents: Android Platform, iOS Platform

**Non-Native platform (such as PC, Switch etc. terminals) preset properties:**

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

#os_version

OS Version

Text

Such as windows10

#manufacturer

Device Manufacturer

Text

Graphics card manufacturer name

#os

OS

Text

Such as MacOS, Windows etc.

#device_id

Device ID

Text

User's device ID

#screen_height

Screen Height

Number

User's device screen height, such as 1920 etc.

#screen_width

Screen Width

Number

User's device screen height, such as 1080 etc.

#device_model

Device Model

Text

User's device model, such as iPhone 8 etc.

#app_version

APP Version

Text

Your APP version

#bundle_id

App Unique Identifier

Text

App package name

#lib

SDK Type

Text

SDK type you integrated, such as Android, iOS etc.

#lib_version

SDK Version

Text

SDK version you integrated

#network_type

Network Status

Text

Network status when uploading event, such as Mobile, LAN

#carrier

Network Carrier

Text

User's device network carrier, such as China Mobile, China Telecom etc.

#zone_offset

Timezone Offset

Number

Data time offset hours relative to UTC time

#system_language

System Language

Text

User's device system language (ISO 639-1, i.e. two lowercase English letters), such as zh, en etc.

#start_reson

Startup Reason

Text

App open or enter foreground page startup reason

### 2. Getting Preset Properties

v2.2.0 and later versions can call `TDAnalytics.GetPresetProperties()` method to get preset properties. When server-side tracking needs some preset properties from App side, you can use this method to get App side preset properties and then pass to server.

```
//Get property object
TDPresetProperties presetProperties = TDAnalytics.GetPresetProperties();

//Generate event preset properties
Dictionary<string, object> eventPresetProperties = presetProperties.ToDictionary();
/*
   {
        "#carrier": "China Telecom",
        "#os": "iOS",
        "#device_id": "A8B1C00B-A6AC-4856-8538-0FBC642C1BAD",
        "#screen_height": 2264,
        "#bundle_id": "com.sw.thinkingdatademo",
         "#app_version": "0.1",
        "#manufacturer": "Apple",
        "#device_model": "iPhone7",
        "#screen_width": 1080,
        "#system_language": "zh",
        "#os_version": "10",
        "#network_type": "WIFI",
        "#zone_offset": 8,
        "#app_version":"1.0.0"
    }
*/

//Get a specific preset property
string bundleId = presetProperties.BundleId;//package name
string appVersion = presetProperties.AppVersion;//App version number
string os = presetProperties.OS;//os type, such as Android, iOS
string systemLanguage = presetProperties.SystemLanguage;//phone system language type
int screenWidth = presetProperties.ScreenWidth;//screen width
int screenHeight = presetProperties.ScreenHeight;//screen height
string deviceModel = presetProperties.DeviceModel;//device model
string deviceId = presetProperties.DeviceId;//device unique identifier
string carrier = presetProperties.Carrier;//phone SIM card carrier info, dual SIM dual standby, takes primary card's carrier info
string manufacture = presetProperties.Manufacturer;//phone manufacturer such as HuaWei, Apple
string networkType = presetProperties.NetworkType;//network type
string osVersion = presetProperties.OSVersion;//system version number
double zoneOffset = presetProperties.ZoneOffset;//timezone offset value
string appVersion = presetProperties.appVersion;//App version number
```

<!-- unsupported block: 34 -->

IP, country and city information are generated from server-side parsing, client does not provide interface to get these properties

### 3. Disable Preset Property Collection

In v2.3.1 and above versions, supports disabling specified preset property reporting. Configure switch by adding `ta_public_config.xml` in `Resources` directory. Configured field corresponding preset property will not upload. As follows:

```
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- ThinkingAnalytics DisablePresetProperties start -->
    <string-array name="TDDisPresetProperties">
       <item>#disk</item>
       <item>#fps</item>
       <item>#ram</item>
       <!-- <item>#app_version</item> -->
       <!-- <item>#os_version</item> -->
       <!-- <item>#manufacturer</item> -->
       <!-- <item>#device_model</item> -->
       <!-- <item>#screen_height</item> -->
       <!-- <item>#screen_width</item> -->
       <!-- <item>#carrier</item> -->
       <!-- <item>#device_id</item> -->
       <!-- <item>#system_language</item> -->
       <!-- <item>#lib</item> -->
       <!-- <item>#lib_version</item> -->
       <!-- <item>#os</item> -->
       <!-- <item>#bundle_id</item> -->
       <!-- <item>#install_time</item> -->
       <!-- <item>#start_reason</item> -->
       <!-- <item>#simulator</item> -->
       <!-- <item>#network_type</item> -->
       <!-- <item>#start_reason</item> -->
       <!-- <item>#resume_from_background</item> -->
       <!-- <item>#title</item> -->
       <!-- <item>#screen_name</item> -->
       <!-- <item>#url</item> -->
       <!-- <item>#referrer</item> -->
       <!-- <item>#element_type</item> -->
       <!-- <item>#element_id</item> -->
       <!-- <item>#element_position</item> -->
       <!-- <item>#element_content</item> -->
       <!-- <item>#element_selector</item> -->
       <!-- <item>#app_crashed_reason</item> -->
    </string-array>
    <!-- ThinkingAnalytics DisablePresetProperties end -->
</resources>
```

<!-- unsupported block: 34 -->

If you disable device ID and need to use first-time events, please make sure to fill in first_check_id property
