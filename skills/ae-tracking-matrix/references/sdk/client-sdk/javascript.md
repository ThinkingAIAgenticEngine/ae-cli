---
code: javascript_sdk_installation
name: "JavaScript"
wikiToken: Ian8wU157i7or8kW1ORccuT8nWe
parentWikiToken: FTcTwinIOi3OiRkK4MPc2Ex7neg
updateTime: 1767751459000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=javascript_sdk_installation
---

# JavaScript

::: tip Tip

Before integration, please read the pre-installation preparation.

JavaScript SDK runs in browser environment and is not compatible with IE 8 and below.

JavaScript SDK size is approximately 58 KB

:::

**Latest Version: ** v2.3.1 Download

**Update Time: ** 2026-01-07

**Resource Download:** Source code

::: warning Note

This document applies to v2.0.0 and later versions. For historical versions, please refer to JS Integration Guide (V1), SDK Download (V1)

:::

### 1. Integrate SDK

SDK Support Scope:

Client Frameworks: Vue2, Vue3, React, Angular

Desktop Frameworks: Electron

#### 1.1 Automatic Integration

```
npm install thinkingdata-browser --save

"dependencies": {
    "thinkingdata-browser": "2.3.1",
},
```

Next, initialize the SDK. For specific configuration parameters, please refer to Step 2.

```
import ta from "thinkingdata-browser";
var config = {
    appId: "APP_ID",
    serverUrl: "https://YOUR_SERVER_URL",
    autoTrack: {
     pageShow: true, // Enable page show event, event name ta_page_show
     pageHide: true, // Enable page hide event, event name ta_page_hide
    }
};
ta.init(config);
```

#### 1.2 Manual Integration

Step 1: Download JavaScript SDK

The compressed package provides two types of scripts. You can choose the required script according to your needs. The asynchronous loading described below requires the `thinkingdata.min.js` file; synchronous loading requires the `thinkingdata.umd.min.js`.

Step 2: Load JavaScript SDK

You can choose asynchronous loading or synchronous loading to use the SDK. Both methods are similar in actual use, you can choose either.

When initializing the SDK, you need to pass in some configuration parameters:

- `appId`: Your project's APP_ID, must be configured. It will be given when you apply for the project, please fill it in here
- `serverUrl`: URL for uploading data, must be configured
<!-- unsupported block: 34 -->

If you are using cloud service, please enter the following URL: https://global-receiver-ta.thinkingdata.cn

If you are using a privately deployed version, please enter the following URL: https://DATA_COLLECTION_ADDRESS

:::: el-tabs

::: el-tab-pane label=Asynchronous Loading

For asynchronous loading, please use `thinkingdata.min.js`. Place the following code into the html `<script>` and configure the corresponding parameters:

```
<!--Thinking Analytics SDK BEGIN-->
<script>
    !function (e) { if (!window.ThinkingDataAnalyticalTool) { var n = e.sdkUrl, t = e.name, r = window, a = document, i = "script", l = null, s = null; r.ThinkingDataAnalyticalTool = t; var o = ["track", "quick", "login", "identify", "logout", "trackLink", "userSet", "userSetOnce", "userAdd", "userDel", "setPageProperty", "setSuperProperties", "setDynamicSuperProperties", "clearSuperProperties", "timeEvent", "unsetSuperProperties", "initInstance", "trackFirstEvent", "trackUpdate", "trackOverwrite"]; r[t] = function (e) { return function () { if (this.name) (r[t]._q = r[t]._q || []).push([e, arguments, this.name]); else if ("initInstance" === e) { var n = arguments[0]; r[t][n] = { name: n }; for (var a = 0; a < o.length; a++)r[t][n][o[a]] = r[t].call(r[t][n], o[a]); (r[t]._q1 = r[t]._q1 || []).push([e, arguments]) } else (r[t]._q = r[t]._q || []).push([e, arguments]) } }; for (var u = 0; u < o.length; u++)r[t][o[u]] = r[t].call(null, o[u]); r[t].param = e, r[t].__SV = 1.1, l = a.createElement(i), s = a.getElementsByTagName(i)[0], l.async = 1, l.src = n, s.parentNode.insertBefore(l, s) } }(
    {
        appId:'APP_ID', // APP_ID assigned by the system
        name: 'ta', // Global variable name, can be set arbitrarily, subsequent calls use this name
        sdkUrl:'./thinkingdata.min.js', // Analytics script URL
        serverUrl:'https://YOUR_SERVER_URL', // Data upload URL
        autoTrack: {
           pageShow: true, // Enable page show event, event name ta_page_show
           pageHide: true, // Enable page hide event, event name ta_page_hide
        },
        loaded: function(ta) {
           // var currentId = ta.getDistinctId();
           // ta.identify(currentId);
           // ta.quick('autoTrack');
        }
    });
</script>
<!--Thinking Analytics SDK END-->
```

