---
code: openharmony_sdk_installation
name: "OpenHarmony"
wikiToken: CdewwjvM9irVHckq2lvctVPNnhf
parentWikiToken: FTcTwinIOi3OiRkK4MPc2Ex7neg
updateTime: 1768296999000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=openharmony_sdk_installation
---

# OpenHarmony

::: tip Tip

Before integration, please read the Pre-Integration Guide first.

SDK requires minimum system version of API 10

SDK (har format) size is approximately 56 KB

SDK Name: ThinkingData SDK

Developer: ThinkingData Information Technology (Shanghai) Co., Ltd.

Version: 1.7.6

Function: SDK collects client logs through events and user properties, with capabilities for statistics on daily active users, usage duration, retention behavior analysis, etc.

Privacy Statement: ThinkingData SDK Privacy Statement

Compliance Guide: ThinkingData SDK Compliance Guide

:::

**Latest Version:** 1.7.6

**Resource Download:** SDK Download

**SDK Package Name:** @thinkingdata/analytics

**MD5 Value:** 1b29126f457d46724e4287fecb0e4cdc

**Update Time:** 2026-01-05

### 1. SDK Integration

1. Import SDK

- Execute the following command

```
ohpm i @thinkingdata/analytics
```

- Or manually add dependency in oh-packages.json5 under dependencies, then IDE will prompt ohpm install, click to install

```
"dependencies": {
  "@thinkingdata/analytics": "1.7.6",
}
```

### 2. Initialization

```
import { TDAnalytics, TDConfig, TDMode } from '@thinkingdata/analytics';

// Method 1
TDAnalytics.init(context, "appId", "serverUrl")

// Method 2
let config = new TDConfig()
config.appId = 'appId'
config.serverUrl = 'serverUrl'
config.mode = TDMode.NORMAL
config.enableAutoCalibrated = true
TDAnalytics.initWithConfig(context, config)
```

During SDK initialization, it collects operating system version, device manufacturer, operating system, screen resolution, device model, APP version, network status, network carrier, application installation time, system language and other information for statistical analysis functions.

Parameter description:

- `APPID`: Your project's APPID, can be obtained through TE project management page
- `SERVER_URL`: Data upload URL
- If you are connecting to cloud service, please check the reporting address in Project Management -> Integration Configuration.
- If you use privately deployed version, you can customize the data collection address.
- `mode`: SDK reporting mode, default is Normal mode.
- `enableAutoCalibrated`: Automatically enable time calibration.

### 3. Common Features

