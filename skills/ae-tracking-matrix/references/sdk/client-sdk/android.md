---
code: android_sdk_installation
name: "Android"
wikiToken: EnSPwbQvsi8Vm4km9JqcbhQ6nv2
parentWikiToken: FTcTwinIOi3OiRkK4MPc2Ex7neg
updateTime: 1773209364000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=android_sdk_installation
---

# Android

::: tip Tip

Before integration, please read the Pre-installation Preparation.

Android SDK requires minimum system version Android 4.0 (API 14)

Android SDK (aar format) size is approximately 200 KB

SDK Name: ThinkingData SDK

Developer: ThinkingData Information Technology (Shanghai) Co., Ltd.

Version:3.3.6

Function: SDK collects client logs through events and user properties, capable of daily active users, usage duration, retention behavior analysis, etc.

Privacy Statement: ThinkingData SDK Privacy Statement

:::

**Latest Version:** 3.3.6

**Update Time:** 2026-03-05

**Resource Download:** Source Code Download

::: warning Note

This document applies to v3.0.0 and later versions, For historical versions, please refer to Android Integration Guide (V2), SDK Download (V2)

:::

### 1. Integrate SDK

#### 1.1 Automatic Integration

- Add the following configuration dependencies in the `Project` level `build.gradle` file

```
buildscript {
    repositories {
        jcenter()
        mavenCentral()
    }
}
```

- Add dependencies in the `build.gradle` file under the `Module` directory:

```
dependencies {
    implementation 'cn.thinkingdata.android:ThinkingAnalyticsSDK:3.3.6'
}
```

#### 1.2 Manual Integration

1. Download and extract Android SDK
1. Add TDAnalytics.aar and TDCore.aar in the libs folder
<!-- unsupported block: 24 -->

<!-- unsupported block: 25 -->

<!-- unsupported block: 25 -->

1. Add the following configuration in build.gradle

```
dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar','*.aar'])
}
```

### 2. Initialization

:::: el-tabs

::: el-tab-pane label=Java

```
// Initialize SDK on the main thread
// Method 1
TDAnalytics.*init*(this, APPID, SERVER_URL);
// Method 2
TDConfig config = TDConfig.getInstance(this, APPID, TE_SERVER_URL);
TDAnalytics.*init*(config);
```

:::

::: el-tab-pane label=Kotlin

```
// Initialize SDK on the main thread
// Method 1
TDAnalytics.*init*(this, APPID, SERVER_URL)
// Method 2
val config = TDConfig.getInstance(this,APPID,TE_SERVER_URL)
TDAnalytics.*init*(config);
```

:::

::::

Parameter Description:

- `APPID`: Your project APPID, available in TE project management page
- `SERVER_URL`: Data upload URL
- For cloud service, check the reporting URL in Project Management > Integration Configuration.
- For private deployment, you can customize the data collection address.
<!-- unsupported block: 34 -->

Since Android 9.0+ restricts HTTP requests by default, please use HTTPS protocol

### 3. Common Features

Before using common features, we recommend you understand user identification rules; SDK will generate a random number as visitor ID by default, and persist the visitor ID locally; Before user login, visitor ID is used as the identity ID.Note: Visitor ID will change when user reinstalls the App or changes device.

#### 3.1 Set Account ID

When user logs in, call `login` to set account ID,  TE platform will use account ID as the identity ID, and the account ID will remain until `logout` is called.Multiple calls to `login` will override the previous account ID.

:::: el-tabs

::: el-tab-pane label=Java

```
// User login unique identifier, corresponds to #account_id in reported data, now #account_id is TA
TDAnalytics.*login*("TA");
```

:::

::: el-tab-pane label=Kotlin

```
// User login unique identifier, corresponds to #account_id in reported data, now #account_id is TA
TDAnalytics.*login*("TA")
```

:::

::::

<!-- unsupported block: 34 -->

**This method does not upload login event**

#### 3.2 Set Super Properties

Super properties are properties that every event will have, You can call `setSuperProperties` to set super properties, we recommend setting super properties before sending events.For important properties like membership level, source channel, these properties need to be set in every event, you can set them as super properties.

:::: el-tabs

::: el-tab-pane label=Java

```
try {
        JSONObject superProperties = new JSONObject();
        superProperties.put("channel","ta");// string
        superProperties.put("age",1);// number
        superProperties.put("isSuccess",true);// boolean
        superProperties.put("birthday",new Date());// time

        JSONObject object = new JSONObject();
        object.put("key", "value");
        superProperties.put("object",object);// object

        JSONObject object1 = new JSONObject();
        object1.put("key", "value");
        JSONArray  arr    = new JSONArray();
        arr.put(object1);
        superProperties.put("object_arr",arr);// object group

        JSONArray  arr1    = new JSONArray();
        arr1.put("value");
        superProperties.put("arr",arr1);// array
        // set super properties
        TDAnalytics.*setSuperProperties*(superProperties);
    } catch (JSONException e) {
        e.printStackTrace();
    }
```

:::

::: el-tab-pane label=Kotlin

```
val superProperties = JSONObject().*apply ***{**
**    **put("channel", "ta") // string
    put("age", 1) // number
    put("isSuccess", true) // boolean
    put("birthday", Date()) // time
    put("object",JSONObject().*apply ***{ **// object
        put("key", "value")
    **}**)
    put("object_arr",JSONArray().*apply ***{ **// object group
        put(JSONObject().*apply ***{**
**            **put("key", "value")
        **}**)
    **}**)
    put("arr",JSONArray().*apply ***{ **// array
        put("value")
    **}**)
**}**
TDAnalytics.setSuperProperties(superProperties)
```

:::

::::

Super properties will be saved to cache, No need to call every time App starts.If you call `setSuperProperties` with previously set property, it will override the previous value.

- Key is the property name, string type, must start with a letter, contain numbers, letters and underscores "\_", maximum length 50 characters, case-insensitive, TE will convert to lowercase
- Value supports string, number, boolean, time, object, object array, array
<!-- unsupported block: 34 -->

**Event properties and user properties follow the same requirements as super properties**

#### 3.3 Enable Auto Tracking

The following code enables install, start, and end events, For details on auto tracking capabilities, see Auto Tracking Introduction

:::: el-tabs

::: el-tab-pane label=Java

```
//TDAnalytics.TDAutoTrackEventType.*APP_INSTALL*  APP install event
//TDAnalytics.TDAutoTrackEventType.*APP_START* APP start event
//TDAnalytics.TDAutoTrackEventType.*APP_END*  APP end event

// enable auto tracking events
TDAnalytics.*enableAutoTrack*(TDAnalytics.TDAutoTrackEventType.*APP_START *| TDAnalytics.TDAutoTrackEventType.*APP_END*
*        *| TDAnalytics.TDAutoTrackEventType.*APP_INSTALL*);
```

:::

::: el-tab-pane label=Kotlin

```
//TDAnalytics.TDAutoTrackEventType.*APP_INSTALL*  APP install event
//TDAnalytics.TDAutoTrackEventType.*APP_START* APP start event
//TDAnalytics.TDAutoTrackEventType.*APP_END*  APP end event

// enable auto tracking events
TDAnalytics.enableAutoTrack(
    TDAnalytics.TDAutoTrackEventType.*APP_START *or TDAnalytics.TDAutoTrackEventType.*APP_END*
*            *or TDAnalytics.TDAutoTrackEventType.*APP_INSTALL*
)
```

:::

::::

#### 3.4 Track Event

You can call `track` to upload events, We recommend setting event properties based on your tracking plan, Here is an example of user purchasing a product:

:::: el-tabs

::: el-tab-pane label=Java

```
try {
    JSONObject properties = new JSONObject();
    properties.put("product_name","product name");
    TDAnalytics.*track*("product_buy", properties);
} catch (JSONException e) {
    e.printStackTrace();
}
```

:::

::: el-tab-pane label=Kotlin

```
val properties = JSONObject()
properties.put("product_name", "product name")
TDAnalytics.track("product_buy", properties)
```

:::

::::

Event name is string type, must start with a letter, can contain numbers, letters, underscores "\_", maximum length 50 characters.

#### 3.5 Set User Properties

For general user properties, call `userSet`, Properties uploaded via this interface will override existing values; If property doesn't exist, it will be created, Type matches the uploaded property type, Here is an example of setting username:

:::: el-tabs

::: el-tab-pane label=Java

```
try {
    // now username is TA
    JSONObject properties = new JSONObject();
    properties.put("username","TA");
    TDAnalytics.*userSet*(properties);
    // now username is TE
    JSONObject newProperties = new JSONObject();
    newProperties.put("username","TE");
    TDAnalytics.*userSet*(newProperties);
} catch (JSONException e) {
    e.printStackTrace();
}
```

:::

::: el-tab-pane label=Kotlin

```
// now username is TA
val properties = JSONObject()
properties.put("username", "TA")
TDAnalytics.userSet(properties)
// now username is TE
val newProperties = JSONObject()
newProperties.put("username", "TE")
TDAnalytics.userSet(newProperties)
```

:::

::::

### 4. Best Practices

The following example contains all operations above, We recommend following these steps:

:::: el-tabs

::: el-tab-pane label=Java

```
if (privacy policy granted) {
    TDAnalytics.*init*(this, APPID, SERVER_URL);

    // enable auto tracking events
    TDAnalytics.*enableAutoTrack*(TDAnalytics.TDAutoTrackEventType.*APP_START *| TDAnalytics.TDAutoTrackEventType.*APP_END*
*        *| TDAnalytics.TDAutoTrackEventType.*APP_INSTALL*);

    // If user is logged in, set account ID as unique identifier
    TDAnalytics.*login*("TA");
    // After setting super properties, every event will have common event properties
    try {
    JSONObject superProperties = new JSONObject();
    superProperties.put("channel","ta");// string
    superProperties.put("age",1);// number
    superProperties.put("isSuccess",true);// boolean
    superProperties.put("birthday",new Date());// time

    JSONObject object = new JSONObject();
    object.put("key", "value");
    superProperties.put("object",object);// object

    JSONObject object1 = new JSONObject();
    object1.put("key", "value");
    JSONArray  arr    = new JSONArray();
    arr.put(object1);
    superProperties.put("object_arr",arr);// object group

    JSONArray  arr1    = new JSONArray();
    arr1.put("value");
    superProperties.put("arr",arr1);// array
    // set super properties
    TDAnalytics.*setSuperProperties*(superProperties);
    } catch (JSONException e) {
    e.printStackTrace();
    }

    // send event
    try {
    JSONObject properties = new JSONObject();
    properties.put("product_name","product name");
    TDAnalytics.*track*("product_buy", properties);
    } catch (JSONException e) {
    e.printStackTrace();
    }

    // set user properties
    try {
    JSONObject userProperties = new JSONObject();
    userProperties.put("username","TA");
    TDAnalytics.*userSet*(userProperties);
    } catch (JSONException e) {
     e.printStackTrace();
    }
}

```