Asynchronous loading specific parameter description:

- `name` is the global variable name
- `sdkUrl` is the SDK URL, must be configured
- `loaded`, initialization callback function. Since code snippet loading is asynchronous, methods with return values may not be called successfully, or track triggered before SDK loading completes may have exceptions. We provide the loaded property in parameters. The callback function in loaded will be called after initialization completes and before data reporting starts. For example, if you set user ID here, the data generated before SDK loading will have the user ID set.
  :::

::: el-tab-pane label=Synchronous Loading

For synchronous loading, please use `thinkingdata.umd.min.js`. Place the following code into the initialization code and configure the corresponding parameters:

```
<!--Thinking Analytics SDK BEGIN-->
<script src="./thinkingdata.umd.min.js"></script>
<script>
// Create SDK configuration object
var config = {
    appId: 'APP_ID',
    serverUrl: 'https://YOUR_SERVER_URL',
    autoTrack: {
     pageShow: true, // Enable page show event, event name ta_page_show
     pageHide: true, // Enable page hide event, event name ta_page_hide
    }
};
// Assign SDK instance to global variable ta, or other variable you specify
window.ta = thinkingdata;
// Initialize SDK with configuration object
ta.init(config);
</script>
<!--Thinking Analytics SDK END-->
```

:::

::::

### 2. Common Features

Before using common features, we recommend you first understand the user identification rules. SDK uses random number as visitor ID by default and persists visitor ID locally. Before user logs in, visitor ID is used as identification ID. Note: Visitor ID will change when local cache is cleared.

#### 2.1 Set Account ID

When user performs login behavior, you can call `login` to set user's account ID. TE platform prefers account ID as identity identifier. The set account ID will be saved. Multiple calls to `login` will override previous account ID:

```
// User's unique login identifier, this data corresponds to #account_id in reported data, at this time #account_id value is TA
ta.login("TA");
```

<!-- unsupported block: 34 -->

This method will not upload login event

#### 2.2 Set Common Event Properties

Common event properties refer to properties that every event will have. You can call `setSuperProperties` to set common event properties. We recommend you set common event properties before sending events. For some important properties, such as user's membership level, source channel, etc., these properties need to be set in every event. You can set these properties as common event properties.

```
var superProperties = {};
superProperties["channel"] = "ta";// String
superProperties["age"] = 1;// Number
superProperties["isSuccess"] = true;// Boolean
superProperties["birthday"] = new Date();// Date
superProperties["object"] = {key:"value"};// Object
superProperties["object_arr"] = [{key:"value"}];// Object array
superProperties["arr"] = ["value"];// Array
ta.setSuperProperties(superProperties);// Set common event properties
```

Common event properties will be saved to cache, no need to call every time you open the webpage. If you call `setSuperProperties` to upload a previously set common event property, it will override the previous property.

- Key is the property name, string type, must start with letter, contains numbers, letters and underscore "\_", maximum length is 50 characters, case insensitive, TE will convert to lowercase letters
- Value is the property value, supports string, number, boolean, date, object, object array, array
<!-- unsupported block: 34 -->

Event properties and user properties requirements are the same as common event properties

#### 2.3 Send Event

You can directly call `track` to upload custom event. We recommend you set event properties and send event conditions based on previously documented tracking plan. Here is an example of user purchasing a product:

```
ta.track("product_buy",{product_name:"product name"});
```

Event name is string type, must start with letter, can contain numbers, letters and underscore "\_", maximum length is 50 characters.

<!-- unsupported block: 34 -->

Array type is supported after v1.3.0, requires TE platform 2.5 or above.

Object type requires TE platform 3.5 or above.

#### 2.4 Set User Properties

