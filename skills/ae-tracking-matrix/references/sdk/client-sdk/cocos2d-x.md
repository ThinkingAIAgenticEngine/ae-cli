---
code: cocos2d-x_sdk_installation
name: "Cocos2d-x"
wikiToken: RZ1DwICXOiehIZkqI8hckoPbn0e
parentWikiToken: BAU2w0eipiqGnckeUsIc0mYQnZc
updateTime: 1770184507000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=cocos2d-x_sdk_installation
---

# Cocos2d-x

::: tip Note

Before integration, please read the Pre-installation Guide first.

Cocos2d-x SDK supports running on iOS, Android, Mac, Windows platforms, size approximately 6.8M

:::

**Latest Version:** v2.0.4

**Update Time:** 2026-02-04

**Resource Download:** Source Code, SDK Download

::: warning Warning

This document applies to v2.0.0 and later versions, for historical versions please refer to Cocos2d-x Integration Guide (V1), SDK Download (v1.3.5)

:::

### I. Integrate SDK

1. Download Cocos2d-x SDK resource files, unzip the files, and put the ThinkingAnalytics folder into the Classes folder
1. Add the following configuration to `CMakeLists.txt`

```
list(APPEND GAME_SOURCE
     Classes/ThinkingAnalytics/Common/TDJSONObject.cpp
     )
list(APPEND GAME_HEADER
     Classes/ThinkingAnalytics/Common/TDJSONObject.h
     Classes/ThinkingAnalytics/Common/TDAnalytics.h
     )
if(ANDROID)
    list(APPEND GAME_SOURCE
         Classes/ThinkingAnalytics/Android/TDAnalytics.cpp
         )
elseif(WINDOWS)
    list(APPEND GAME_HEADER
         Classes/ThinkingAnalytics/Other/ThinkingSDKObject.h
         )
    list(APPEND GAME_SOURCE
         Classes/ThinkingAnalytics/Other/TDAnalytics.cpp
         )
elseif(MACOSX)
    list(APPEND GAME_HEADER
        Classes/ThinkingAnalytics/Other/ThinkingSDKObject.h
        )
    list(APPEND GAME_SOURCE
        Classes/ThinkingAnalytics/Other/TDAnalytics.cpp
        )
```

1. Add Android Configuration

- Create a libs folder in the app directory under proj.android, and copy TDAnalytics.aar, TDCore.aar, TDThirdparty.aar to the libs folder
- Create cn/thinkingdata/analytics folder step by step in proj.android/app/src directory, and copy TDAnalyticsCocosAPI.java to the cn/thinkingdata/analytics folder
- Add the following configuration in build.gradle under proj.android/app directory

```
dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar','*.aar'])
}
```

1. Add iOS Configuration
   Use ios.toolchain.cmake tool to compile iOS project

- Add iOS related configuration in `CMakeLists.txt`

```
list(APPEND GAME_SOURCE
     Classes/ThinkingAnalytics/Common/TDJSONObject.cpp
     )
list(APPEND GAME_HEADER
     Classes/ThinkingAnalytics/Common/TDJSONObject.h
     Classes/ThinkingAnalytics/Common/TDAnalytics.h
     )
if(ANDROID)
    list(APPEND GAME_SOURCE
         Classes/ThinkingAnalytics/Android/TDAnalytics.cpp
         )
elseif(WINDOWS)
    list(APPEND GAME_HEADER
         Classes/ThinkingAnalytics/Other/ThinkingSDKObject.h
         )
    list(APPEND GAME_SOURCE
         Classes/ThinkingAnalytics/Other/TDAnalytics.cpp
         )
elseif(IOS)
    //iOS configuration
    list(APPEND GAME_HEADER
         Classes/ThinkingAnalytics/iOS/TDAnalyticsCocosAPI.h
         )
    list(APPEND GAME_SOURCE
         Classes/ThinkingAnalytics/iOS/TDAnalytics.mm
         Classes/ThinkingAnalytics/iOS/TDAnalyticsCocosAPI.m
         )
elseif(MACOSX)
    list(APPEND GAME_HEADER
        Classes/ThinkingAnalytics/Other/ThinkingSDKObject.h
        )
    list(APPEND GAME_SOURCE
        Classes/ThinkingAnalytics/Other/TDAnalytics.cpp
        )

if(IOS)
    //iOS configuration
    set(CMAKE_EXE_LINKER_FLAGS -ObjC)
endif()
```