:::

::: el-tab-pane label=Kotlin

```
if (privacy policy granted) {
    TDAnalytics.*init*(this, APPID, SERVER_URL);
    // If user is logged in, set account ID as unique identifier
    TDAnalytics.*login*("TA");
    // After setting super properties, every event will have common event properties
    val superProperties = JSONObject().*apply ***{**
    **    **put("channel", "ta") // string
        put("age", 1) // number
        put("isSuccess", true) // boolean
        put("birthday", Date()) // time
        put("object",JSONObject().*apply ***{ **// object
            put("key", "value")
        **}**)
        put("object_arr",JSONArray().*apply ***{ **// object group
            put(JSONObject().*apply ***{**
    **            **put("key", "value")
            **}**)
        **}**)
        put("arr",JSONArray().*apply ***{ **// array
            put("value")
        **}**)
    **}**
    // set super properties
    TDAnalytics.*setSuperProperties*(superProperties);

    // enable auto tracking events
    TDAnalytics.enableAutoTrack(
        TDAnalytics.TDAutoTrackEventType.*APP_START *or TDAnalytics.TDAutoTrackEventType.*APP_END*
    *            *or TDAnalytics.TDAutoTrackEventType.*APP_INSTALL*
    )

    // send event
    val properties = JSONObject()
    properties.put("product_name", "product name")
    TDAnalytics.track("product_buy", properties)

    // set user properties
    JSONObject properties = new JSONObject();
    properties.put("username","TA");
    TDAnalytics.*userSet*(properties);
}

```

:::

::::

---

# Advanced Guide

### 1. Set User Identifier

SDK instance uses random UUID as default visitor ID, This ID serves as identity for unauthenticated users.Note: Visitor ID changes on reinstall or device change.

#### 1.1 Set Visitor ID

::: tip Tip

Generally, you don't need to customize visitor ID. Make sure you understand user identification rules before setting visitor ID.

If you need to replace visitor ID, call immediately after SDK initialization, Do not call multiple times to avoid creating useless accounts

:::

If your App has its own visitor ID management system, then you can call *`setDistinctId`* to set visitor ID:

:::: el-tabs

::: el-tab-pane label=Java

```
// Set visitor ID to Thinker
TDAnalytics.*setDistinctId*("Thinker");
```

:::

::: el-tab-pane label=Kotlin

```
// Set visitor ID to Thinker
TDAnalytics.setDistinctId("Thinker")
```

:::

::::

To get current visitor ID, call `getDistinctId`:

:::: el-tabs

::: el-tab-pane label=Java

```
// return visitor ID
String distinctId = TDAnalytics.*getDistinctId*();
```

:::

::: el-tab-pane label=Kotlin

```
// return visitor ID
val distinctId = TDAnalytics.getDistinctId()
```

:::

::::

#### 1.2 Set Account ID

When user logs in, call `login` to set account ID,  TE platform will use account ID as the identity ID, and the account ID will remain until `logout` is called.Multiple calls to `login` will override the previous account ID.

:::: el-tabs

::: el-tab-pane label=Java

```
// User login unique identifier, corresponds to #account_id in reported data, now #account_id is TA
TDAnalytics.*login*("TA");
```

:::

::: el-tab-pane label=Kotlin

```
// User login unique identifier, corresponds to #account_id in reported data, now #account_id is TA
TDAnalytics.*login*("TA")
```

:::

::::

<!-- unsupported block: 34 -->

**This method does not upload login event**

#### 1.3 Clear Account ID

When user logs out, call `logout` to clear account ID, Before next `login` call, visitor ID will be used as identity.

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.*logout*();
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.*logout*()
```

:::

::::

We recommend calling `logout` only on explicit logout events, such as when user explicitly deregisters account, not needed when closing App.

<!-- unsupported block: 34 -->

**This method does not upload logout event**

### 2. Track Events

After SDK initialization, you can start data tracking, to collect user behavior information.Normal events usually meet business requirements, You can also use first events, updatable events based on your needs.

#### 2.1 Normal Event

You can call `track` to upload events, We recommend setting event properties based on your tracking plan, Here is an example of user purchasing a product:

:::: el-tabs

::: el-tab-pane label=Java

```
// Store purchase event
try {
    JSONObject properties = new JSONObject();
    properties.put("product_name","product name");
    TDAnalytics.*track*("product_buy",properties);
} catch (JSONException e) {
    e.printStackTrace();
}
```

:::

::: el-tab-pane label=Kotlin

```
// Store purchase event
val properties = JSONObject()
properties.put("product_name", "product name")
TDAnalytics.track("product_buy", properties)
```

:::

::::

#### 2.2 First Event

First event is recorded only once per device or other dimension ID.For example, you may want to record device activation event, you can use first event to report.

:::: el-tabs

::: el-tab-pane label=Java

```
JSONObject properties = new JSONObject();
try {
    properties.put("key", "value");
} catch (JSONException e) {
    e.printStackTrace();
}