For general user properties, you can call `userSet` to set. Properties uploaded using this interface will override original property values. If the user property did not exist before, it will create a new user property with the same type as the uploaded property. Here is an example of setting username:

```
// username is TA
ta.userSet({ username: "TA" });
// username is TE
ta.userSet({ username: "TE" });
```

### 3. Best Practices

The following example code includes all operations above. We recommend using it as follows:

```
import ta from "thinkingdata-browser";
var config = {
    appId: "APP_ID",
    serverUrl: "https://YOUR_SERVER_URL/sync_js",
    autoTrack: {
     pageShow: true, // Enable page show event, event name ta_page_show
     pageHide: true, // Enable page hide event, event name ta_page_hide
    }
};
// Initialize SDK
ta.init(config);

// If user is logged in, you can set user's account ID as unique identifier
ta.login("TA");

// Set common event properties
var superProperties = {};
superProperties["channel"] = "ta";// String
superProperties["age"] = 1;// Number
superProperties["isSuccess"] = true;// Boolean
superProperties["birthday"] = new Date();// Date
superProperties["object"] = {key:"value"};// Object
superProperties["object_arr"] = [{key:"value"}];// Object array
superProperties["arr"] = ["value"];// Array
ta.setSuperProperties(superProperties);// Set common event properties

// Send event
ta.track("product_buy", // Event name
 // Event properties
 {product_name:"product name"});

// Set user properties
ta.userSet({username: "TA" });
```

---

# Advanced Guide

### 1. Set User ID

SDK instance uses random number as default visitor ID for each user by default. This ID will be used as identification ID when user is not logged in. Note that visitor ID will change when user clears cache or changes device.

#### 1.1 Set Visitor ID

::: tip Tip

Generally, you don't need to customize visitor ID. Please ensure you understand user identification rules before setting visitor ID.

:::

```
ta.setDistinctId("Thinker");
```

If you need to get visitor ID, you can call `getDistinctId`:

```
// Return visitor ID
var distinctId = ta.getDistinctId();
```

#### 1.2 Set Account ID

When user logs in, you can call `login` to set user's account ID. TE platform will use account ID as identification ID. The set account ID will be kept until `logout` is called. Multiple calls to `login` will override previous account ID.

```
// User's unique login identifier, this data corresponds to #account_id in reported data, at this time #account_id value is TA
ta.login("TA");
```

<!-- unsupported block: 34 -->

**This method will not upload login event**

#### 1.3 Clear Account ID

After user performs logout behavior, you can call `logout` to clear account ID. Before next call to `login`, visitor ID will be used as identification ID.

```
ta.logout();
```

We recommend you call `logout` during logout operation, such as when user performs account deregistration, rather than when closing the application.

<!-- unsupported block: 34 -->

**This method will not upload logout event**

### 2. Send Event

After SDK initialization is complete, you can perform data tracking to collect user behavior information. Generally, normal events can meet business scenario requirements. You can also use first-time, updatable events according to your actual business scenarios.

#### 2.1 Normal Event

You can call `track` to upload event. We recommend you set event properties and send event conditions based on previously documented tracking plan. Here is an example of user purchasing a product:

```
ta.track(
  "product_buy", // Event name
  { product_name: "product"} // Event properties
);
```

#### 2.2 First-time Event

First-time event refers to event that will only be recorded once for a certain device or other dimension ID. For example, in some scenarios, you may want to record activation event on a certain device, then you can use first-time event to report data.

```
ta.trackFirst({
  eventName: "device_activation",
  properties: { key:"value" }
});
```

If you want to judge whether it's first time based on other dimensions besides device, you can customize first_check_id for first-time event:

```
// Set user ID as FIRST_CHECK_ID for first-time event, to implement user first activation event collection
ta.trackFirst({
  eventName: "account_activation",
  firstCheckId: "TA",
  properties: { key: "value"}
});
```

<!-- unsupported block: 34 -->

Note: Since validation of whether it's first time is done on server side, first-time events are delayed by 1 hour before being stored in database by default.

#### 2.3 Updatable Event

You can use updatable event to implement requirements for modifying event data in specific scenarios. Updatable event needs to specify the ID that identifies the event and pass it when creating updatable event object. TE backend will determine the data to be updated based on event name and event ID.