- Open iOS project with Xcode, directly drag and drop `ThinkingSDK.framework` and `TAThirdParty.framework` from the iOS folder under ThinkingAnalytics to the Classes/ThinkingAnalytics/iOS directory of the specified Xcode project, as shown below
- Configuration complete, if version is lower than 2.0.2, you need to manually modify the header file import in Classes/ThinkingAnalytics/iOS/TDAnalyticsCocosAPI.m

```
#import "ThinkingAnalyticsSDK.h"
//Change to the following
#import <ThinkingSDK/ThinkingSDK.h>
```

1. Open Xcode project directly in proj.ios_mac

- Open iOS project with Xcode, directly drag and drop the Common and iOS folders under ThinkingAnalytics into the Classes directory of Xcode project, as shown below
- Add `-ObjC` in `Build Setting` -> `Other Linker Flags`
- Add "$(SRCROOT)/../Classes/ThinkingAnalytics/iOS" in `Build Setting` - `Framework Search Paths`

- Add WebKit.framework, GameController.framework, MediaPlayer.framework in `Build Phases` - `Link Binary With Libraries`

- Configuration complete, if version is lower than 2.0.2, you need to manually modify the header file import in Classes/ThinkingAnalytics/iOS/TDAnalyticsCocosAPI.m

```
#import "ThinkingAnalyticsSDK.h"
//Change to the following
#import <ThinkingSDK/ThinkingSDK.h>
```

### II. Initialization

```
#include "./ThinkingAnalytics/Common/TDAnalytics.h"
using namespace thinkingdata::analytics;
// Initialize SDK in main thread
//Method 1
TDAnalytics::init(TA_APP_ID, TA_SERVER_URL);
//Method 2
TDConfig config(TA_APP_ID, TA_SERVER_URL);
TDAnalytics::init(config);
```

Parameter description:

- `APPID`: Your project's APPID, can be obtained from TE backend project management page
- `SERVER_URL`: URL for data upload
- If you are connecting to cloud service, enter: https://global-receiver-ta.thinkingdata.cn
- If you are using a privately deployed version, please bind a domain name for the data collection address and configure HTTPS certificate: https://your-data-collection-domain
<!-- unsupported block: 34 -->

Since Android 9.0+ restricts HTTP requests by default, please use HTTPS protocol

### III. Common Features

Before using common features, we recommend that you first understand the user identification rules; SDK will generate a random number as a visitor ID by default, and persistently store the visitor ID locally; before the user logs in, the visitor ID will be used as the identity identification ID. Note: The visitor ID will change when the user reinstalls the App or changes the device.

#### 3.1 Set Account ID

When a user logs in, you can call `Login` to set the user's account ID. The TE platform will use the account ID as the identity identification ID, and the set account ID will be retained until `Logout` is called. Calling `Login` multiple times will override the previous account ID.

```
// The user's unique login identifier, this data corresponds to #account_id in the reported data, at this time #account_id is "TA"
TDAnalytics::login("TA");
```

`Login` can be called multiple times. Each call will determine whether the passed account ID is consistent with the previously saved ID. If consistent, the call will be ignored; if inconsistent, the previous ID will be overridden.

<!-- unsupported block: 34 -->

**This method will not upload a login event**

#### 3.2 Set Public Event Properties

Public event properties refer to properties that will be present in every event. You can call `setSuperProperties` to set public event properties. We recommend that you set public event properties before sending events. For some important properties, such as user membership level, source channel, etc., these properties need to be set in every event, you can set these properties as public event properties.