TDAnalytics.*track*(new TDFirstEventModel("device_activation", properties));
```

:::

::: el-tab-pane label=Kotlin

```
val properties = JSONObject()
properties.put("key", "value")
TDAnalytics.track(TDFirstEventModel("device_activation", properties))
```

:::

::::

If you want to judge first by other dimension than device, you can customize first_check_id for first event:

:::: el-tabs

::: el-tab-pane label=Java

```
// Set user ID as first_check_id to track user first activation event
TDFirstEventModel model = new TDFirstEventModel("device_activation", properties);
model.setFirstCheckId("TA");
TDAnalytics.*track*(model);
```

:::

::: el-tab-pane label=Kotlin

```
// Set user ID as first_check_id to track user first activation event
val model = TDFirstEventModel("device_activation", properties)
model.setFirstCheckId("TA")
TDAnalytics.track(model)
```

:::

::::

<!-- unsupported block: 34 -->

Note: First events are validated on server, default delay 1 hour before storage.

#### 2.3 Updatable Event

Updatable events allow modifying event data in specific scenarios.Updatable event requires specifying event ID when creating.TE determines data to update by event name and event ID.

:::: el-tabs

::: el-tab-pane label=Java

```
// Example: Report updatable event, assume event name UPDATABLE_EVENT
// After report, status is 3, price is 100
JSONObject properties = new JSONObject();
try {
    properties.put("status", 3);
    properties.put("price", 100);
} catch (JSONException e) {
    e.printStackTrace();
}
TDAnalytics.*track*(new TDUpdatableEventModel("UPDATABLE_EVENT", properties, "test_event_id"));
// After report, status updated to 5, price unchanged
JSONObject properties_new = new JSONObject();
try {
    properties_new.put("status", 5);
} catch (JSONException e) {
    e.printStackTrace();
}
TDAnalytics.*track*(new TDUpdatableEventModel("UPDATABLE_EVENT", properties_new, "test_event_id"));
```

:::

::: el-tab-pane label=Kotlin

```
// Example: Report updatable event, assume event name UPDATABLE_EVENT
// After report, status is 3, price is 100
val properties = JSONObject()
properties.put("status", 3)
properties.put("price", 100)
TDAnalytics.track(TDUpdatableEventModel("UPDATABLE_EVENT", properties, "test_event_id"))
// After report, status updated to 5, price unchanged
val properties_new = JSONObject()
properties_new.put("status", 5)
TDAnalytics.track(TDUpdatableEventModel("UPDATABLE_EVENT", properties_new, "test_event_id"))
```

:::

::::

#### 2.4 Overwriteable Event

Overwriteable event is similar to updatable event, difference is overwriteable event completely overwrites historical data, effectively deleting previous data and storing new data.TE determines data to update by event name and event ID.

:::: el-tabs

::: el-tab-pane label=Java

```
// Example: Report overwriteable event, assume event name OVERWRITE_EVENT
// After report, status is 3, price is 100
JSONObject properties = new JSONObject();
try {
    properties.put("status", 3);
    properties.put("price", 100);
} catch (JSONException e) {
    e.printStackTrace();
}
TDAnalytics.*track*(new TDOverWritableEventModel("OVERWRITE_EVENT", properties, "test_event_id"));
// After report, status updated to 5, price property deleted
JSONObject properties_new = new JSONObject();
try {
    properties_new.put("status", 5);
} catch (JSONException e) {
    e.printStackTrace();
}
TDAnalytics.*track*(new TDOverWritableEventModel("OVERWRITE_EVENT", properties_new, "test_event_id"));
```

:::

::: el-tab-pane label=Kotlin

```
// Example: Report overwriteable event, assume event name OVERWRITE_EVENT
// After report, status is 3, price is 100
val properties = JSONObject()
properties.put("status", 3)
properties.put("price", 100)
TDAnalytics.track(TDOverWritableEventModel("OVERWRITE_EVENT", properties, "test_event_id"))
// After report, status updated to 5, price property deleted
val properties_new = JSONObject()
properties_new.put("status", 5)
TDAnalytics.track(TDOverWritableEventModel("OVERWRITE_EVENT", properties_new, "test_event_id"))
```

:::

::::

#### 2.5 Super Properties

Super properties are properties uploaded with every event.By update frequency, super properties are static and dynamic.Choose different methods based on your business needs;we recommend setting super properties before sending events.When super property, custom property, preset property have same Key, priority: custom > dynamic super > static super > preset.

##### 2.5.1 Static Super Properties

Static super properties are low-frequency properties like membership level.After setting static super properties via `setSuperProperties`, SDK will get these properties during event collection.

:::: el-tabs

::: el-tab-pane label=Java

```
// set super properties
try {
    JSONObject superProperties = new JSONObject();
    superProperties.put("vip_level",2);
    TDAnalytics.*setSuperProperties*(superProperties);
} catch (JSONException e) {
    e.printStackTrace();
}
```

:::

::: el-tab-pane label=Kotlin

```
// set super properties
val superProperties = JSONObject()
superProperties.put("vip_level", 2)
TDAnalytics.setSuperProperties(superProperties)
```

:::

::::

Static super properties will be saved to cache, no need to call every time App starts. If the property already exists, the newly set property will override the previous value; if the property did not exist before, it will be created. In addition to property setting, we also provide other APIs to manage static common event properties to meet daily business needs.

:::: el-tabs

::: el-tab-pane label=Java

```
// clear a super property
TDAnalytics.*unsetSuperProperty*("Channel");
// clear all super properties
TDAnalytics.*clearSuperProperties*();
// get all super properties
TDAnalytics.*getSuperProperties*();
```

:::

::: el-tab-pane label=Kotlin

```
// clear a super property
TDAnalytics.*unsetSuperProperty*("Channel")
// clear all super properties
TDAnalytics.*clearSuperProperties*()
// get all super properties
TDAnalytics.*getSuperProperties*()
```

:::

::::

##### 2.5.2 Dynamic Super Properties

Dynamic super properties are high-frequency properties like coin count.After setting dynamic super properties via `setDynamicSuperPropertiesTracker`, SDK will automatically get properties from `getDynamicSuperProperties`, and add them to triggered events.

:::: el-tabs

::: el-tab-pane label=Java

```
int coin = 0;
TDAnalytics.*setDynamicSuperProperties*(new TDAnalytics.TDDynamicSuperPropertiesHandler() {
    @Override
    public JSONObject getDynamicSuperProperties() {
        JSONObject dynamicSuperProperties = new JSONObject();
        coin++;// coin count updates frequently
        try {
            dynamicSuperProperties.put("coin",coin);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        return dynamicSuperProperties;
    }
});
```

:::

::: el-tab-pane label=Kotlin

```
var coin = 0
TDAnalytics.setDynamicSuperProperties(object :TDDynamicSuperPropertiesHandler{
    override fun getDynamicSuperProperties(): JSONObject {
        val dynamicSuperProperties = JSONObject()
        coin++ // coin count updates frequently
        dynamicSuperProperties.put("coin", coin)
        return dynamicSuperProperties
    }
})
```

:::

::::

#### 2.6 Time Event

To record event duration, call `timeEvent` to start timing.Configure the event name to time, When you upload the event, `#duration` will be added automatically, in seconds. Note: Only one timing task per event name.

:::: el-tabs

::: el-tab-pane label=Java

```
// Example: track user stay duration on product page
try {
    // User enters product page, start timing
    TDAnalytics.*timeEvent*("stay_shop");
    /**do someting
    .......
    **/
    // User leaves product page, timing ends, "stay_shop" event will have #duration property
    TDAnalytics.*track*("stay_shop");
} catch (JSONException e) {
    e.printStackTrace();
}
```

:::

::: el-tab-pane label=Kotlin

```
// Example: track user stay duration on product page
// User enters product page, start timing
TDAnalytics.timeEvent("stay_shop")
*/**do someting*
* * .......*
* */*
// User leaves product page, timing ends, "stay_shop" event will have #duration property
TDAnalytics.track("stay_shop")
```

:::

::::

### 3. User Properties

TE supports user property APIs: `userSet`, `userSetOnce`, `userAdd`, `userUnset`, `userDelete`, `userAppend`, `userUniqAppend`

#### 3.1 userSet

For general user properties, you can call `userSet` to set them. Properties uploaded via this interface will override existing values, If property doesn't exist, it will be created, Type matches the uploaded property type, Here is an example of setting username:

:::: el-tabs

::: el-tab-pane label=Java

```
try {
    // now username is TA
    JSONObject properties = new JSONObject();
    properties.put("username","TA");
    TDAnalytics.*userSet*(properties);
    // now username is TE
    JSONObject newProperties = new JSONObject();
    newProperties.put("username","TE");
    TDAnalytics.*userSet*(newProperties);
} catch (JSONException e) {
    e.printStackTrace();
}
```

:::

::: el-tab-pane label=Kotlin

```
// now username is TA
val properties = JSONObject()
properties.put("username", "TA")
TDAnalytics.userSet(properties)
// now username is TE
val newProperties = JSONObject()
newProperties.put("username", "TE")
TDAnalytics.userSet(newProperties)
```

:::

::::

#### 3.2 userSetOnce

If you want to set user property only once, call `userSetOnce`, If property already has value, this call will be ignored, Example: setting first payment time:

:::: el-tabs

::: el-tab-pane label=Java

```
try {
    // first_payment_time is 2018-01-01 01:23:45.678
    JSONObject properties = new JSONObject();
    properties.put("first_payment_time","2018-01-01 01:23:45.678");
    TDAnalytics.*userSetOnce*(properties);

    // first_payment_time still 2018-01-01 01:23:45.678
    JSONObject newProperties = new JSONObject();
    newProperties.put("first_payment_time","2018-12-31 01:23:45.678");
    TDAnalytics.*userSetOnce*(newProperties);

} catch (JSONException e) {
    e.printStackTrace();
}
```

:::

::: el-tab-pane label=Kotlin

```
// first_payment_time is 2018-01-01 01:23:45.678
val properties = JSONObject()
properties.put("first_payment_time", "2018-01-01 01:23:45.678")
TDAnalytics.userSetOnce(properties)

// first_payment_time still 2018-01-01 01:23:45.678
val newProperties = JSONObject()
newProperties.put("first_payment_time", "2018-12-31 01:23:45.678")
TDAnalytics.userSetOnce(newProperties)
```

:::

::::

#### 3.3 userAdd

For numeric property accumulation, call `userAdd`.If property not set, it will be initialized to 0 then calculated, Negative values allowed (subtraction). Example: cumulative payment amount:

:::: el-tabs

::: el-tab-pane label=Java

```
try {
    // now total_revenue is 30
    JSONObject properties = new JSONObject();
    properties.put("total_revenue",30);
    TDAnalytics.*userAdd*(properties);

    // now total_revenue is 678
    JSONObject newProperties = new JSONObject();
    newProperties.put("total_revenue",648);
    TDAnalytics.*userAdd*(newProperties);
} catch (JSONException e) {
    e.printStackTrace();
}
```

:::

::: el-tab-pane label=Kotlin

```
// now total_revenue is 30
val properties = JSONObject()
properties.put("total_revenue", 30)
TDAnalytics.userAdd(properties)

// now total_revenue is 678
val newProperties = JSONObject()
newProperties.put("total_revenue", 648)
TDAnalytics.userAdd(newProperties)
```

:::

::::

#### 3.4 userUnset

To clear user property value, call `userUnset` for specified property, if the property has not been created in the cluster yet, `userUnset` **will not** create the property

:::: el-tabs

::: el-tab-pane label=Java

```
// Reset single user property
TDAnalytics.*userUnset*("key1");
// Reset multiple user properties
TDAnalytics.*userUnset*("key1", "key2", "key3");
```

:::

::: el-tab-pane label=Kotlin

```
// Reset single user property
TDAnalytics.*userUnset*("key1")
// Reset multiple user properties
TDAnalytics.*userUnset*("key1", "key2", "key3")
```

:::

::::

#### 3.5 userDelete

To delete a user, call `userDelete`, You won't be able to query user properties, but events remain queryable.

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.*userDelete*();
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.*userDelete*()
```

:::

::::

#### 3.6 userAppend

Call `userAppend` to append elements to array-type user property.

:::: el-tabs

::: el-tab-pane label=Java

```
try {
    // list is user property user_list value, JSONArray type
    JSONArray list = new JSONArray("[\"apple\", \"ball\"]");
    JSONObject properties = new JSONObject();
    properties.put("user_list", list);
    // Call user_append to append to user_list. If not exists, will create.
    TDAnalytics.*userAppend*(properties);
} catch (JSONException e) {
    e.printStackTrace();
}
```

:::

::: el-tab-pane label=Kotlin

```
// list is user property user_list value, JSONArray type
val list = JSONArray("[\"apple\", \"ball\"]")
val properties = JSONObject()
properties.put("user_list", list)
// Call user_append to append to user_list. If not exists, will create.
TDAnalytics.userAppend(properties)
```

:::

::::

#### 3.7 userUniqAppend

Call `userUniqAppend` to append to array-type user property.`userUniqAppend` deduplicates appended properties,  `userAppend` doesn't deduplicate, properties can be duplicated.

:::: el-tabs

::: el-tab-pane label=Java

```
try {
    // list is user property user_list value, JSONArray type
    // now user_list property value is["apple", "ball"]
    JSONArray list = new JSONArray("[\"apple\", \"ball\"]");
    JSONObject properties = new JSONObject();
    properties.put("user_list", list);
    TDAnalytics.*userAppend*(properties);


    // now user_list property value is["apple","apple","ball","cube"]
    JSONArray list1 = new JSONArray("[\"apple\", \"cube\"]");
    JSONObject properties1 = new JSONObject();
    properties1.put("user_list", list1);
    TDAnalytics.*userAppend*(properties1);

    // now user_list property value is["apple", "ball","cube"]
    TDAnalytics.*userUniqAppend*(properties1);

} catch (JSONException e) {
    e.printStackTrace();
}
```

:::

::: el-tab-pane label=Kotlin

```
// list is user property user_list value, JSONArray type
// now user_list property value is["apple", "ball"]
val list = JSONArray("[\"apple\", \"ball\"]")
val properties = JSONObject()
properties.put("user_list", list)
TDAnalytics.userAppend(properties)

// now user_list property value is["apple","apple","ball","cube"]
val list1 = JSONArray("[\"apple\", \"cube\"]")
val properties1 = JSONObject()
properties1.put("user_list", list1)
TDAnalytics.userAppend(properties1)

// now user_list property value is["apple", "ball","cube"]
TDAnalytics.userUniqAppend(properties1)
```

:::

::::

### 4. Encryption

From v2.8.0, SDK supports AES+RSA encryption.Encryption requires client and server coordination, Please consult customer success for details.

:::: el-tabs

::: el-tab-pane label=Java

```
TDConfig config = TDConfig.getInstance(mContext,TA_APP_ID,TA_SERVER_URL);
// enable encryption, set public key
config.enableEncrypt(1,"publicKey")
```

:::

::: el-tab-pane label=Kotlin

```
val config = TDConfig.getInstance(mContext,TA_APP_ID,TA_SERVER_URL)
// enable encryption, set public key
config.enableEncrypt(1,"publicKey")
```

:::

::::

### 5. H5 Integration

To integrate with JavaScript SDK for H5 pages, call the following interface when initializing `WebView`, See H5 and APP SDK Integration section for details

:::: el-tabs

::: el-tab-pane label=Java

```
// Integrate H5 page data
TDAnalytics.setJsBridge(webView);
```

:::

::: el-tab-pane label=Kotlin

```
// Integrate H5 page data
TDAnalytics.setJsBridge(webView)
```

:::

::::

### 6. Other Features

#### 6.1 Get Device ID

Get device ID by calling `getDeviceId`:

:::: el-tabs

::: el-tab-pane label=Java

```
String deviceID = TDAnalytics.*getDeviceId*();// Device ID is Android ID
```

:::

::: el-tab-pane label=Kotlin

```
val deviceID = TDAnalytics.getDeviceId() // Device ID is Android ID
```

:::

::::

#### 6.2 Set Default Timezone

By default, SDK uses local time as event time.You can also specify timezone via default timezone interface, so all events will be aligned to your timezone:

:::: el-tabs

::: el-tab-pane label=Java

```
// Get TDConfig instance
TDConfig config = TDConfig.getInstance(this, TA_APP_ID, TA_SERVER_URL);
// Set default timezone to UTC
config.setDefaultTimeZone(TimeZone.getTimeZone("UTC"));
// Initialize SDK
TDAnalytics.*init*(config);
```

:::

::: el-tab-pane label=Kotlin

```
// Get TDConfig instance
val config = TDConfig.getInstance(this, TA_APP_ID, TA_SERVER_URL)
// Set default timezone to UTC
config.*defaultTimeZone *= TimeZone.getTimeZone("UTC")
// Initialize SDK
TDAnalytics.init(config)
```

:::

::::

<!-- unsupported block: 34 -->

Aligning event time with specified timezone loses local timezone info.If you need local timezone, add it as event property yourself.

#### 6.3 Calibrate Time

SDK uses local time as event time by default, If user manually modifies device time, it affects your analysis, You can calibrate time to ensure accuracy.We provide timestamp and NTP calibration methods.

- You can calibrate SDK time using server timestamp.All calls without specified time will use calibrated time.
  :::: el-tabs

::: el-tab-pane label=Java

```
// 1585633785954 is unix timestamp in ms, Beijing time 2020-03-31 13:49:45
TDAnalytics.calibrateTime(1585633785954);
```

:::

::: el-tab-pane label=Kotlin

```
// 1585633785954 is unix timestamp in ms, Beijing time 2020-03-31 13:49:45
TDAnalytics.calibrateTime(1585633785954)
```

:::

::::

- You can also set NTP server address, SDK will try to get current time from NTP and calibrate.If correct result not obtained within 3 seconds timeout, local time will be used for reporting.
  :::: el-tabs

::: el-tab-pane label=Java

```
// Use Apple NTP service for time calibration
TDAnalytics.calibrateTimeWithNtp("time.apple.com");
```

:::

::: el-tab-pane label=Kotlin

```
// Use Apple NTP service for time calibration
TDAnalytics.calibrateTimeWithNtp("time.apple.com")
```

:::

::::

<!-- unsupported block: 34 -->

1. NTP calibration has some uncertainty, We recommend timestamp calibration

2. Choose NTP server address carefully, to ensure devices can quickly get server time

#### 6.4 Flush Data

In some scenarios, if you want to report data immediately, call `flush` interface

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.flush();
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.flush()
```

:::

::::

#### 6.5 Get Country/Region Code

In some scenarios, if you need country/region code, call `getLocalRegion`

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.getLocalRegion();
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.getLocalRegion()
```

:::

::::

#### 6.6 Disable AndroidID Collection

If you don't want AndroidID collection code in project, use plugin to isolate sensitive properties like AndroidID.

Android SDK Version

Plugin Version

[oldest - 3.0.0)

1.2.0

[3.0.0 - 3.1.0]

2.1.0

(3.1.0 - latest]

2.2.0

```
  buildscript {
     repositories {
         google()
         jcenter()
     }
     dependencies {
         classpath 'cn.thinkingdata.android:android-gradle-plugin2:2.2.0'
      }
}
// Configure disableAndroidID to true in the project build.gradle file
apply plugin: 'cn.thinkingdata.android'
android {}
ThinkingAnalytics {
    debug = true
    sdk{
        disableAndroidID = true
     }
}
```

Parameter Details:

- debug : Whether to enable compile log, true to enable, default false.
- exclude : Exclude scanning classes under certain path, can be set via exclude = ['cn.thinkingdata.android','android.support'].
- useInclude , include: Only scan classes under certain path, can be set via useInclude = true, include= ['cn.thinkingdata.android','android.support'].
- disableAndroidID : Whether to disable system API for AndroidID, From plugin V2.1.0, set disableAndroidID = true.

#### 6.7 Support IP Reporting

To prevent/solve DNS hijacking issues, SDK parses ServerUrl to get IP and reports directly. Example:

:::: el-tabs

::: el-tab-pane label=Java

```
TDConfig config = TDConfig.getInstance(this, APPID, TE_SERVER_URL);
List<TDConfig.TDDNSService> list = new ArrayList<>();
list.add(TDConfig.TDDNSService.*CLOUD_ALI*);
list.add(TDConfig.TDDNSService.*CLOUD_FLARE*);
list.add(TDConfig.TDDNSService.*CLOUD_GOOGLE*);
config.enableDNSService(list);
```

:::

::: el-tab-pane label=Kotlin

```
val config = TDConfig.getInstance(this, APPID, TE_SERVER_URL)
val list: MutableList<TDDNSService> = ArrayList()
list.add(TDDNSService.*CLOUD_ALI*)
list.add(TDDNSService.*CLOUD_FLARE*)
list.add(TDDNSService.*CLOUD_GOOGLE*)
config.enableDNSService(list)
```

:::

::::

#### 6.8 Support SDK Error Callback

<!-- unsupported block: 19 -->

Requires Android SDK version >= 3.2.0

In some scenarios, you may want custom handling on network failure, You can register errorCallback, example:

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.*registerErrorCallback*(new TDAnalytics.TDSendDataErrorCallback() {
    @Override
    public void onSDKErrorCallback(int code, String errorMsg, String ext) {
        // *todo*
*    *}
});
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.registerErrorCallback(object : TDAnalytics.TDSendDataErrorCallback {
    override fun onSDKErrorCallback(code: Int, errorMsg: String?, ext: String?) {
        // *todo*
*    *}
})
```

:::

::::

Error Code

Error Code

Description

1001

Network request failed

---

# Third-party Data

<!-- unsupported block: 19 -->

If the SDK version is below 3.0.0, Plugin Version should be 1.3.0; if the SDK version is 3.0.0 or above, Plugin Version should be 2.0.0 or above

```
implementation 'cn.thinkingdata.android:TAThirdParty:2.0.2'
```

Sample code for syncing multiple platforms:

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.*enableThirdPartySharing*(TDThirdPartyType.*APPS_FLYER *| TDThirdPartyType.*ADJUST*);
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.enableThirdPartySharing(TDThirdPartyType.APPS_FLYER or TDThirdPartyType.ADJUST)
```

:::

::::

<!-- unsupported block: 34 -->

For additional parameters, use`enableThirdPartySharing(int var1, Map<String, Object> var2)`, This API doesn't support bitwise operations

If using proguard, add the following to config:

```
-dontwarn cn.thinkingdata.thirdparty.**
-keep class cn.thinkingdata.thirdparty.** { *; }
-keep class cn.thinkingdata.module.routes.** { *; }
```

### 1. Appsflyer

Call API before AppsFlyer SDK start method:

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.enableThirdPartySharing(TDThirdPartyType.*APPS_FLYER*);
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.enableThirdPartySharing(TDThirdPartyType.*APPS_FLYER*)
```

:::

::::

After character creation (optional):

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.login("account_id")
TDAnalytics.enableThirdPartySharing(TDThirdPartyType.*APPS_FLYER*);
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.login("account_id")
TDAnalytics.enableThirdPartySharing(TDThirdPartyType.*APPS_FLYER*)
```

:::

::::

After TE login or identify, call enableThirdPartySharing to update user ID.

Note: AppsFlyer setAdditionalData overwrites user ID on each call.You can set parameters via our `enableThirdPartySharing`:

:::: el-tabs

::: el-tab-pane label=Java

```
Map<String, Object> additionalData = new HashMap<>();
additionalData.put("af_test_key1", "test1");
additionalData.put("af_test_key2", "test2");
TDAnalytics.enableThirdPartySharing(
    TDThirdPartyType.*APPS_FLYER*,
    additionalData
)
```

:::

::: el-tab-pane label=Kotlin

```
val additionalData: MutableMap<String, Any> = HashMap()
additionalData["af_test_key1"] = "test1"
additionalData["af_test_key2"] = "test2"
TDAnalytics.enableThirdPartySharing(
    TDThirdPartyType.*APPS_FLYER*,
    additionalData
)
```

:::

::::

### 2. Adjust

Call before Adjust SDK initialization:

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.enableThirdPartySharing(TDThirdPartyType.*ADJUST*);
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.enableThirdPartySharing(TDThirdPartyType.*ADJUST*)
```

:::

::::

After character creation (optional):

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.login("accoount_id")
TDAnalytics.enableThirdPartySharing(TDThirdPartyType.*ADJUST*);
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.login("accoount_id")
TDAnalytics.enableThirdPartySharing(TDThirdPartyType.*ADJUST*)
```

:::

::::

### 3. Branch

Call before Branch session initialization:

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.*enableThirdPartySharing*(TDThirdPartyType.*BRANCH*);
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.*enableThirdPartySharing*(TDThirdPartyType.*BRANCH*)
```

:::

::::

After character creation (optional):

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.login("accoount_id")
TDAnalytics.*enableThirdPartySharing*(TDThirdPartyType.*BRANCH*);
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.login("accoount_id")
TDAnalytics.*enableThirdPartySharing*(TDThirdPartyType.*BRANCH*)
```

:::

::::

### 4. TopOn

Call before ATSDK initialization:

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.*enableThirdPartySharing*(TDThirdPartyType.*TOP_ON*);
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.*enableThirdPartySharing*(TDThirdPartyType.*TOP_ON*)
```

:::

::::

After TE login/identify, call enableThirdPartySharing again.

Note: TopOn initCustomMap overwrites user ID on each call.You can set parameters via our `enableThirdPartySharing`:

:::: el-tabs

::: el-tab-pane label=Java

```
Map<String, Object> customMap = new HashMap<>();
customMap.put("key1", "value1");
customMap.put("key2", "value2");
TDAnalytics.*enableThirdPartySharing*(TDThirdPartyType.*TOP_ON, customMap*);
```

:::

::: el-tab-pane label=Kotlin

```
val customMap: MutableMap<String, Any> = HashMap()
customMap["key1"] = "value1"
customMap["key2"] = "value2"
TDAnalytics.*enableThirdPartySharing*(TDThirdPartyType.*TOP_ON, customMap*)
```

:::

::::

### 5. Tradplus

Call before TradPlusSdk initialization:

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.*enableThirdPartySharing*(TDThirdPartyType.*TRAD_PLUS*);
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.*enableThirdPartySharing*(TDThirdPartyType.*TRAD_PLUS*)
```

:::

::::

### 6. IronSource

Call after IronSourceSdk initialization:

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.*enableThirdPartySharing*(TDThirdPartyType.*IRON_SOURCE*);
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.*enableThirdPartySharing*(TDThirdPartyType.*IRON_SOURCE*)
```

:::

::::

### 7. AppLovin

- Impression Level
  Call before AppLovinSdk initialization:

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.*enableThirdPartySharing*(TDThirdPartyType.*APPLOVIN_IMPRESSION*);
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.*enableThirdPartySharing*(TDThirdPartyType.*APPLOVIN_IMPRESSION*)
```

:::

::::

- User Level
  To get monetization data, create `MaxAdRevenueListener`, and override `onAdRevenuePaid()` method, get monetization data and report via TE SDK `enableThirdPartySharing`, then pass listener to setRevenueListener(), Example code:

```
void onAdRevenuePaid(final MaxAd ad){
    TDAnalytics.*enableThirdPartySharing*(TDThirdPartyType.*APPLOVIN_USER,ad*);
}
```

---

# Multiple Instances

### 1. Feature Introduction

We support multiple APPIDs to create SDK instances (multiple instances).With multiple instances, you can report to different projects.

### 2. Create Multiple Instances

Pass different APP IDs to initialize SDK for multiple instances:

:::: el-tabs

::: el-tab-pane label=Java

```
// Initialize SDK
TDAnalytics.init(this, TA_APP_ID, TA_SERVER_URL);
TDAnalyticsAPI.track("some_event",properties, TA_APP_ID);

TDAnalytics.init(this, ANOTHER_TA_APP_ID, TA_SERVER_URL);
TDAnalyticsAPI.track("some_event",properties, ANOTHER_TA_APP_ID)

TDAnalytics.init(this, TA_APP_ID, TA_SERVER_URL, NAME);
TDAnalyticsAPI.track("some_event",properties, NAME);
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.init(this, TA_APP_ID, TA_SERVER_URL)
TDAnalytics.init(this, ANOTHER_TA_APP_ID, TA_SERVER_URL)

TDAnalyticsAPI.track("some_event",properties, TA_APP_ID)
TDAnalyticsAPI.track("some_event",properties, ANOTHER_TA_APP_ID)
```

:::

::::

Note: Multiple SDK instances must have different APP IDs, Most data between instances is not shared, for details, see section 4 “Data and Settings Sharing Across Multiple Instances”.

### 3. Create Light Instance

You can create multiple instances under same APPID via light instance

:::: el-tabs

::: el-tab-pane label=Java

```
// First create an SDK instance
TDAnalytics.init(this, TA_APP_ID, TA_SERVER_URL);
// Call *lightInstance* from the previously created instance to generate a light instance
String uuid = TDAnalytics.*lightInstance*();
TDAnalyticsAPI.login("anotherAccount",uuid);
TDAnalyticsAPI.track("some_event",properties,uuid);
```

:::

::: el-tab-pane label=Kotlin

```
// First create an SDK instance
TDAnalytics.init(this, TA_APP_ID, TA_SERVER_URL)
// Call lightInstance from the previously created instance to generate a light instance
val uuid = TDAnalytics.lightInstance()
TDAnalyticsAPI.login("anotherAccount", uuid)
TDAnalyticsAPI.track("some_event", properties, uuid)
```

:::

::::

The light instance shares the same APPID, reporting URL, and some settings as the parent instance, but other information is not shared. For details, see section 4 “Data and Settings Sharing Across Multiple Instances”.

### 4. Data and Settings Sharing Across Multiple Instances

Most interfaces are called by instance objects, so most data and settings are not shared across multiple APPID instances, parent instances, and light instances. However, some data and settings apply to all instances. Below is a detailed description of whether all data and settings are shared across multiple instances:

1. Account-related information

- System-generated visitor ID `#distinct_id`: Shared
- Visitor ID `#distinct_id` set via `identify`: Not shared
- Account ID `#account_id` set via `login`: Not shared

1. Event reporting `track` and user property reporting `user_set`, `user_setOnce`, `user_add`, `user_delete`: Not shared
1. Common properties `setSuperProperties` and dynamic common properties `setDynamicSuperPropertiesTracker`: Not shared
1. SDK configuration information sharing across multiple instances:

- Reporting strategy related (i.e., reporting interval and batch data size): Shared, determined by the project data of the first instantiated APPID
- Network condition for upload `setNetworkType`: Shared
- Print upload data log `EnableTrackLogging`: Shared

1. Auto tracking events

- It is recommended to enable auto tracking events on only one instance
- Supports reporting auto tracking events to multiple APP IDs
- Whether auto tracking event configurations are shared across multiple instances:
- Set control ID `setViewID`: Not shared
- Custom control properties `setViewProperties` etc.: Not shared
- Ignore auto tracking events for a specific page `ignoreAutoTrackActivity` etc.: Not shared
- Ignore click events for a specific control type `ignoreViewType`: Not shared
- Ignore a specific control `ignoreView`: Not shared
- All annotations: You can specify the effective instance by setting the appId parameter. If not set, the configuration is shared across all instances, for example:

```
@ThinkingDataIgnoreTrackAppViewScreen(appId = "debug-appid")
```

1. Record event duration `timeEvent`: Not shared

---

# Real-time Debugging

During SDK integration, you can view SDK logs in the IDE console or use TE's Debug feature for real-time debugging.

### 1. Print SDK Logs

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.enableLog(true);
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.enableLog(true)
```

:::

::::

<!-- unsupported block: 34 -->

After enabling logs, you can filter ThinkingAnalytics-related logs in the IDE to observe SDK data reporting.

### 2. Enable Debug Mode

Enabling Debug mode requires the following two steps:

1. Enable Debug mode on the client
   Here is the sample code to enable Debug mode on the client:

:::: el-tabs

::: el-tab-pane label=Java

```
// Get TDConfig instance
TDConfig config = TDConfig.getInstance(this, TA_APP_ID, TA_SERVER_URL);
/*
Set the run mode to Debug mode
NORMAL mode: Data will be stored in cache and reported according to a certain cache policy, default is NORMAL mode; recommended for production environment
Debug mode: Data is reported one by one. When problems occur, it will prompt users via logs and exceptions; not recommended for production environment
DebugOnly mode: Only validates data, will not store it; not recommended for production environment
 */
config.setMode(TDConfig.TDMode.DEBUG);
// Initialize SDK
TDAnalytics.*init*(config);
```

:::

::: el-tab-pane label=Kotlin

```
// Get TDConfig instance
val config = TDConfig.getInstance(this, TA_APP_ID, TA_SERVER_URL)
/*
Set the run mode to Debug mode
NORMAL mode: Data will be stored in cache and reported according to a certain cache policy, default is NORMAL mode; recommended for production environment
Debug mode: Data is reported one by one. When problems occur, it will prompt users via logs and exceptions; not recommended for production environment
DebugOnly mode: Only validates data, will not store it; not recommended for production environment
 */
config.setMode(TDConfig.TDMode.*DEBUG*)
// Initialize SDK
TDAnalytics.init(config)
```

:::

::::

1. Add debug device in TE backend
   To prevent Debug mode from going live in production, only specified devices can enable Debug mode. Debug mode can only be enabled when the client has Debug mode enabled and the device ID is configured in the "Debug Data" section of the "Tracking Management" page in the TE backend.

Device ID can be obtained in the following three ways:

- The #device_id property in event data on the TE platform
- Client logs: SDK will print the device DeviceId after initialization
- Via instance interface call: Get Device ID
<!-- unsupported block: 34 -->

Debug mode may affect data collection quality and App stability, only use it for data verification during integration, do not use in production environment.

---

# Auto Tracking

Android SDK supports automatic collection of events including install, start, and end.

### 1. Introduction

The TE system provides interfaces for automated data collection. You can choose the data to collect automatically based on your business needs.

Currently supported auto tracking event types:

1. Install event: Records APP installation behavior
1. Start event: Includes opening APP and opening APP from background
1. End event: Includes closing APP and APP entering background, also collects start duration
1. View event: User browsing pages (`Activity`) in the APP
1. Click event: User clicking controls in the APP
1. Crash event: Records crash information when APP crashes
   Next, we will introduce the collection method for each type of data in detail

### 2. Enable Auto Tracking

You can call `enableAutoTrack` to enable auto tracking:

:::: el-tabs

::: el-tab-pane label=Java

```
// APP install event TDAnalytics.TDAutoTrackEventType.*APP_INSTALL*
// APP start event TDAnalytics.TDAutoTrackEventType.*APP_START*
// APP end event TDAnalytics.TDAutoTrackEventType.*APP_END*
// APP page view event TDAnalytics.TDAutoTrackEventType.*APP_VIEW_SCREEN*
// APP click control event TDAnalytics.TDAutoTrackEventType.*APP_CLICK*
// APP crash event TDAnalytics.TDAutoTrackEventType.*APP_CRASH*
// enable auto tracking events
TDAnalytics.*enableAutoTrack*(TDAnalytics.TDAutoTrackEventType.*APP_START *| TDAnalytics.TDAutoTrackEventType.*APP_END*
*        *| TDAnalytics.TDAutoTrackEventType.*APP_INSTALL *| TDAnalytics.TDAutoTrackEventType.*APP_VIEW_SCREEN *| TDAnalytics.TDAutoTrackEventType.*APP_CLICK*
*        *| TDAnalytics.TDAutoTrackEventType.*APP_CRASH*);
```

:::

::: el-tab-pane label=Kotlin

```
// APP install event TDAnalytics.TDAutoTrackEventType.*APP_INSTALL*
// APP start event TDAnalytics.TDAutoTrackEventType.*APP_START*
// APP end event TDAnalytics.TDAutoTrackEventType.*APP_END*
// APP page view event TDAnalytics.TDAutoTrackEventType.*APP_VIEW_SCREEN*
// APP click control event TDAnalytics.TDAutoTrackEventType.*APP_CLICK*
// APP crash event TDAnalytics.TDAutoTrackEventType.*APP_CRASH*
// enable auto tracking events
TDAnalytics.enableAutoTrack(
    TDAnalytics.TDAutoTrackEventType.*APP_START *or TDAnalytics.TDAutoTrackEventType.*APP_END*
*            *or TDAnalytics.TDAutoTrackEventType.*APP_INSTALL *or TDAnalytics.TDAutoTrackEventType.*APP_VIEW_SCREEN *or TDAnalytics.TDAutoTrackEventType.*APP_CLICK*
*            *or TDAnalytics.TDAutoTrackEventType.*APP_CRASH*
)
```

:::

::::

::: tip Tip

If you need to collect control click events or Fragment view events, you need to integrate the auto tracking plugin. See section 7 of this page.

:::

### 3. Detailed Introduction

#### 3.1 Install Event

The APP install event records the actual installation of the APP, reported when the APP starts. The event trigger time is the first launch time after APP installation. APP upgrades do not trigger install events, but uninstalling and reinstalling will report an install event.

- Event name: ta_app_install

#### 3.2 Start Event

The APP start event is triggered when the user opens the APP or wakes the APP from the background. Detailed event description:

- Event name: ta_app_start
- Preset property: `#resume_from_background`, boolean type, indicates whether the APP was opened by the user or woken from the background. Value true means woken from the background, false means directly opened.
- Note: Starting from V2.8.1, SDK no longer allows start events triggered by background silent launch (such as directly starting a background service or push) by default. You can enable it by adding a resource file `ta_public_config.xml` under res/values

```
<?xml version="1.0" encoding="utf-8"?>
<resources>
   <bool name="TAEnableBackgroundStartEvent">true</bool>
</resources>
```

#### 3.3 End Event

The APP end event is triggered when the user closes the APP or moves the APP to the background. Detailed event description:

- Event name: ta_app_end
- Preset property: `#duration`, numeric type, indicates the duration of the APP visit (from start to end), in seconds.

#### 3.4 Page View Event

The APP page view event is triggered when the user browses a page (`Activity`). Detailed event description:

- Event name: ta_app_view
- Preset properties:
  `#screen_name`, string type, the package name.class name of the `Activity`

`#title`, string type, the title of the `Activity`, the value is the `title` property of the `Activity`

You can add other properties to the page view event to extend its analytical value. Below are methods for customizing page view event properties

##### 3.4.1 Enable Auto Tracking for Fragment Page View Events

For Fragments of `android.support.v4.app.Fragment`, you can use the following method to auto track page view events:

After SDK initialization, call the following method to enable Fragment auto tracking

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.trackFragmentAppViewScreen();
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.trackFragmentAppViewScreen()
```

:::

::::

For Fragments of `android.app.Fragment`, you can manually call the page view event using the following method:

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.trackViewScreen(targetFragment);
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.trackViewScreen(targetFragment)
```

:::

::::

- `targetFragment` can be replaced with the Fragment for which you want to upload page view events

##### 3.4.2 Customize Page View Event Properties

For page view events of `Activity`, you can add properties by implementing the `ScreenAutoTracker` interface. Through the following two methods, you can add page URL information and other custom properties to the page view event:

:::: el-tabs

::: el-tab-pane label=Java

```
public class MainActivity extends AppCompatActivity implements ScreenAutoTracker {
    private Context mContext;

    @Override
    public String getScreenUrl() {
        return "thinkingdata://page/main";
    }

    @Override
    public JSONObject getTrackProperties() throws JSONException {
        JSONObject jsonObject = new JSONObject();
        jsonObject.put("param1", "ABCD");
        jsonObject.put("param2", "thinkingdata");
        return jsonObject;
    }
}
```

:::

::: el-tab-pane label=Kotlin

```
class MainActivity : AppCompatActivity(), ScreenAutoTracker {

    override fun getScreenUrl(): String {
        return "thinkingdata://page/main";
    }

    override fun getTrackProperties(): JSONObject {
        val jsonObject = JSONObject()
        jsonObject.put("param1", "ABCD")
        jsonObject.put("param2", "thinkingdata")
        return jsonObject
    }
}
```

:::

::::

       The return value of `getScreenUrl` will serve as the URL Schema of the `Activity`. When the page view event is triggered, the preset property `#url` will be added with the value of the current page's URL Schema; at the same time, the SDK will get the URL Schema of the previous page, and if available, it will be added to the preset property `#referrer` as the referring address.

        The return value of `getTrackProperties` is the custom property of the page view event, which will be automatically added to the page view event

For page view events of `Fragment`, we provide two ways to add properties

- Add properties via `@ThinkingDataFragmentTitle`
  :::: el-tabs

::: el-tab-pane label=Java

```
@ThinkingDataFragmentTitle(title = "myFragment")
public class ListViewFragment extends BaseFragment {
  // your fragment implementations
}
```

:::

::: el-tab-pane label=Kotlin

```
@ThinkingDataFragmentTitle(title = "myFragment")
class ListViewFragment : BaseFragment() {
  // your fragment implementations
}
```

:::

::::

- Implement the `ScreenAutoTracker` interface
  :::: el-tabs

::: el-tab-pane label=Java

```
  @Override
  public JSONObject getTrackProperties() {
      try {
          JSONObject properties = new JSONObject();
          properties.put("#title", "RecyclerViewFragment");
          return properties;
      } catch (JSONException e) {
          // ignore
      }
      return null;
  }
```

:::

::: el-tab-pane label=Kotlin

```
override fun getTrackProperties(): JSONObject {
    val jsonObject = JSONObject()
    properties.put("#title", "RecyclerViewFragment");
    return jsonObject
}
```

:::

::::

#### 3.5 Click Event

The APP control click event is triggered when the user clicks a control (view)

- Event name: ta_app_click
- Preset properties:
  `#screen_name`, string type, the package name.class name of the `Activity` the control belongs to

`#title`, string type, the title of the `Activity` the control belongs to, the value is the `title` property of the `Activity`

`#element_content`, string type, the content of the control

`#element_type`, string type, the type of the control

`#element_id`, string type, the ID of the control, defaults to `android:id`

`#element_position`, string type, only uploaded when the control has a `position` attribute

`#element_selector`, string type, the concatenation of the control's `viewPath`

For click events of Views on the page, there are multiple ways to set more properties to extend their analytical value:

##### 3.5.1 Customize Control ID

The control ID defaults to `android:id`. If this property cannot be obtained, or you want to customize the control ID, you can use the following method to override the `#element_id` property

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.setViewID(view,viewID);
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.setViewID(view,viewID)
```

:::

::::

For `Dialog`, you can use the following method:

:::: el-tabs

::: el-tab-pane label=Java

```
//android.app.Dialog
TDAnalytics.setViewID(view,viewID);
```

:::

::: el-tab-pane label=Kotlin

```
//android.app.Dialog
TDAnalytics.setViewID(view,viewID)
```

:::

::::

Or

:::: el-tabs

::: el-tab-pane label=Java

```
//android.support.v7.app.AlertDialog
TDAnalytics.setViewID(view,viewID);
```

:::

::: el-tab-pane label=Kotlin

```
//android.support.v7.app.AlertDialog
TDAnalytics.setViewID(view,viewID)
```

:::

::::

The parameter `view` is the view for which you need to set the control ID, and the parameter `viewID` is the control ID to set. When the click event of this control is uploaded, the value of `#element_id` will be the value passed in here

##### 3.5.2 Customize Control Click Event Properties

You can add custom properties to the click event of a control (view) using the following method:

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.setViewProperties(view,properties);
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.setViewProperties(view,properties);
```

:::

::::

The parameter `view` is the view for which you need to set custom properties, and the parameter `properties` is of type `JSONObject`, representing the custom properties to set. When the click event of this control is uploaded, these properties will be added.

Additionally, for `ExpandableListView`, `ListView`, and `GridView`, you can implement interfaces via the Adapter to add custom properties when clicking an item.

- `ExpandableListView` needs to implement the `ThinkingExpandableListViewItemTrackProperties` interface

```
public interface ThinkingExpandableListViewItemTrackProperties {
    /**
     * Add properties for clicking the item at groupPosition, childPosition
     * @param groupPosition
     * @param childPosition
     * @return
     * @throws JSONException
     */
    JSONObject getThinkingChildItemTrackProperties(int groupPosition, int childPosition) throws JSONException;

    /**
     * Add properties for clicking the item at groupPosition
     * @param groupPosition
     * @return
     * @throws JSONException
     */
    JSONObject getThinkingGroupItemTrackProperties(int groupPosition) throws JSONException;
}
```

- `ListView` and `GridView` need to implement the `ThinkingAdapterViewItemTrackProperties` interface

```
public interface ThinkingAdapterViewItemTrackProperties {
    /**
     * Add properties for clicking the item at position
     * @param position
     * @return
     * @throws JSONException
     */
    JSONObject getThinkingItemTrackProperties(int position) throws JSONException;
}
```

##### 3.5.3 Add Page (`Activity`) Information to `AlertDialog` Click Events

For click events of `AlertDialog` (`android.app.AlertDialog` and `android.support.v7.app.AlertDialog`), you can bind the associated page (`Activity`) using the following method, and the `#screen_name` and `#title` properties of the associated page will be added to the click event.

- If you display the dialog by calling `dialog.show()`, use the following method:

```
dialog.setOwnerActivity(targetActivity);
```

- If you display the dialog by calling `builder.show()`, use the following method:

```
builder.show().setOwnerActivity(activity);
```

##### 3.5.4 Upload Control Click Events via Annotation `@ThinkingDataTrackViewOnClick`

If you use `android:onclick` to add click event handler methods for controls (view), you can add the annotation `@ThinkingDataTrackViewOnClick` to the handler method. When the handler method is executed, the SDK will upload the control click event

```
@ThinkingDataTrackViewOnClick
public void buttonOnClick(View v){}
```

If the method `buttonOnClick` is called, a control click event will be uploaded

#### 3.6 Crash Event

When the APP encounters an uncaught exception, an APP crash event will be reported

- Event name: ta_app_crash
- Preset property: `#app_crashed_reason`, string type, records the stack trace at the time of crash

### 4. Ignore Auto Tracking Events

You can ignore auto tracking events for a specific page or control using the following methods

#### 4.1 Ignore Page Auto Tracking Events

For certain pages (`Activity`), if you don't want to transmit auto tracking events (including page view and control click events), you can ignore them using the following method:

:::: el-tabs

::: el-tab-pane label=Java

```
// Ignore single page
TDAnalytics.ignoreAutoTrackActivity(MainActivity.class);
// Ignore multiple pages
List<Class<?>> classList = new ArrayList<>();
classList.add(MainActivity.class);
TDAnalytics.ignoreAutoTrackActivities(classList);
```

:::

::: el-tab-pane label=Kotlin

```
// Ignore single page
TDAnalytics.ignoreAutoTrackActivity(MainActivity::class.*java*)
// Ignore multiple pages
val classList: MutableList<Class<*>> = ArrayList()
classList.add(MainActivity::class.*java*)
TDAnalytics.ignoreAutoTrackActivities(classList)
```

:::

::::

You can also add the annotation `@ThinkingDataIgnoreTrackAppViewScreen` before `Activity` or `Fragment` to ignore the page view event of a specific `Activity` or `Fragment`

:::: el-tabs

::: el-tab-pane label=Java

```
// Ignore TestActivity page view event
@ThinkingDataIgnoreTrackAppViewScreen
public class TestActivity extends AppCompatActivity {
    ...
}
```

:::

::: el-tab-pane label=Kotlin

```
// Ignore TestActivity page view event
@ThinkingDataIgnoreTrackAppViewScreen
class TestActivity : AppCompatActivity() {
    ...
}
```

:::

::::

Add the annotation `@ThinkingDataIgnoreTrackAppViewScreenAndAppClick` before `Activity` to ignore the page view event and control click events on that page for a specific `Activity`

:::: el-tabs

::: el-tab-pane label=Java

```
// Ignore TestActivity page view event and control click events on that page
@ThinkingDataIgnoreTrackAppViewScreenAndAppClick
public class TestActivity extends AppCompatActivity {
    ...
}
```

:::

::: el-tab-pane label=Kotlin

```
// Ignore TestActivity page view event and control click events on that page
@ThinkingDataIgnoreTrackAppViewScreenAndAppClick
class TestActivity : AppCompatActivity() {
    ...
}
```

:::

::::

#### 4.2 Ignore Click Events for a Specific Control Type

If you need to ignore click events for a specific control type, you can use the following method

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.ignoreViewType(ignoredClass);
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.ignoreViewType(ignoredClass)
```

:::

::::

- `ignoredClass` is the control type to ignore, such as `Dialog`, `Checkbox`, etc.

#### 4.3 Ignore Click Events for a Specific Element (View)

If you want to ignore click events for a specific element (View), you can use the following method

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.ignoreView(targetView);
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.ignoreView(targetView)
```

:::

::::

- `targetView` is the View to ignore

### 5. Use Annotations to Quickly Set Events

If you need to monitor the call count of a method, or need to upload an event as soon as a method is called, you can use the annotation `@ThinkingDataTrackEvent` to quickly set the event to upload. Note that properties cannot be passed as variables, so this is only suitable for uploading simple events

```
// Use annotation
@ThinkingDataTrackEvent(eventName = "event_name", properties = "{\"paramString\":\"value\",\"paramNumber\":123,\"paramBoolean\":true}")
public void fun(){}
```

At this point, if the method `fun` is called, an event with name `event_name` and properties `"paramString":"value"`, `"paramNumber":123`, and `"paramBoolean":true` will be uploaded

### 6. Preset Properties for Auto Tracking Events

The following preset properties are unique to each auto tracking event

- Preset properties for APP start event (ta_app_start)
  **Property Name**

**English Name**

**Property Type**

**Description**

#resume_from_background

Resumed from background

Boolean

Indicates whether the APP was opened or woken from the background. Value true means woken from the background, false means directly opened

#start_reason

App start source

Text

Content is a JSON string; when the APP is opened via URL or intent, the URL content and intent data are automatically recorded, example: `{url:"thinkingdata://","data":{}}`

#background_duration

Background duration

Numeric

Records the duration the APP was in the background between two start events, in seconds

- Preset properties for APP end event (ta_app_end)
  **Property Name**

**English Name**

**Property Type**

**Description**

#duration

Event duration

Numeric

Indicates the duration of the APP visit (from start to end), in seconds

- Preset properties for APP page view event (ta_app_view)
  **Property Name**

**English Name**

**Property Type**

**Description**

#title

Page title

Text

The title of the `Activity` the control belongs to, the value is the `title` property of the `Activity`

#screen_name

Page name

Text

The package name.class name of the `Activity` the control belongs to

#url

Page URL

Text

The URL of the current page, requires calling `getScreenUrl` to set the URL

#referrer

Referrer URL

Text

The URL of the previous page, the previous page also needs to call `getScreenUrl` to set the URL

- Preset properties for APP control click event (ta_app_click)
  **Property Name**

**English Name**

**Property Type**

**Description**

#title

Page title

Text

The title of the `Activity` the control belongs to, the value is the `title` property of the `Activity`

#screen_name

Page name

Text

The package name.class name of the `Activity` the control belongs to

#element_id

Element ID

Text

The ID of the control, defaults to `android:id`, can be set via `setViewID`

#element_type

Element type

Text

The type of the control

#element_selector

Element selector

Text

The concatenation of the control's `viewPath`

#element_position

Element position

Text

The position information of the control, only uploaded when the control has a `position` attribute

#element_content

Element content

Text

The content on the control

- Preset properties for APP crash event (ta_app_crash)
  **Property Name**

**English Name**

**Property Type**

**Description**

#app_crashed_reason

Exception information

Text

String type, records the stack trace at the time of crash

### 7. Optional Plugin

::: tip Tip

You only need to integrate this plugin when you want to enable control click events and Fragment page view events.

:::

::: tip Tip

Starting from version 2.1.0, compatible with Gradle 8.0.

:::

Android SDK Version

Plugin Version

[oldest - 3.0.0)

1.2.0

[3.0.0 - 3.1.0]

2.1.0

(3.1.0 - latest]

2.2.0

```
buildscript {
    repositories {
        google()
        jcenter()
    }
    dependencies {
        classpath 'cn.thinkingdata.android:android-gradle-plugin2:2.2.0'
    }
}
```

You can configure plugin-related parameters in the project build.gradle file

```
apply plugin: 'cn.thinkingdata.android'
android **{**

**}**
ThinkingAnalytics **{**
**    **debug = true
    exclude = []
    sdk**{**
    **    **disableAndroidID = false
    **}**
**}**
```

Parameter Details:

- debug : Whether to enable compile log, true to enable, default false.
- exclude : Exclude scanning classes under certain path, can be set via exclude = ['cn.thinkingdata.android','android.support'].
- useInclude , include: Only scan classes under certain path, can be set via useInclude = true, include= ['cn.thinkingdata.android','android.support'].
- disableAndroidID : Whether to disable system API for AndroidID, From plugin V2.1.0, set disableAndroidID = true.

### 8. Set Custom Properties

You can call `enableAutoTrack(List<ThinkingAnalyticsSDK.AutoTrackEventType>, JSONObject)` to enable auto tracking and set custom properties at the same time

:::: el-tabs

::: el-tab-pane label=Java

```
JSONObject properties = new JSONObject();
try {
    properties.put("auto_self_define_key", "auto_self_define_value");
} catch (Exception e) {
    e.printStackTrace();
}
TDAnalytics.enableAutoTrack(typeList, properties);
```

:::

::: el-tab-pane label=Kotlin

```
val properties = JSONObject()
properties.put("auto_self_define_key", "auto_self_define_value")
TDAnalytics.enableAutoTrack(typeList, properties)
```

:::

::::

### 9. Auto Tracking Event Callback

You can set a callback to get the event type and event properties when an enabled auto tracking event occurs, and add additional properties to report by **setting the return value**.

:::: el-tabs

::: el-tab-pane label=Java

```
TDAnalytics.*enableAutoTrack*(TDAnalytics.TDAutoTrackEventType.*APP_END *| TDAnalytics.TDAutoTrackEventType.*APP_START*, new TDAnalytics.TDAutoTrackEventHandler() {
    @Override
    public JSONObject getPropertiesWithEventType(int eventType, JSONObject properties) {
        try {
            return new JSONObject("{\"keykey\":\"value1111\"}");
        } catch (JSONException e) {
            e.printStackTrace();
            return null;
        }
    }
});
```

:::

::: el-tab-pane label=Kotlin

```
TDAnalytics.enableAutoTrack(
    TDAnalytics.TDAutoTrackEventType.*APP_END *or TDAnalytics.TDAutoTrackEventType.*APP_START*,
    object : TDAutoTrackEventHandler {
        override fun getAutoTrackEventProperties(p0: Int, p1: JSONObject?): JSONObject {
            return JSONObject("{\"keykey\":\"value1111\"}");
        }
    })
```

:::

::::

---

# Preset Properties

### 1. Preset Properties for All Events

The following preset properties are included in all events (including auto tracking events) in the Android SDK

**Property Name**

**English Name**

**Property Type**

**Collection Time**

**Description**

#ip

IP address

Text

Server-side collection

User's IP address, TE will use this to obtain the user's geographic location information

#country

Country

Text

Server-side collection

User's country, generated from IP address

#country_code

Country code

Text

Server-side collection

User's country code (ISO 3166-1 alpha-2, i.e., two uppercase letters), generated from IP address

#province

Province

Text

Server-side collection

User's province, generated from IP address

#city

City

Text

Server-side collection

User's city, generated from IP address

#os_version

Operating system version

Text

Collected once at initialization

iOS 11.2.2, Android 8.0.0, etc.

#manufacturer

Device manufacturer

Text

Collected once at initialization

Device manufacturer, such as Apple, vivo, etc.

#os

Operating system

Text

Collected once at initialization

Such as Android, iOS, etc.

#device_id

Device ID

Text

Collected once at initialization

User's device ID, iOS uses IDFV or UUID, Android uses androidID

#screen_height

Screen height

Numeric

Collected once at initialization

Device screen height, such as 1920, etc.

#screen_width

Screen width

Numeric

Collected once at initialization

Device screen width, such as 1080, etc.

#device_model

Device model

Text

Collected once at initialization

Device model, such as iPhone 8, etc.

#device_type

Device type

Text

Collected once at initialization

Device type, such as "Tablet", "Phone"

#app_version

APP version

Text

Collected once at initialization

Your APP version

#bundle_id

App unique identifier

Text

Collected once at initialization

App package name or process name

#lib

SDK type

Text

Collected once at initialization

Type of SDK integrated, such as Android, iOS, etc.

#lib_version

SDK version

Text

Collected once at initialization

Version of SDK integrated

#network_type

Network status

Text

Collected once at initialization, also on network status change

Network status when uploading events, such as WIFI, 3G, 4G, etc.

#carrier

Network carrier

Text

Collected once at initialization

User's network carrier, such as China Mobile, China Telecom, etc.

#zone_offset

Timezone offset

Numeric

Collected at event time

Hour offset of data time relative to UTC

#install_time

App installation time

Time

Collected once at initialization

User's app installation time, value from system

#simulator

Is simulator

Numeric

Collected once at initialization

Whether the device is a simulator true/false

#ram

Device RAM status

Text

Collected at event time

Current remaining memory and total memory of the device, in GB, such as 1.4/2.4 (not collected by default in versions 3.2.0 and later)

#disk

Device storage status

Text

Collected at event time

Current remaining storage and total storage of the device, in GB, such as 30/200 (not collected by default in versions 3.2.0 and later)

#fps

Device frame rate

Numeric

Collected at event time

Current frames per second of the device, such as 60 (not collected by default in versions 3.2.0 and later)

#system_language

System language

Text

Collected once at initialization

User's system language (ISO 639-1, i.e., two lowercase letters), such as zh, en, etc.

### 2. Preset Properties for Auto Tracking Events

The following preset properties are unique to each auto tracking event

- Preset properties for APP start event (ta_app_start)
  **Property Name**

**English Name**

**Property Type**

**Description**

#resume_from_background

Resumed from background

Boolean

Indicates whether the APP was opened or woken from the background. Value true means woken from the background, false means directly opened

#start_reason

App start source

Text

Content is a JSON string; when the APP is opened via URL or intent, the URL content and intent data are automatically recorded, example: `{url:"thinkingdata://","data":{}}`

#background_duration

Background duration

Numeric

Records the duration the APP was in the background between two start events, in seconds

- Preset properties for APP end event (ta_app_end)
  **Property Name**

**English Name**

**Property Type**

**Description**

#duration

Event duration

Numeric

Indicates the duration of the APP visit (from start to end), in seconds

- Preset properties for APP page view event (ta_app_view)
  **Property Name**

**English Name**

**Property Type**

**Description**

#title

Page title

Text

The title of the Activity the control belongs to, the value is the title property

#screen_name

Page name

Text

The package name.class name of the Activity the control belongs to

#url

Page URL

Text

The URL of the current page, requires calling getScreenUrl to set the URL

#referrer

Referrer URL

Text

The URL of the previous page, the previous page also needs to call getScreenUrl to set the URL

- Preset properties for APP control click event (ta_app_click)
  **Property Name**

**English Name**

**Property Type**

**Description**

#title

Page title

Text

The title of the Activity the control belongs to, the value is the title property of the Activity

#screen_name

Page name

Text

The package name.class name of the Activity the control belongs to

#element_id

Element ID

Text

The ID of the control, defaults to android:id, can be set via setViewID

#element_type

Element type

Text

The type of the control

#element_selector

Element selector

Text

The concatenation of the control's viewPath

#element_position

Element position

Text

The position information of the control, only uploaded when the control has a position attribute

#element_content

Element content

Text

The content on the control

- Preset properties for APP crash event (ta_app_crash)
  **Property Name**

**English Name**

**Property Type**

**Description**

#app_crashed_reason

Exception information

Text

String type, records the stack trace at the time of crash

### 3. Other Preset Properties

In addition to the preset properties mentioned above, some preset properties require calling the corresponding interface to be recorded:

**Property Name**

**English Name**

**Property Type**

**Description**

#duration

Event duration

Numeric

Requires calling the timing function timeEvent, records the event duration, in seconds

#background_duration

Background duration

Numeric

Requires calling the timing function timeEvent, records the duration the APP was in the background during the event interval, in seconds

### 4. Get Preset Properties

Versions v2.7.0 and later can call the `getPresetProperties()` method to get preset properties.

When server-side tracking needs some preset properties from the App side, you can use this method to get the App's preset properties and pass them to the server side.

:::: el-tabs

::: el-tab-pane label=Java

```
   // Get properties object
   TDPresetProperties presetProperties = TDAnalytics.getPresetProperties();

   // Generate event preset properties
   JSONObject properties = presetProperties.toEventPresetProperties();
   /*
   {
        "#carrier": "T-Mobile",
        "#os": "Android",
        "#device_id": "dd4a508df0dbff08",
        "#screen_height": 2560,
        "#bundle_id": "cn.thinkingdata.android.demo",
        "#device_model": "sdk_gphone64_arm64",
        "#screen_width": 1440,
        "#system_language": "en",
        "#install_time": "2022-08-19 17:31:52.398",
        "#simulator": true,
        "#manufacturer": "Google",
        "#os_version": "12",
        "#app_version": "1.0",
        "#network_type": "3G",
        "#zone_offset": 8,
        "#ram": "0.8\/1.9",
        "#disk": "0.1\/0.8",
        "#fps": 60
    }
   */

    // Get a specific preset property
    String bundle_id = presetProperties.bundleId;// Package name
    String os =  presetProperties.os;// OS type, such as Android
    String system_language = presetProperties.systemLanguage;// Phone system language type
    int screen_width = presetProperties.screenWidth;// Screen width
    int screen_height = presetProperties.screenHeight;// Screen height
    String device_model = presetProperties.deviceModel;// Device model
    String device_id = presetProperties.deviceId;// Device unique identifier
    String carrier = presetProperties.carrier;// Phone SIM card carrier info, for dual SIM, uses primary SIM carrier info
    String manufacture = presetProperties.manufacture;// Phone manufacturer, such as HuaWei
    String network_type = presetProperties.networkType;// Network type
    String os_version = presetProperties.osVersion;// System version number
    String app_version = presetProperties.appVersion;// App version number
    double zone_offset = presetProperties.zoneOffset;// Timezone offset value
    String ram = presetProperties.ram;// Memory usage
    String disk = presetProperties.disk;// Disk usage
    int fps = presetProperties.fps;// fps
    String installTime = presetProperties.installTime;// App installation time
    boolean isSimulator = presetProperties.isSimulator;// Whether device is a simulator

```

:::

::: el-tab-pane label=Kotlin

```
// Get properties object
val presetProperties = TDAnalytics.getPresetProperties()

// Generate event preset properties
val properties = presetProperties.toEventPresetProperties()
/*
   {
        "#carrier": "T-Mobile",
        "#os": "Android",
        "#device_id": "dd4a508df0dbff08",
        "#screen_height": 2560,
        "#bundle_id": "cn.thinkingdata.android.demo",
        "#device_model": "sdk_gphone64_arm64",
        "#screen_width": 1440,
        "#system_language": "en",
        "#install_time": "2022-08-19 17:31:52.398",
        "#simulator": true,
        "#manufacturer": "Google",
        "#os_version": "12",
        "#app_version": "1.0",
        "#network_type": "3G",
        "#zone_offset": 8,
        "#ram": "0.8\/1.9",
        "#disk": "0.1\/0.8",
        "#fps": 60
    }
*/
// Get a specific preset property
val bundle_id: String = presetProperties.bundleId // Package name

val os = presetProperties.os // OS type, such as Android

val system_language: String = presetProperties.systemLanguage // Phone system language type

val screen_width: Int = presetProperties.screenWidth // Screen width

val screen_height: Int = presetProperties.screenHeight // Screen height

val device_model: String = presetProperties.deviceModel // Device model

val device_id: String = presetProperties.deviceId // Device unique identifier

val carrier = presetProperties.carrier // Phone SIM card carrier info, for dual SIM, uses primary SIM carrier info

val manufacture = presetProperties.manufacture // Phone manufacturer, such as HuaWei

val network_type: String = presetProperties.networkType // Network type

val os_version: String = presetProperties.osVersion // System version number

val app_version: String = presetProperties.appVersion // App version number

val zone_offset: Double = presetProperties.zoneOffset // Timezone offset value

val ram = presetProperties.ram // Memory usage

val disk = presetProperties.disk // Disk usage

val fps = presetProperties.fps // fps

val installTime = presetProperties.installTime // App installation time

val isSimulator = presetProperties.isSimulator // Whether device is a simulator
```

:::

::::

<!-- unsupported block: 34 -->

IP, country, and city information is parsed and generated by the server side. The client does not provide interfaces to obtain these properties.

### 5. Disable Preset Property Collection

In some scenarios, for compliance or actual business needs, you may want to disable the collection of certain preset properties. You can add a ta_public_config.xml file in the res/values directory of your project to configure the array of properties to disable.

```
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- ThinkingAnalytics DisablePresetProperties start -->
    <string-array name="TDDisPresetProperties">
<!--        <item>#disk</item>-->
<!--        <item>#fps</item>-->
<!--        <item>#ram</item>-->
<!--        <item>#app_version</item>-->
<!--        <item>#os_version</item>-->
<!--        <item>#manufacturer</item>-->
<!--        <item>#device_model</item>-->
<!--        <item>#screen_height</item>-->
<!--        <item>#screen_width</item>-->
<!--        <item>#carrier</item>-->
<!--        <item>#device_id</item>-->
<!--        <item>#system_language</item>-->
<!--        <item>#lib</item>-->
<!--        <item>#lib_version</item>-->
<!--        <item>#os</item>-->
<!--        <item>#bundle_id</item>-->
<!--        <item>#install_time</item>-->
<!--        <item>#start_reason</item>-->
<!--        <item>#simulator</item>-->
<!--        <item>#network_type</item>-->
<!--        <item>#zone_offset</item>-->
<!--        <item>#start_reason</item>-->
<!--        <item>#resume_from_background</item>-->
<!--        <item>#title</item>-->
<!--        <item>#screen_name</item>-->
<!--        <item>#url</item>-->
<!--        <item>#referrer</item>-->
<!--        <item>#element_type</item>-->
<!--        <item>#element_id</item>-->
<!--        <item>#element_position</item>-->
<!--        <item>#element_content</item>-->
<!--        <item>#element_selector</item>-->
<!--        <item>#app_crashed_reason</item>-->
<!--        <item>#background_duration</item>-->
<!--        <item>#duration</item>-->
    </string-array>
    <!-- ThinkingAnalytics DisablePresetProperties end -->
</resources>
```

<!-- unsupported block: 34 -->

If you disable the device ID and need to use first events, make sure to fill in the first_check_id property.

For the Android ID property, we support code-level complete isolation, meaning after isolation, the app will no longer contain code related to obtaining that property. For details, see the Auto Tracking Plugin Configuration section.