```
// Example: Report updatable event, assuming event name is UPDATABLE_EVENT
// After reporting, event property status is 3, price is 100
ta.trackUpdate({
  eventName: "UPDATABLE_EVENT",
  properties: { status: 3, price: 100 },
  eventId: "test_event_id"
});

// After reporting, event property status is updated to 5, price unchanged
ta.trackUpdate({
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
ta.trackOverwrite({
  eventName: "OVERWRITE_EVENT",
  properties: { status: 3, price: 100 },
  eventId: "test_event_id"
});

// After reporting, event property status is updated to 5, price property is deleted
ta.trackOverwrite({
  eventName: "OVERWRITE_EVENT",
  properties: { status: 5 },
  eventId: "test_event_id"
});
```

#### 2.5 Set Common Event Properties

During data collection, some fields will be shared by multiple events. For example, all events occurring on the same page should have this page's page properties. User account information should be included in all data. When calling `track` to report events, these properties need to be set every time. For such properties, you can use common property setting interface to set them uniformly.

Before introducing how to set common properties, you need to understand the characteristics of three types of common properties and choose the appropriate type according to actual needs:

- Static common properties: Effective for all pages. Lowest priority. When cache is enabled, it will be cached in localStorage or cookie. Can only set fixed values.
- Page common properties: Effective for current page, highest priority. If SDK is re-initialized, page common properties will be cleared. Can only set fixed values.
- Dynamic common properties: Priority lower than page common properties. After SDK re-initialization, dynamic common properties need to be set again. Can set dynamic variables.

##### 2.5.1 Set Static Common Properties

For some important properties, such as user's channel, nickname, ID, etc., these properties need to be set in every event. You can call `setSuperProperties` to set static common event properties. Static common event properties will be effective globally. When cache is enabled (default on), static common properties will be cached in `localStorage` or `cookie`.

The parameter for static common properties is a JSON object, and its format requirements are the same as event properties.

```
// Set common event properties, all data events will have these properties
ta.setSuperProperties({ channel: "channel name", user_name: "username" });
```

Besides property setting, we also provide other APIs to manipulate static common event properties to meet daily business needs.

```
// Get static common event properties
var superProperties = ta.getSuperProperties();
// Clear a static common event property, for example clear previously set 'channel' property, subsequent data will not have this property
ta.unsetSuperProperty("channel");
// Clear all static common event properties
ta.clearSuperProperties();
```

##### 2.5.2 Set Page Common Properties

For some static properties in a page, such as page name or address, you may want to add this property to all events triggered on this page. For such static properties that need to apply to all events in the page, you can use `setPageProperty` to set. Please note that common properties set using `setPageProperty` are only effective for the current page.

```
// Set page ID as page common property, all events triggered in this page will have the following property
ta.setPageProperty({ page_id: "page10001" });
```

If you want to get current page's page common properties, you can call `getPageProperty`:

```
// Get current page's page common properties
var pageProperty = ta.getPageProperty();
```

##### 2.5.3 Set Dynamic Common Properties

Through `setDynamicSuperProperties` to set callback function for dynamic common properties. SDK will trigger callback function when event is reported and add returned JSON object to event properties. `setDynamicSuperProperties` parameter is a function that needs to return a JSON object.

```
// Set dynamic common properties, trigger callback function when event is reported, and add returned JSON object to event properties
ta.setDynamicSuperProperties(function() {
  var d = new Date();
  d.setHours(10);
  return { date: d };
});
```

#### 2.6 Record Event Duration

If you need to record the duration of an event, you can call `timeEvent` to start timing. Configure the event name you want to time. When you upload the event, `#duration` property will be automatically added to your event properties to represent the recorded duration, in seconds. Note that the same event name can only have one timing task.

```
// The following example completes statistics of user's stay time on a product page
ta.timeEvent("stay_shop");
/**do someting
    .......
**/
// User leaves product page, timing ends, "stay_shop" event will have #duration property representing event duration
ta.track("stay_shop",{product_name:"product name"});
```

#### 2.7 Batch Sending

SDK version 1.6.1 and above supports batch sending of data

```
var config = {
    appId: '2f2d8810817c4cbfb7c38aeb8466615a',
    serverUrl: 'https://receiver-ta-preview.thinkingdata.cn',
    send_method: 'ajax',
    // Enable batch sending, default is false
    batch:true
     // or
    batch: {
        size: 6,// Automatically trigger reporting when reaching size records, default is 6
        interval: 6000,// Send immediately after interval milliseconds, default 6S
        maxLimit:500// Maximum cached data records locally, default 500
    },
};
```