```
TDJSONObject superProperties;
superProperties.setString("channel", "ta");//string
superProperties.setNumber("age",1);//number
superProperties.setBool("isSuccess",true);//boolean
superProperties.setDateTime("birthday","2020-01-02 10:52:52.290");//time

TDJSONObject object;
object.setString("key", "value");
superProperties.setJsonObject("object", object);// object

TDJSONObject object1;
object1.setString("key", "value");
vector<TDJSONObject> arr;
arr.push_back(object1);
superProperties.setList("object_arr", arr); // object array

vector<string> arr1;
arr1.push_back("value");
superProperties.setList("arr",arr1);//array

TDAnalytics::setSuperProperties(superProperties);
```

Public event properties will be saved to the cache and do not need to be called every time the App starts. If you call `setSuperProperties` to upload a previously set public event property, it will override the previous property.

- Event properties are of `TDJSONObject` type, where each element represents a property
- Key is the property name, is a string type, can only start with a letter, contain numbers, letters and underscores "\_", maximum length 50 characters, case-insensitive, TE will uniformly convert to lowercase letters
- Value is the property value, supports string, number, boolean, time, object, object array, array
<!-- unsupported block: 34 -->

**Event properties and user properties requirements are the same as public event properties**

#### 3.3 Enable Auto-tracking

The following code example enables installation, start, and end events. If you want to learn more about SDK's auto-tracking capabilities, you can view the Auto-tracking Feature Introduction

```
// Enable auto-tracking
TDAnalytics::enableAutoTrack();
```

#### 3.4 Send Event

You can call `Track` to upload events. It is recommended that you set event properties and conditions for sending information based on your previously documented tracking plan. Here is an example of a user purchasing a product:

```
TDJSONObject eventProperties;
eventProperties.setString("product_name", "Product Name");
TDAnalytics::track("product_buy", eventProperties);
```

The event name is a string type, can only start with a letter, can contain numbers, letters and underscores "\_", maximum length 50 characters.

#### 3.5 Set User Properties

For general user properties, you can call `userSet` to set them. Properties uploaded using this interface will override existing property values. If the user property did not exist before, it will be created with the same type as the uploaded property. Here is an example of setting the username:

```
//At this time username is TA
TDJSONObject properties;
properties.setString("username", "TA");
TDAnalytics::userSet(properties);
//At this time userName is TE
TDJSONObject newProperties;
newProperties.setString("username", "TE");
TDAnalytics::userSet(newProperties);
```

<!-- unsupported block: 34 -->

Property format requirements are the same as event properties.

### IV. Best Practices

The following example code includes all the above operations. We recommend following these steps:

```
#include "./ThinkingAnalytics/Common/TDAnalytics.h"
using namespace thinkingdata::analytics;

if (Privacy Policy Authorization) {
      //Initialize SDK
      TDAnalytics::init(TA_APP_ID, TA_SERVER_URL);

      //Enable auto-tracking events
      TDAnalytics::enableAutoTrack();
      //If the user has logged in, you can set the user's account ID as the unique identifier
      TDAnalytics::login("TA");

      //After setting public event properties, every event will have public event properties
      TDJSONObject superProperties;
      superProperties.setString("channel", "ta");//string
      superProperties.setNumber("age",1);//number
      superProperties.setBool("isSuccess",true);//boolean
      superProperties.setDateTime("birthday","2020-01-02 10:52:52.290");//time

      TDJSONObject object;
      object.setString("key", "value");
      superProperties.setJsonObject("object", object);// object

      TDJSONObject object1;
      object1.setString("key", "value");
      vector<TDJSONObject> arr;
      arr.push_back(object1);
      superProperties.setList("object_arr", arr); // object array

      vector<string> arr1;
      arr1.push_back("value");
      superProperties.setList("arr",arr1);//array
      TDAnalytics::setSuperProperties(superProperties);

      //Send event
      TDJSONObject eventProperties;
      eventProperties.setString("product_name", "Product Name");
      TDAnalytics::track("product_buy",eventProperties);

      //Set user properties
      TDJSONObject userProperties;
      userProperties.setString("username", "TE");
      TDAnalytics::userSet(userProperties);
}
```