Before using common features, we recommend you understand user identification rules first; SDK will generate random number as visitor ID by default, and persist visitor ID locally; before user logs in, visitor ID will be used as identity identification ID. Note: Visitor ID will change when user reinstalls App or changes device.

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
let superProperties = {};
superProperties["channel"] = "ta";//String
superProperties["age"] = 1;//Number
superProperties["isSuccess"] = true;//Boolean
superProperties["birthday"] = new Date();//Time
superProperties["object"] = {key:"value"};//Object
superProperties["object_arr"] = [{key:"value"}];//Object array
superProperties["arr"] = ["value"];//Array
TDAnalytics.setSuperProperties(superProperties)
```

Public event properties will be saved to cache, no need to call every time when starting App. If `setSuperProperties` is called to upload previously set public event properties, it will overwrite previous properties.

#### 3.3 Enable Auto-tracking

It is recommended to enable enableAutoTrack after onWindowStageCreate, the following code example enables all auto-tracking events:

```
//APP install event TDAutoTrackEventType.APP_INSTALL
//APP start event TDAutoTrackEventType.APP_START
//APP end event TDAutoTrackEventType.APP_END
//APP page view event TDAutoTrackEventType.APP_VIEW_SCREEN
//APP control click event TDAnalytics.TDAutoTrackEventType.APP_CLICK
//APP crash event TDAutoTrackEventType.APP_CRASH
TDAnalytics.enableAutoTrack(context,TDAutoTrackEventType.APP_START | TDAutoTrackEventType.APP_INSTALL | TDAutoTrackEventType.APP_END | TDAutoTrackEventType.APP_VIEW_SCREEN | TDAutoTrackEventType.APP_CLICK | TDAutoTrackEventType.APP_CRASH)
```

#### 3.4 Send Event

You can call `track` to upload events, we recommend you set event properties according to the previously prepared tracking document, here we use user purchasing a product as an example:

```
TDAnalytics.track({
  eventName: 'product_buy',
  properties:{
      product_name:"Product Name"
  }
})
```

Event name is string type, must start with letter, can contain numbers, letters and underscore "\_".

#### 3.5 Set User Properties

For general user properties, you can call `userSet` to set them, properties uploaded using this interface will overwrite existing property values; if the user property did not exist before, it will create a new user property with the same type as the passed property type, here we use setting username as an example:

```
// username is TA
TDAnalytics.userSet({
  properties: {
    username: "TA"
  }
})
//username is TE
TDAnalytics.userSet({
  properties: {
    username: "TE"
  }
})
```

### 4. Best Practices

The following example code includes all the above operations, we recommend using the following steps:

```
import { TDAnalytics, TDConfig, TDMode } from '@thinkingdata/analytics';
let config = new TDConfig()
config.appId = 'appId'
config.serverUrl = 'serverUrl'
config.enableAutoCalibrated = true
config.mode = TDMode.NORMAL
// Initialize
TDAnalytics.initWithConfig(this.context, config)
//Enable auto-tracking
TDAnalytics.enableAutoTrack(context,TDAutoTrackEventType.APP_START | TDAutoTrackEventType.APP_INSTALL | TDAutoTrackEventType.APP_END | TDAutoTrackEventType.APP_VIEW_SCREEN | TDAutoTrackEventType.APP_CLICK | TDAutoTrackEventType.APP_CRASH)
// User's unique login identifier, this data corresponds to #account_id in reported data, at this time #account_id value is TA
TDAnalytics.login("TA");
//Set public event properties
let superProperties = {
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

### 1. Set User Identification

SDK instance will use random UUID as default visitor ID for each user by default, this ID will be used as identity identification ID for user in unlogged state. Note that visitor ID will change when user reinstalls App or changes device.

#### 1.1 Set Visitor ID

::: tip Tip

Generally, you don't need to customize visitor ID. Please make sure you understand user identification rules before setting visitor ID.

If you need to replace visitor ID, you should call it immediately after SDK initialization ends, do not call multiple times to avoid creating useless accounts

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

You can call `track` to upload events, we recommend you set event properties and conditions for sending events according to the previously prepared document, here we use user purchasing a product as an example:

```
TDAnalytics.track({
    eventName: "product_buy", // Event name
    properties: {
        product_name: "Product Name"
    } //Event properties
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

You can use updatable event to achieve the requirement of modifying event data in specific scenarios. Updatable event needs to specify the ID that identifies the event and pass it when creating the updatable event object. TE will determine the data that needs to be updated based on event name and event ID.

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

Overwritable event is similar to updatable event, the difference is that overwritable event will completely overwrite historical data with the latest data, from the effect it's equivalent to deleting the previous data and storing the latest data in the database. TE will determine the data that needs to be updated based on event name and event ID.

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

##### 2.5.1 Static Public Event Properties

For some important properties, such as user's channel, nickname, ID, etc., these properties need to be set in every event, you can call `setSuperProperties` to set static public event properties, static public event properties will be globally effective.

```
// Set public event properties, all data events will have these properties
TDAnalytics.setSuperProperties({
     channel: "Channel Name",
     user_name: "Username"
});
```

Besides property setting, we also provide other APIs to operate static public event properties to meet daily business needs.

```
// Get static public event properties
let superProperties = TDAnalytics.getSuperProperties();
// Clear a static public event property, for example clear previously set 'channel' property, subsequent data will not have this property
TDAnalytics.unsetSuperProperty("channel");
// Clear all static public event properties
TDAnalytics.clearSuperProperties();
```

##### 2.5.2 Dynamic Public Event Properties

Set dynamic public property callback function through `setDynamicSuperProperties`, SDK will trigger callback function when reporting events and add the returned JSON object to event properties. `setDynamicSuperProperties` parameter is a function, the function needs to return a JSON object.

```
// Set dynamic public properties, trigger callback function when reporting events and add returned JSON object to event properties
TDAnalytics.setDynamicSuperProperties(() => {
  return {
    dy_name: 'xxx',
    dy_age: 18
  }
})
```

#### 2.6 Record Event Duration

If you need to record the duration of an event, you can call `timeEvent` to start timing. Configure the event name you want to time, when you upload that event, it will automatically add `#duration` property in your event properties to represent the recorded duration, unit is seconds. Note that the same event name can only have one timing task.

```
//The following example completes the statistics of user's stay duration on a product page
TDAnalytics.timeEvent("stay_shop");
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

SDK supports using AES+RSA to encrypt data. Data encryption feature needs client and server to cooperate, please consult customer success personnel for specific usage method.

```
let config = new TDConfig()
config.appId = 'app_id'
config.serverUrl = 'server_url'
//Enable encryption feature, set public key information
config.enableEncrypt(1,'publicKey')
TDAnalytics.initWithConfig(context, config)
```

### 5. Enable Integration with H5 Pages

If you need to integrate with JavaScript SDK that collects H5 page data, call the following interface when initializing `WebView`

```
controller: webview.WebviewController = new webview.WebviewController();
TDAnalytics.setJsBridge(controller)
```

### 6. Other Features

#### 5.1 Get Device ID

You can call `getDeviceId()` to get device ID.

```
let deviceId = TDAnalytics.getDeviceId();
```

**Device ID will be saved in cache, if user clears cache, device ID will be reset.**

#### 5.2 Calibrate Time

SDK will use local time as event occurrence time by default, if user manually modifies device time it will affect your business analysis, you can ensure the accuracy of event occurrence time through time calibration operation. We provide `timestamp` and `automatic` two time calibration methods.

- You can use the current timestamp obtained from server to calibrate SDK time. After that, all calls without specified time, including event data and user property setting operations, will use calibrated time as occurrence time.

```
// 1585633785954 is current unix timestamp, unit is milliseconds, corresponding to Beijing time 2020-03-31 13:49:45
TDAnalytics.calibrateTime(1585633785954)
```

- You can also set automatic time calibration, after that SDK will try to get current time from config interface and calibrate SDK time. If correct return result is not obtained, subsequent data will be reported using local time.

```
let config = new TDConfig()
config.appId = 'appId'
config.serverUrl = 'serverUrl'
//Set to true to enable automatic time calibration
config.enableAutoCalibrated = true
TDAnalytics.initWithConfig(context, config)
```

#### 5.3 Set Default Timezone

By default, SDK will use local time as event occurrence time. You can also set default timezone interface to specify timezone, so all events will align event time according to your set timezone:

```
import I18n from '@ohos.i18n';
let config = new TDConfig()
config.appId = 'appId'
config.serverUrl = 'serverUrl'
config.defaultTimeZone = I18n.getTimeZone('Australia/Sydney')
TDAnalytics.initWithConfig(this.context, config)
```

Aligning event time with specified timezone will lose device local timezone information. If you need to preserve device local timezone information, currently you need to add related properties to events yourself.

#### 5.4 Flush Data Immediately

In some business scenarios, if you expect data to be reported to TE server immediately, you can call `flush` interface to complete

```
TDAnalytics.flush();
```

---

# Multi-Instance

### 1. Feature Introduction

We support using multiple AppIds to create SDK instances, we call it multi-instance. Through multi-instance feature, you can report data to different projects.

### 2. Create Multi-Instance

Pass different APP ID to complete SDK initialization, you can create multiple SDK instances:

```
//Initialize config 1
var config_1 = {
  appId: "app-id-1",
  serverUrl: "https://youserverurl.1.com"
};
TDAnalytics.init(config_1);

//Initialize config 2
var config_2 = {
  appId: "app-id-2",
  serverUrl: "https://youserverurl.2.com"
};
TDAnalytics.init(config_2);

//Report event to config 1 (without app-id, default reports to config 1)
TDAnalytics.track({
    eventName: 'event_from_appid_1'
});
//Report event to config 1 (specify app-id-1)
TDAnalytics.track({
    eventName: 'event_from_appid_1'
}, 'app-id-1');
//Report event to config 2 (specify app-id-2)
TDAnalytics.track({
    eventName: 'event_from_appid_2'
}, 'app-id-2');
```

Please note that multiple SDK instances' APP IDs must be different, most data between multi-instances is not shared, details can be referred to Section 4 "Data and Settings Sharing between Multi-Instances".

### 3. Data Sharing between Multi-Instances

Most interfaces are called by instance objects, so most data and settings are not shared between multi-APPID instances, parent instances and lightweight instances, but some data and settings will take effect for all instances, here is the detailed explanation of whether all data and settings are shared between multi-instances:

1. Account related information

- System default generated visitor ID `#distinct_id`: Shared
- Visitor ID `#distinct_id` set by calling `identify`: Not shared
- Account ID `#account_id` set by calling `login`: Not shared

1. Event reporting `track` and user property reporting `user_set`, `user_setOnce`, `user_add`, `user_delete`: Not shared
1. Public properties `setSuperProperties` and dynamic public properties `setDynamicSuperPropertiesTracker`: Not shared
1. Record event duration `timeEvent`: Not shared

---

# Real-time Debugging

During SDK integration, you can perform real-time debugging by viewing SDK logs in IDE console or using TE's Debug feature.

### 1. Print SDK Logs

```
TDAnalytics.enableLog(true)
```

After enabling logs, you can observe SDK data reporting in IDE.

### 2. Enable Debug Mode

Enabling Debug mode requires the following two steps:

1. Client enables Debug mode
   Here is the client Debug mode enable example code:

```
/*
Set running mode to Debug mode
TDMode.NORMAL: Data will be stored in cache and reported according to certain cache strategy, default is NORMAL mode; recommended for production environment
TDMode.DEBUG: Data is reported one by one. When problems occur, it will prompt users with logs and exceptions; not recommended for production environment
TDMode.DEBUG_ONLY: Only validates data, will not store in database; not recommended for production environment
 */
let config = new TDConfig()
config.appId = 'appID'
config.serverUrl = 'serverUrl'
config.mode = TDMode.DEBUG
await TDAnalytics.initWithConfig(this.context, config)
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

OpenHarmony SDK supports auto-tracking of events including installation, start, end, etc.

### 1. Introduction

TE system provides automated data collection interface, you can choose the data that needs to be automatically collected according to business needs.

Currently supported auto-tracking event types are:

1. Install event: Records APP installation behavior
1. Start event: Including opening APP and opening APP from background
1. End event: Including closing APP and App entering background
1. View event: User browsing page (Ability) in APP
1. Click event: User clicking control in APP
1. Crash event: APP records crash information when crash occurs (native layer crash is not supported temporarily)

Next we will introduce each data collection method in detail

### 2. Enable Auto-tracking

You can call `enableAutoTrack` to enable auto-tracking feature:

```
//APP install event TDAutoTrackEventType.APP_INSTALL
//APP start event TDAutoTrackEventType.APP_START
//APP end event TDAutoTrackEventType.APP_END
//APP page view event TDAutoTrackEventType.APP_VIEW_SCREEN
//APP control click event TDAnalytics.TDAutoTrackEventType.APP_CLICK
//APP crash event TDAutoTrackEventType.APP_CRASH
TDAnalytics.enableAutoTrack(context,TDAutoTrackEventType.APP_START | TDAutoTrackEventType.APP_INSTALL | TDAutoTrackEventType.APP_END | TDAutoTrackEventType.APP_VIEW_SCREEN | TDAutoTrackEventType.APP_CLICK | TDAutoTrackEventType.APP_CRASH)
```

Note: enableAutoTrack needs to be called in main thread. If you need to initialize SDK in work thread, you can refer to the following code

```
const workerInstance = new worker.ThreadWorker("./workers/worker.ets");
TDAnalytics.enableAutoTrack(this.context,
  TDAutoTrackEventType.APP_START | TDAutoTrackEventType.APP_INSTALL | TDAutoTrackEventType.APP_END |
  TDAutoTrackEventType.APP_VIEW_SCREEN | TDAutoTrackEventType.APP_CRASH |
  TDAutoTrackEventType.APP_CLICK,
  (command: string, params: Object, appId?: string) => {
    //Here will callback the auto-tracking events that need to be triggered, need to send message to work thread to process
    workerInstance.postMessage({
      type: command,
      params: params
    })
  })
```

```
const workerPort = worker.workerPort;

workerPort.onmessage = (d: MessageEvents): void => {
  if (d.data.type === 'track') {
    TDAnalytics.track(d.data.params);
  } else if (d.data.type === 'timeEvent') {
    TDAnalytics.timeEvent(d.data.params);
  } else if (d.data.type === 'flush') {
    TDAnalytics.flush()
  }
}
```

### 3. Detailed Introduction

##### 3.1 Install Event

APP install event will record the actual installation of APP, reported when APP starts, event trigger time is the time of first start after APP installation, APP upgrade will not trigger install event, but delete and reinstall will report install event.

- Event name: ta_app_install

##### 3.2 Start Event

APP start event will be triggered when user opens APP or wakes APP from background, detailed event introduction:

- Event name: ta_app_start
- Preset property: `#resume_from_background`, boolean type, indicates whether APP is user opened or woke from background, value true means woke from background, false means directly opened.
- Triggered through onApplicationForeground callback in ApplicationStateChangeCallback

##### 3.3 End Event

APP end event will be triggered when user closes APP or puts APP into background, detailed event introduction:

- Event name: ta_app_end
- Preset property: `#duration`, numeric type, indicates the duration of this APP visit (from start to end), unit is seconds.
- Triggered through onApplicationBackground callback in ApplicationStateChangeCallback

##### 3.4 Page View Event

APP page view event will be triggered when user browses page (`Ability`), detailed event introduction:

- Event name: ta_app_view
- Preset properties:
  `#screen_name`, string type, is `Ability`'s simple class name

##### 3.5 Click Event

APP control click event will be triggered when user clicks control (view)

- Event name: ta_app_click
- Preset properties:
  `#screen_name`, string type, is package name.class name of control's belonging `Activity`

`#element_type`, string type, is control's type

`#element_id`, string type, is control's ID

##### 3.6 Crash Event

When APP encounters uncaught exception, APP crash event will be reported

- Event name: ta_app_crash
- Preset property: `#app_crashed_reason`, character type, records crash stack trace
- Monitored through ErrorObserver's onUnhandledException, native crash collection is not supported temporarily.

---

# Preset Properties

### 1. Preset Properties for All Events

The following preset properties are preset properties that all events (including auto-tracking events) in OpenHarmony SDK will have

**Property Name** | **Chinese Name** | **Property Type** | **Collection Time** | **Description**
#ip | IP Address | Text | Server collection | User's IP address, TE will use this to get user's geographic location information
#country | Country | Text | Server collection | User's country, generated based on IP address
#country_code | Country Code | Text | Server collection | User's country code (ISO 3166-1 alpha-2, i.e. two uppercase English letters), generated based on IP address
#province | Province | Text | Server collection | User's province, generated based on IP address
#city | City | Text | Server collection | User's city, generated based on IP address
#os_version | Operating System Version | Text | Collected once at initialization | iOS 11.2.2, Android 8.0.0, etc.
#manufacturer | Device Manufacturer | Text | Collected once at initialization | User device's manufacturer, such as Apple, vivo, etc.
#os | Operating System | Text | Collected once at initialization | Such as Android, iOS, HarmonyOS, etc.
#device_id | Device ID | Text | Collected once at initialization | User's device ID, iOS takes user's IDFV or UUID, Android takes androidID
#screen_height | Screen Height | Number | Collected once at initialization | User device's screen height, such as 1920
#screen_width | Screen Width | Number | Collected once at initialization | User device's screen height, such as 1080
#device_model | Device Model | Text | Collected once at initialization | User device's model, such as iPhone 8
#device_type | Device Type | Text | Collected once at initialization | Device type, such as "Tablet", "Phone"
#app_version | APP Version | Text | Collected once at initialization | Your APP's version
#bundle_id | Application Unique Identifier | Text | Collected once at initialization | Application package name or process name
#lib | SDK Type | Text | Collected once at initialization | SDK type you integrated, such as Android, iOS, etc.
#lib_version | SDK Version | Text | Collected once at initialization | SDK version you integrated
#network_type | Network Status | Text | Collected once at initialization, collected when network status changes | Network status when uploading event, such as WIFI, 3G, 4G, etc.
#carrier | Network Carrier | Text | Collected once at initialization | User device's network carrier, such as China Mobile, China Telecom, etc.
#zone_offset | Timezone Offset | Number | Collected when event occurs | Data time offset hours relative to UTC time
#install_time | Program Installation Time | Time | Collected once at initialization | User's application installation time, value comes from system
#system_language | System Language | Text | Collected once at initialization | User device's system language (ISO 639-1, i.e. two lowercase English letters), such as zh, en, etc.

### 2. Get Preset Properties

You can call `getPresetProperties()` method to get preset properties.

When server tracking needs some preset properties from App side, you can get App side preset properties through this method, then pass to server.

```
TDAnalytics.getPresetProperties()

/**
{
    "#os": "HarmonyOS",
    "#os_version": 10,
    "#bundle_id": "com.example.tdharmonyosdemo",
    "#install_time": "2023-10-19 18:46:00.105",
    "#manufacturer": "HUAWEI",
    "#device_model": "NOH-AN00",
    "#device_type": "phone",
    "#screen_width": 1344,
    "#screen_height": 2772,
    "#system_language": "zh-Hans",
    "#carrier": "China Telecom",
    "#app_version": "1.0.1",
    "#device_id": "9811b90b-ee24-45c1-950a-77ee0ffc7a1c",
    "#zone_offset": 8
}
*/
```

### 3. Disable Preset Properties

In some scenarios,for compliance, actual business requirements, and other considerations, you may want to disable collection of certain preset properties. You can configure `disablePresetProperties` parameter during SDK initialization to configure the array of properties that need to be disabled. Example code:

```
let config = new TDConfig()
config.appId = 'appId'
config.serverUrl = 'url'
config.disablePresetProperties =["#lib", "#lib_version", "#os", "#os_version", "#bundle_id", "#install_time", "#manufacturer", "#device_model",
"#device_type", "#screen_width", "#screen_height","#system_language","#carrier","#app_version","#device_id","#network_type","#ip"]
TDAnalytics.initWithConfig(context, config)
```