- batch: Whether to enable data batch sending, optional, default value is false
- size: Automatically trigger reporting when reaching size records, default is 6, minimum value is 1, maximum value is 30
- interval: Send time interval, default is 6000
- maxLimit: Maximum cached data records locally, default is 500
  Note:

1. Batch sending function and callback function cannot be used together. For example, if track has callback, using batch sending will not execute callback.
2. Batch sending uses ajax method to send data by default.
3. If localStorage already has more than 200 records, batch sending function will fail. Only these 200 records will be saved in localStorage. New generated data will use configured method to send data. When localStorage exceeds maximum value, 20 records will be removed each time according to FIFO strategy, and these 20 records will be sent once.
4. app_js_bridge and batch_send can only choose one. If cross-domain integration is enabled, batch sending cannot be used.
5. Uses localStorage storage.
6. debug or debugOnly will send data directly, not cache locally then batch report.
7. After enabling, data will only be reported when specified count or time interval is met. For pages with frequent transitions, data may not be reported before page closes, causing some data loss. Please enable with caution.

### 3. User Properties

TE platform supported user property setting APIs are: `userSet`, `userSetOnce`, `userAdd`, `userUnset`, `userDelete`, `userAppend`, `userUniqAppend`.

#### 3.1 userSet

For general user properties, you can call `userSet` to set. Properties uploaded using this interface will override original property values. If the user property did not exist before, it will create a new user property with the same type as the uploaded property. Here is an example of setting username:

```
// username is TA
ta.userSet({ username: "TA" });
// username is TE
ta.userSet({ username: "TE" });
```

#### 3.2 userSetOnce

If the user property you want to upload only needs to be set once, you can call `userSetOnce` to set. When the property already has a value, this information will be ignored. Here is an example of setting first payment time:

```
// first_payment_time is 2018-01-01 01:23:45.678
ta.userSetOnce({first_payment_time: "2018-01-01 01:23:45.678" });
// first_payment_time is still 2018-01-01 01:23:45.678
ta.userSetOnce({first_payment_time: "2018-12-31 01:23:45.678" });
```

#### 3.3 userAdd

When you want to upload numeric properties, you can call `userAdd` to perform accumulation operation on that property. If the property has not been set, it will assign 0 then perform calculation. If negative value is passed, it's equivalent to subtraction operation.

```
// At this time total_revenue is 30
ta.userAdd({ total_revenue: 30 });
// At this time total_revenue is 678
ta.userAdd({ total_revenue: 648 });
```

#### 3.4 userUnset

When you want to clear user's user property value, you can call `userUnset` to clear specified property. If the property has not been created in the cluster, `userUnset` **will not** create that property.

```
// Clear the user property value named userPropertykey, set to NULL
ta.userUnset("userPropertykey");
```

#### 3.5 userDelete

If you want to delete a user, you can call `userDelete` to delete that user. You will no longer be able to query that user's user properties, but events generated by that user can still be queried.

```
ta.userDelete();
```

#### 3.6 userAppend

You can call `userAppend` to append elements to array type user data.

```
ta.userAppend({ user_list: ["apple", "ball"] });
```

#### 3.7 userUniqAppend

Since v1.6.0, you can call `userUniqAppend` to append unique elements to Array (List) type user data. Calling `userUniqAppend` interface will deduplicate appended user properties. `userAppend` interface does not deduplicate, user properties may have duplicates.

```
// At this time user_list property value is ["apple", "ball"]
ta.userAppend({ user_list: ["apple", "ball"] });
// At this time user_list property value is ["apple", "apple", "ball", "cube"]
ta.userAppend({ user_list: ["apple", "cube"] });
// At this time user_list property value is ["apple", "ball", "cube"]
ta.userUniqAppend({ user_list: ["apple", "cube"] });
```

### 4. Support Data Transfer Encryption

Since v1.6.0, data reporting via ajax supports data transfer encryption. You can configure encryption related information in SDK initialization config.

```
var config = {
    appId: "xxx",
    serverUrl: "xxx",
     secretKey: {
       // Encryption public key, can be obtained from TE management backend
       publicKey: 'public key',
       // Public key version number
       version: 1
     },
};
```