---

# Advanced Guide

### I. Set User ID

The SDK instance defaults to using a random UUID as the default visitor ID for each user, which will serve as the identity identification ID for users in an unauthenticated state. Note that the visitor ID will change when the user reinstalls the App or changes the device.

#### 1.1 Set Visitor ID

::: tip Note

Generally, you do not need to customize the visitor ID. Please ensure you understand the user identification rules before setting the visitor ID.

If you need to replace the visitor ID, you should call it immediately after initializing the SDK. Do not call it multiple times to avoid creating unnecessary accounts.

:::

If your game has its own visitor ID management system for each user, you can call `setDistinctId` to set the visitor ID:

```
// Set the visitor ID to "Thinker"
TDAnalytics::setDistinctId("Thinker");
```

If you need to get the current visitor ID, you can call `getDistinctId`:

```
//Return visitor ID
string distinctId = TDAnalytics::getDistinctId();
```

#### 1.2 Set Account ID

When a user logs in, you can call `login` to set the user's account ID. The TE platform will use the account ID as the identity identification ID, and the set account ID will be retained until `logout` is called. Calling `login` multiple times will override the previous account ID.

```
// The user's unique login identifier, this data corresponds to #account_id in the reported data, at this time #account_id is "TA"
TDAnalytics::login("TA");
```

<!-- unsupported block: 34 -->

**This method will not upload a login event**

#### 1.3 Clear Account ID

After a user logs out, you can call `logout` to clear the account ID. Before calling `login` again, the visitor ID will be used as the identity identification ID.

```
TDAnalytics::logout();
```

We recommend that you call `logout` only when there is an explicit logout behavior, such as when the user actively cancels their account, rather than when the App is closed.

<!-- unsupported block: 34 -->

**This method will not upload a logout event**

### II. Send Events

After the SDK initialization is complete, you can perform data tracking and collect user behavior information. Generally, ordinary events can meet business scenario requirements. You can also use first-time events, updatable events, etc. according to your actual business scenarios.

#### 2.1 Ordinary Events

You can call `track` to upload events. We recommend that you set event properties and conditions for sending events based on your previously documented tracking plan. Here is an example of a user purchasing a product:

```
TDJSONObject eventProperties;
eventProperties.setString("product_name", "Product Name");
TDAnalytics::track("product_buy", eventProperties);
```

#### 2.2 First-time Event

First-time events refer to events that will only be recorded once for a certain device or other dimensional ID. For example, in some scenarios, you may want to record an activation event on a certain device, then you can use first-time events to report the data.

```
TDJSONObject jsonObject;
jsonObject.setString("key","value");
TDFirstEventModel *firstEvent = new TDFirstEventModel("device_activation", jsonObject);
TDAnalytics::track(firstEvent);
```

If you want to determine whether it is the first time based on other dimensions other than the device, you can customize the first_check_id for the first-time event:

```
// Set the user ID as the first_check_id of the first-time event to implement the collection of user first activation event
TDJSONObject jsonObject;
jsonObject.setString("key","value");
TDFirstEventModel *firstEvent = new TDFirstEventModel("account_activation", jsonObject);
firstEvent->setFirstCheckId("TA");
TDAnalytics::track(firstEvent);
```

<!-- unsupported block: 34 -->

Note: Since the verification of whether it is the first time is completed on the server side, first-time events will be delayed by 1 hour before entering the database by default.

#### 2.3 Updatable Events

You can implement the need to modify event data in specific scenarios through updatable events. Updatable events need to specify an ID that identifies the event, and pass it when creating the updatable event object. The TE backend will determine the data to be updated based on the event name and event ID.

```
// Example: Report an event that can be updated, assuming the event name is UPDATABLE_EVENT
// After reporting, the event property status is 3, price is 100
TDJSONObject jsonObject;
jsonObject.setNumber("status", 3);
jsonObject.setNumber("price", 100);
TDUpdatableEventModel *updatableEvent = new TDUpdatableEventModel("UPDATABLE_EVENT",jsonObject,"test_event_id");
TDAnalytics::track(updatableEvent);

// After reporting, the event property status is updated to 5, price remains unchanged
TDJSONObject jsonObject_new;
jsonObject_new.setNumber("status", 5);
TDUpdatableEventModel *updatableEvent = new TDUpdatableEventModel("UPDATABLE_EVENT",jsonObject_new,"test_event_id");
TDAnalytics::track(updatableEvent);
```

#### 2.4 Overwritable Events

Overwritable events are similar to updatable events, the difference is that overwritable events will completely overwrite historical data with the latest data, which effectively is equivalent to deleting the previous data and storing the latest data. The TE backend will determine the data to be updated based on the event name and event ID.

```
// Example: Report an event that can be overwritten, assuming the event name is OVERWRITABLE_EVENT
// After reporting, the event property status is 3, price is 100
TDJSONObject jsonObject;
jsonObject.setNumber("status", 3);
jsonObject.setNumber("price", 100);
TDOverwritableEventModel *overWritableEvent = new TDOverwritableEventModel("OVERWRITABLE_EVENT",jsonObject,"test_event_id");
TDAnalytics::track(overWritableEvent);

// After reporting, the event property status is updated to 5, price property is deleted
TDJSONObject jsonObject_new;
jsonObject_new.setNumber("status", 5);
TDOverwritableEventModel overWritableEvent_new = new TDOverwritableEventModel("OVERWRITABLE_EVENT", jsonObject_new,"test_event_id");
TDAnalytics::track(overWritableEvent_new);
```

#### 2.5 Public Event Properties

Public event properties refer to properties that will be uploaded with every event. Based on the property update frequency, public event properties are divided into `static public event properties` and `dynamic public event properties`. You can choose different public event property setting methods according to your specific business scenario requirements; we recommend that you set public event properties before sending events. For the same event, when the Key of public event properties, event custom properties, and preset properties are the same, we will assign values according to the following priority: `Custom Properties > Dynamic Public Event Properties > Static Public Event Properties > Preset Properties`.

##### 2.5.1 Static Public Event Properties

Static public event properties are properties that change infrequently and are present in every event, such as user membership level. After setting static public event properties through `setSuperProperties`, the SDK will obtain the set public event properties as event properties when collecting events.

```
TDJSONObject superProperties;
userProperties.setNumber("level",2);
TDAnalytics::setSuperProperties(superProperties);
```

Static public event properties will be saved to the cache and do not need to be called every time the App starts. If the property already exists, the newly set property will override the original property value; if the property did not exist before, a new property will be created. Besides setting properties, we also provide other APIs to operate static public event properties to meet daily business needs.

```
// Clear the public property named CHANNEL
TDAnalytics::unsetSuperProperty("CHANNEL");
// Clear all public properties
TDAnalytics::clearSuperProperties();
// Get all public properties
TDAnalytics::getSuperProperties();
```

##### 2.5.2 Dynamic Public Event Properties

Dynamic public event properties are properties that change frequently and are present in every event, such as the number of gold coins a user has. After setting the dynamic public property class through `setDynamicSuperPropertiesTracker`, the SDK will automatically obtain dynamic public event properties during event collection and add them to the triggered event.

```
// Set dynamic public properties, dynamically get event occurrence time during event reporting
int coin = 0
TDJSONObject dynamicProperties()
{
    coin++;
    TDJSONObject obj;
    obj.setNumber("coin",coin);
    return obj;
}
TDAnalytics::setDynamicSuperProperties(dynamicProperties);
```

#### 2.6 Record Event Duration

If you need to record the duration of an event, you can call `timeEvent` to start timing. Configure the event name you want to time. When you upload that event, a `#duration` property will automatically be added to your event properties to represent the recorded duration in seconds. Note that only one timing task can exist for the same event name.