<!-- unsupported block: 34 -->

To support data encryption, you need to additionally import crypto-js and jsencrypt.

```
<script src="https://cdn.bootcdn.net/ajax/libs/crypto-js/4.1.1/crypto-js.js"></script>
<script src="https://cdn.bootcss.com/jsencrypt/3.2.1/jsencrypt.js"></script>
```

### 5. Multi-domain Cross-domain Integration

SDK version 1.6.1 and above supports multi-domain cross-domain integration, which can unify user behavior across two different domain websites. It allows you to more effectively observe the conversion journey of related website users.

```
ta.quick('siteLinker', {
    linker: [
        { part_url: 'thinkingdata.cn', after_hash: true },
        { part_url: 'example.com', after_hash: true }
    ]
})
```

part_url : The configured part_url string must be a substring of the URL to be integrated.

Target domain to integrate

Configuration

a tag href address

a tag integration result

thinkingdata.cn

{ part_url: 'thinkingdata.cn', after_hash: false }

https://thinkingdata.cn/

https://thinkingdata.cn/?_tasdk='d'+distinctID

after_hash: Required attribute, and attribute value must be boolean type, i.e. true or false. Configure whether \_tasdk parameter is in URL hash part (after #) or URL search part (before #, the ? part)

url

after_hash

result

https://thinkingdata.cn

false

https://thinkingdata.cn?_tasdk=distinctID

true

https://thinkingdata.cn#?_tasdk=distinctID

https://thinkingdata.cn#index

false

https://thinkingdata.cn?_tasdk=distinctID#index

true

https://thinkingdata.cn#index?_tasdk=distinctID

https://thinkingdata.cn?a=1#index

false

https://thinkingdata.cn?a=1&_tasdk=distinctID#index

true

https://thinkingdata.cn?a=1#index?_tasdk=distinctID

https://thinkingdata.cn?a=1#index?b=2

false

https://thinkingdata.cn?a=1&_tasdk=distinctID#index?b=2

true

https://thinkingdata.cn?a=1#index?b=2&_tasdk=distinctID

### 6. Other Features

#### 6.1 Get Device ID

You can get device ID by calling `getDeviceId`:

```
var deviceId = ta.getDeviceId();
```

#### 6.2 Set Default Timezone

By default, SDK uses local time at interface call time as event occurrence time for reporting. You can also set default timezone during initialization, so all events will align event time according to the timezone you set:

```
var config = {
    appId: "xxx",
    serverUrl: "xxx",
    zoneOffset:8
};
```

<!-- unsupported block: 34 -->

Note: Aligning event time with specified timezone will lose device local timezone information. If you need to preserve device local timezone information, you currently need to add related properties to events yourself.

---

# Multi Instance

You can create sub-instance objects by calling `initInstance` method. Its parameter is sub-instance name. After that, you can call sub-instance interfaces through that name.

```
// Create an instance named newInstance
ta.initInstance("newInstance");
// Set distinct_id for sub-instance and send test_event event
ta.newInstance.setDistinctId("new_distinct_id");
ta.newInstance.track("test_event");
```

By default, sub-instance uses the same configuration as main instance (`appId`, `serverUrl` etc.). And by default, sub-instance does not enable local cache.

If you need to configure parameters separately for sub-instance, you can pass configuration information during initialization. By passing different `appId` values in configuration information, you can achieve reporting data to different projects:

```
// Define sub-instance configuration parameters
var param = {
  appId: "debug-appid",
  serverUrl: "ANOTHER_SERVER_URL",
  persistenceEnabled: true, // Enable sub-instance local cache, sub-instance local cache is distinguished by sub-instance name
  send_method: "image",
  showLog: true
};

// Initialize sub-instance
ta.initInstance("anotherInstance", param);

// Report data to main instance project
ta.track("Event");

// Report data to sub-instance project
ta.anotherInstance.track("Event");
```

Main instance and sub-instance ID systems are not shared, common properties are not shared. You can set user ID for each instance separately. The following example uses this feature to report invite success and be invited events for the inviter and invited person in the invite friend event:

```
// Main instance is the newly invited user, sub-instance is the inviter
ta.login("invitee");
ta.anotherInstance.login("inviter");
// New user triggers be invited event
ta.track("be_invited");
// Inviter triggers invite new user event
ta.anotherInstance.track("invite_new_user");
```

---

# Real-time Debugging

During SDK integration, you can perform real-time debugging by viewing SDK logs in console or using TE's Debug function.

### 1. Print SDK Logs

You can set showLog to true during SDK initialization to enable SDK log switch. After enabling, reported data will be printed in browser console.

```
var config = {
    appId: "xxx",
    serverUrl: "xxx",
    showLog:true
};
```

### 2. Debug Mode

Enabling Debug mode requires the following two steps:

1. Client enables Debug mode
   You can enable Debug mode during SDK initialization:

```
var config = {
    appId: "xxx",
    serverUrl: "xxx",
    /*normal mode: Data will be cached and reported according to certain cache strategy, default is NORMAL mode; recommended for production environment
      debug mode: Data is reported one by one. When problems occur, logs and exceptions will be displayed to users; not recommended for production environment
      debug_only mode: Only validates data, will not be stored in database; not recommended for production environment
    */
    mode:"debug"
};
```

1. TE backend adds Debug device
   To avoid Debug mode going live in production environment, only specified devices can enable Debug mode. Only when Debug mode is enabled on client and the device ID is configured in TE backend's "Tracking Management" page's "Debug Data" section can Debug mode be enabled.

Device ID can be obtained through the following three ways:

- #device_id property in event data in TE platform
- Client log: Device DeviceId will be printed after SDK initialization completes
- Through instance interface call: Get device ID
<!-- unsupported block: 34 -->

Debug mode may affect data collection quality and application stability, only use for integration phase data validation, do not use in production environment.

---

# Auto Tracking

### 1. Monitor HTML Element Click Events

If you want to track click events on page elements, you can use `trackLink` to batch monitor HTML elements:

```
ta.trackLink(
  {
    tag: ["a", "button"], // HTML tags
    class: ["class1", "class2"], // Custom Class names
    id: ["id1", "id2"] // Custom ID names
  }, // Element monitoring rules
  "click", // Track event name
  {
    production: "product name",
    name: "element identifier name"
  } // Event properties
);
```

- The first parameter is the elements you need to monitor, type is JSON object, supports tracking page elements based on HTML tags, Class and id. For elements satisfying rules, click events will be monitored through event listener. When monitored element is clicked, an event will be reported. Event name and event properties take the values of the following two parameters.
- The second parameter is event name, string type, must be filled.
- The third parameter is event properties, type is JSON object. If no properties need to be reported, empty JSON can be passed.
- Event property `'name'` is element identifier. If event property `'name'` is not set in parameter three, we will use monitored element's attribute value as element identifier. Priority order:

1. Element's custom attribute `'td-name'`

2. Element's `innerHTML`

3. Element's value

4. If none is obtained, `'not obtained'` will be passed.

<!-- unsupported block: 34 -->

trackLink will set event listener for elements matching rules when called. If element identifier changes after calling interface, or new elements matching rules are generated, the event reported by listener will not change accordingly. If you need to monitor newly generated elements, you can call trackLink after element generation.

### 2. Page Show and Hide Events

- Enable method
- Since v1.6.0, `ta_page_show` and `ta_page_hide` events are added.
- SDK does not collect these events by default, you can configure through SDK initialization config.

```
var config = {
    appId: 'xxx',
    serverUrl: 'xxx',
    autoTrack: {
         // Enable ta_page_show event
         pageShow: true,
         // Enable ta_page_hide event
         pageHide: true,
         properties: { // Auto tracking custom properties
             staticKey: 'staticValue'
         },
         callback: (eventType) => { // Auto tracking callback
              if (eventType === 'pageShow') {
                  return { appShowKey: 'appShowValue' };
              } else if (eventType === 'pageHide') {
                  return { appHideKey: 'appHideValue' };
              } else {
                  return {};
              }
         }
    }
};
```

- Since v2.1.2, page show and hide events support auto tracking custom properties and auto tracking callback.
- `ta_page_hide` event will put the duration from this page show to close in property `#duration`.
- If the first ta_page_show needs to carry user related information, you can pass it during initialization.

```
var config = {
    appId: 'appId',
    serverUrl: 'serverUrl',
    send_method: 'ajax',
    accountId: 'xx',// Set account ID
    distinctId: 'xx',// Set visitor ID
    superProperties: {// Set static common properties
        super1: 'xx',
        super2: 'xx'
    }
};
```

### 3. Page View Event

TE provides interface for auto collecting page view events. You just need to use the following code, JS SDK will automatically upload user page view events, event name is ta_pageview:

```
ta.quick("autoTrack");
```

Since v1.6.0, custom properties are supported.

```
ta.quick('autoTrack', {
    name: 'test_name',
    time: new Date(),
    pro: [1, 2, 3, 4],
})
```

<!-- unsupported block: 34 -->

This interface will report a page view event immediately when called.

---

# Preset Properties

### 1. Preset Properties for All Events

The following preset properties are preset properties that all events (including auto tracking events) will have in JavaScript SDK

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

#device_id

Device ID

Text

User's device ID

#screen_height

Screen Height

Numeric

User device's screen height, such as 1920 etc.

#screen_width

Screen Width

Numeric

User device's screen width, such as 1080 etc.

#lib

SDK Type

Text

The type of SDK you integrated, such as JavaScript etc.

#lib_version

SDK Version

Text

The version of SDK you integrated

#os

Operating System

Text

Such as Android, iOS etc.

#browser

Browser Type

Text

Browser type used by user, such as Chrome, Firefox etc.

#browser_version

Browser Version

Text

Browser version used by user, such as Chrome 61.0, Firefox 57.0 etc.

#zone_offset

Timezone Offset

Numeric

Data time offset hours relative to UTC time

#system_language

System Language

Text

User's system language setting

#ua

User Agent

Text

User's current agent information, can identify client's operating system and version, CPU type, browser and version, browser rendering engine, browser language, browser plugins etc.

#utm

UTM Parameters

Text

User's advertising source information, including advertising source, advertising medium etc.

### 2. Preset Properties for Auto Tracking Events

**Property Name**

**English name**

**Property Type**

**Description**

#url

Page URL

Text

Current page's URL

#url_path

Page Path

Text

Current page's path

#referrer

Referrer URL

Text

Previous page's URL before redirect

#referrer_host

Referrer Path

Text

Previous page's path before redirect

#title

Page Title

Text

Current page's title

### 3. Get Preset Properties

When server-side tracking needs some preset properties from App client side, you can get client-side preset properties through this method, then pass to server side.

```
   // Get property object
   var presetProperties = ta.getPresetProperties();

   // Generate event preset properties
   var properties = presetProperties.toEventPresetProperties();
   /*
    {
      "#os":"Mac OS X",
      "#screen_width":1920,
      "#screen_height":1080,
      "#browser":"chrome",
      "#browser_version":"91.0.4472.114",
      "#device_id":"17a3858fafd9b4-0693d07132e2d1-34657600-2073600-17a3858fafea9b",
      "#zone_offset":8
    }
   */

    // Get a specific preset property
    var os =  presetProperties.os;// OS type, such as Android
    var screenWidth = presetProperties.screenWidth;// Screen width
    var screenHeight = presetProperties.screenHeight;// Screen height
    var browser = presetProperties.browser;// Browser type
    var browserVersion =  presetProperties.browserVersion;// Browser version number
    var deviceId = presetProperties.deviceId;// Device ID
    var zoneOffset = presetProperties.zoneOffset;// Timezone offset value
```

<!-- unsupported block: 34 -->

IP, country and city information are parsed and generated by server side, client side does not provide interface to get these properties

### 4. Disable Preset Property Collection

In some scenarios, due to compliance or actual business requirements, you may want to disable collection of certain preset properties. You can pass `disablePresetProperties` field during initialization, type is Array. Added field's corresponding preset property will not be uploaded. For example, blocking "#os", "#lib", "#lib_version", @"#url", @"#url_path" etc. preset properties, configuration as below:

```
var config = {
    appId: "APP_ID",
    serverUrl: "https://YOUR_SERVER_URL/sync_js",
    batch:true,
    autoTrack: {
     pageShow: true,
     pageHide: true,
    },
    disablePresetProperties:['#os','#lib_version','#lib','#screen_height','#screen_width','#browser','#browser_version',
    '#system_language','#ua','#utm','#referrer','#referrer_host','#url','#url_path','#title','#element_type']
};
window.ta = thinkingdata;
ta.init(config);
```

<!-- unsupported block: 34 -->

If you block device ID and need to use first-time event, please fill in first_check_id property