```
//The following example completes the statistics of the user's stay duration on a certain product page
//User enters the product page, start timing
TDAnalytics::timeEvent("stay_shop");
// do some thing...
//User leaves the product page, timing ends, the "stay_shop" event will have a property #duration representing the event duration
TDAnalytics::track("stay_shop");
```

### III. User Properties

The user property setting APIs supported by TE platform are: `userSet`, `userSetOnce`, `userAdd`, `userUnset`, `userDelete`, `userAppend`, `userUniqAppend`.

#### 3.1 userSet

For general user properties, you can call `userSet` to set them. Properties uploaded using this interface will override existing property values. If the user property did not exist before, it will be created with the same type as the uploaded property. Here is an example of setting the username:

```
//At this time username is TA
TDJSONObject properties;
properties.setString("username", "TA");
TDAnalytics::userSet(properties);
//At this time userName is TE
TDJSONObject newProperties;
newProperties.setString("username", "TE");
TDAnalytics::userSet(newProperties);
```

#### 3.2 userSetOnce

If you need to upload user properties that should only be set once, you can call `userSetOnce` to set them. When the property already has a value, this information will be ignored. Here is an example of setting the first payment time:

```
//first_payment_time is 2018-01-01 01:23:45.678
TDJSONObject userProperties;
userProperties.setString("first_payment_time","2018-01-01 01:23:45.678");
TDAnalytics::userSetOnce(userProperties);

//first_payment_time is still 2018-01-01 01:23:45.678
TDJSONObject newUserProperties;
newUserProperties.setString("first_payment_time","2018-12-31 01:23:45.678");
TDAnalytics::userSetOnce(newUserProperties);
```

#### 3.3 userAdd

When you need to upload numeric properties, you can call `userAdd` to perform an accumulation operation on the property. If the property has not been set, it will be assigned 0 before calculation. Negative values can be passed, which is equivalent to a subtraction operation. Here is an example of accumulating total payment amount:

```
//At this time total_revenue is 30
TDJSONObject userProperties;
userProperties.setNumber("total_revenue",30);
TDAnalytics::userAdd(userProperties);

//At this time total_revenue is 678
TDJSONObject newUserProperties;
newUserProperties.setNumber("total_revenue",648);
TDAnalytics::userAdd(newUserProperties);
```

<!-- unsupported block: 34 -->

The property key is a string, and Value only allows numeric values.

#### 3.4 userUnset

If you need to reset a user's property, you can call `userUnset` to clear the value of a specified user property. This interface supports passing string or list type parameters:

```
TDAnalytics::userUnset("coin");
```

<!-- unsupported block: 34 -->

The passed value is the Key of the property to be cleared.

#### 3.5 userDelete

If you need to delete a user, you can call `userDelete` to delete that user. You will no longer be able to query that user's user properties, but the events generated by that user can still be queried.

```
TDAnalytics::userDelete();
```

#### 3.6 userAppend

You can call `userAppend` to append elements to `List` type user properties:

```
TDJSONObject userProperties;
vector<string> listValue;
listValue.push_back("apple");
listValue.push_back("ball");
userProperties.setList("user_list",listValue);
TDAnalytics::userAppend(userProperties);
```

#### 3.7 userUniqAppend

You can call `userUniqAppend` to append elements to array type user properties. Calling `userUniqAppend` interface will deduplicate the appended user properties, while `userAppend` interface does not deduplicate, so user properties may contain duplicates.

```
//At this time user_list property value is ["apple", "ball"]
TDJSONObject properties;
vector<string> dataArray;
dataArray.push_back("apple");
dataArray.push_back("ball");
properties.setList("user_list",dataArray);
TDAnalytics::userAppend(properties);

//At this time user_list property value is ["apple", "apple", "ball", "cube"]
TDJSONObject properties1;
vector<string> dataArray1;
dataArray1.push_back("apple");
dataArray1.push_back("cube");
properties1.setList("user_list",dataArray1);
TDAnalytics::userAppend(properties1);

//At this time user_list property value is ["apple", "ball", "cube"]
TDAnalytics::userUniqAppend(properties1);
```

### IV. Other Features

#### 4.1 Get Device ID

After SDK initialization is complete, SDK will automatically generate a device ID and record it in local cache. For the same application/game, the device ID of one device is unchanged. You can call `getDeviceId()` to get the device ID:

```
TDAnalytics::getDeviceId();

// Use device ID as visitor ID
// TDAnalytics::setDistinctId(TDAnalytics::getDeviceId());
```

#### 4.2 Calibrate Time

By default, SDK uses the local time as the event occurrence time for reporting. If users manually modify the device time, it will affect your business analysis. At this time, you can ensure the accuracy of event occurrence time through time calibration operations. We provide two time calibration methods: `timestamp` and `NTP`.

- You can use the current timestamp obtained from the server to calibrate SDK time. After that, all calls without specified time, including event data and user property setting operations, will use the calibrated time as the occurrence time.

```
// 1585633785954 is the current unix timestamp in milliseconds, corresponding to Beijing time 2020-03-31 13:49:45
TDAnalytics::calibrateTime(1585633785954);
```

- You can also set the NTP server address. After that, SDK will attempt to obtain the current time from the passed NTP service address and calibrate SDK time. If the correct return result is not obtained within the default timeout time (3 seconds), the local time will be used to report data subsequently.

```
// Use Apple NTP service to calibrate time
TDAnalytics::calibrateTimeWithNtp("time.apple.com");
```

<!-- unsupported block: 34 -->

1. Using NTP service for time calibration has certain uncertainty, we recommend you use the timestamp calibration method first

2. You need to carefully select your NTP server address to ensure that user devices can quickly obtain server time under good network conditions

#### 4.3 Flush Data Immediately

In some business scenarios, if you expect data to be reported to the TE server immediately, you can complete it by calling the `flush` interface

```
TDAnalytics::flush();
```

#### 4.4 Data Encryption

Starting from version v1.3.2, SDK supports encryption function. The client supports using AES+RSA to encrypt data, and then the server decrypts the data. The encryption and decryption capabilities require client and server to work together. Please consult your customer success manager for details.

Call `setEnableEncrypt` to enable encryption, and set RSA public key information through `setSecretKey`

```
TDConfig config1(APPID,SERVER_URL);
config1.setEnableEncrypt(true);// encryption
config1.setSecretKey(TDSecretKey(_version, _secretKey));
TDAnalytics::init(config1);
```

---

# Multiple Instances

In actual business, if you want to send data to multiple projects, you can use the multiple instance feature we provide.

Pass different project information to complete SDK initialization, and you can create multiple SDK instances.

```
//Support initializing multiple APPID instances
TDAnalytics::init(TA_APP_ID, TA_SERVER_URL);
TDAnalytics::init(TA_APP_ID_1, TA_SERVER_URL_1);
//Use multiple instances for data tracking
TDJSONObject eventProperties;
eventProperties.setString("product_name", "Product Name");
TDAnalytics::track("product_buy", eventProperties, TA_APP_ID_1);
```

<!-- unsupported block: 34 -->

Visitor ID, account ID, public properties, etc. are not shared among multiple projects, and need to be set separately for each APP ID instance.

---

# Real-time Debugging

During SDK integration, you can perform real-time debugging by viewing SDK logs in the IDE console or using TE's Debug feature.

### I. Print SDK Logs

```
TDAnalytics::enableTrackLog(true);
```

<!-- unsupported block: 34 -->

After enabling logs, you can filter ThinkingData related logs in the IDE to observe SDK data reporting.

### II. Enable Debug Mode

Enabling Debug mode requires the following two steps:

1. Enable Debug mode on the client side
   The following is an example code for enabling Debug mode on the client side:

```
/*
Set the running mode to Debug mode
NORMAL mode: Data will be stored in cache and reported according to a certain cache strategy. Default is NORMAL mode; recommended for production environment
Debug mode: Data is reported one by one. When problems occur, users will be prompted with logs and exceptions; not recommended for production environment
DebugOnly mode: Only validates data, will not be stored in database; not recommended for production environment
 */
TDConfig config(TA_APP_ID, TA_SERVER_URL);// Set the running mode to Debug mode
config.setModel(TDModel::TD_DEBUG);
// Initialize SDK
TDAnalytics::init(config);
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

TDAnalytics SDK provides auto-tracking for three types of events:

- ta_app_install: Game installation, this event will be collected when the game is first opened after installation
- ta_app_start: This event will be collected when the game enters foreground
- ta_app_end: This event will be collected when the game exits to background
  Auto-tracking can be enabled by calling the `enableAutoTrack` interface:

```
// Enable auto-tracking
TDAnalytics::enableAutoTrack();
```

<!-- unsupported block: 34 -->

Note: If you need to customize the visitor ID, please be sure to call the setDistinctId interface to set the visitor ID before enabling the auto-tracking feature.

Starting from version v1.3.2, it supports setting custom properties for auto-tracking events. When collecting specified events, custom properties will be merged into the event properties and reported.

```
// Enable auto-tracking and set custom properties
TDJSONObject autoProperties;
autoProperties.setString("auto_track_key", "auto_track_value");
TDAnalytics::enableAutoTrack(autoProperties);
```

---

# Preset Properties

### I. Preset Properties Description

<!-- unsupported block: 34 -->

Preset properties collected by each platform will have certain differences. For details, please refer to the following documents: Android Platform, iOS Platform

**PC Platform Preset Properties:**

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

#os

Operating System

Text

Such as MacOS, Windows, etc.

#device_id

Device ID

Text

User's device ID

#screen_height

Screen Height

Number

User's device screen height, such as 1920, etc.

#screen_width

Screen Width

Number

User's device screen height, such as 1080, etc.

#lib

SDK Type

Text

The type of SDK you integrated, such as Android, iOS, etc.

#lib_version

SDK Version

Text

The version of SDK you integrated

#zone_offset

Timezone Offset

Number

The number of hours the data time is offset relative to UTC time

#system_language

System Language

Text

User's device system language (ISO 639-1, i.e., two lowercase English letters), such as zh, en, etc.

### II. Get Preset Properties

When server-side tracking needs some preset properties from the App side, you can get the preset properties from the App side through this method and pass them to the server side.

```
   //Get property object
   TDPresetProperties* presetProperties = TDAnalytics::getPresetProperties();

   //Generate event preset properties
   TDJSONObject* properties = presetProperties->toEventPresetProperties();
   /*
   {
        "#carrier": "China Telecom",
        "#os": "Android",
        "#device_id": "abb8e87bfb5ce66c",
        "#screen_height": 2264,
        "#bundle_id": "com.sw.thinkingdatademo",
        "#manufacturer": "realme",
        "#device_model": "RMX1991",
        "#screen_width": 1080,
        "#system_language": "zh",
        "#os_version": "10",
        "#network_type": "WIFI",
        "#zone_offset": 8,
        "#app_version":"1.0"
    }
   */

    //Get a specific preset property
    string bundleId = presetProperties->bundleId;//Package name
    string os = presetProperties->os;//os type, such as Android
    string systemLanguage = presetProperties->systemLanguage;//Mobile system language type
    int screenWidth = presetProperties->screenWidth;//Screen width
    int screenHeight = presetProperties->screenHeight;//Screen height
    string deviceModel = presetProperties->deviceModel;//Device model
    string deviceId = presetProperties->deviceId;//Device unique identifier
    string carrier = presetProperties->carrier;//Mobile SIM card carrier information, for dual SIM dual standby, take the main card's carrier information
    string manufacture = presetProperties->manufacturer;//Mobile manufacturer, such as HuaWei
    string networkType = presetProperties->networkType;//Network type
    string osVersion = presetProperties->osVersion;//System version number
    string appVersion = presetProperties->appVersion;//app version number
    double zoneOffset = presetProperties->zoneOffset;//Timezone offset value
```

<!-- unsupported block: 34 -->

IP, country and city information are generated by server-side analysis, client does not provide interface to get these properties
