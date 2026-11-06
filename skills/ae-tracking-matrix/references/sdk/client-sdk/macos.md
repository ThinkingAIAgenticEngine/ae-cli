---
code: macos_sdk_installation
name: "macOS"
wikiToken: FNr7wvZGCiD2nEkoGzWcUEXOn0g
parentWikiToken: FTcTwinIOi3OiRkK4MPc2Ex7neg
updateTime: 1745310913000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=macos_sdk_installation
---

# macOS

::: tip Tip

Before integration, please read the pre-installation preparation first.

macOS SDK requires minimum system version OSX 10.11

:::

**Latest Version: **v3.0.4

**Update Time:** 2024-08-01

**Resource Download: **Source code

**Beta Version: **v3.0.5-beta.1

::: tip Note

iOS SDK from v3.0.0 version has adapted to macOS platform

:::

### 1. SDK Integration

Use CocoaPods to install SDK

1.Create and edit Podfile content (if exists, edit directly):

Create Podfile, execute command in command line under project (.xcodeproj) file directory:

```
pod init
```

Edit Podfile content as follows:

```
platform :osx, '10.10'
target 'YourProjectTarget' do
  pod 'ThinkingSDK'
end
```

2.Execute installation command

```
pod install
```

3.Import successfully, start project

After command executes successfully, `.xcworkspace` file will be generated, indicating you have successfully imported `SDK`. Open `.xcworkspace` file to start project (Note: Cannot open `.xcodeproj` file simultaneously)

### 2. Initialization

Complete initialization operation in main thread. Sample code as follows:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
#import <ThinkingSDK/ThinkingSDK.h>

// SDK needs to be initialized on the main thread

NSString *appid = @"APPID";
NSString *url = @"SERVER_URL";

// the first way
[TDAnalytics startAnalyticsWithAppId:appid serverUrl:url];

// the second way
TDConfig *config = [[TDConfig alloc] init];
config.appid = appid;
config.serverUrl = url;
[TDAnalytics startAnalyticsWithConfig:config];
```

:::

::: el-tab-pane label=Swift

```
// SDK needs to be initialized on the main thread

**let** appid = "APPID";
**let** url = "SERVER_URL";

// the first way
TDAnalytics.start(withAppId: appid, serverUrl: url)

// the second way
**let** config = TDConfig(appId: appid, serverUrl: url)
TDAnalytics.start(with: config)
```

:::

::::

Parameter Description:

- `APPID`: Your project's APPID, can be obtained from TE backend project management page
- `SERVER_URL`: Data upload URL
- If you are using cloud service, enter: https://global-receiver-ta.thinkingdata.cn
- If you are using private deployment version, please bind domain to data collection address and configure HTTPS certificate: https://YOUR_DATA_COLLECTION_DOMAIN

### 3. Common Features

Before using common features, we recommend you first understand the user identification rules. SDK will generate random number as visitor ID by default and persistently store it locally. Before user login, visitor ID will be used as identity identification ID. Note: Visitor ID will change when user reinstalls App or changes device.

#### 3.1 Setting Account ID

When user logs in, you can call `login:` to set user's account ID. TE platform will use account ID as identity identification ID, and the set account ID will be retained until `logout` is called. Multiple calls to `login:` will overwrite the previous account ID.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// User's login unique identifier, this data corresponds to #account_id in reported data, now #account_id value is TD
[TDAnalytics login:@"TD"];
```

:::

::: el-tab-pane label=Swift

```
// User's login unique identifier, this data corresponds to #account_id in reported data, now #account_id value is TD
TDAnalytics.login("TD")
```

:::

::::

<!-- unsupported block: 34 -->

**This method will not upload login event**

#### 3.2 Setting Common Event Properties

Common event properties refer to properties that every event will have. You can call `setSuperProperties` to set common event properties. We recommend you set common event properties before sending events. For some important properties, such as user's membership level, source channel, etc., these properties need to be set in every event. In this case, you can set these properties as common event properties.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
NSDictionary *superProperties = @{
    @"channel": @"ta",
    @"age": @1,
    @"isSuccess": @YES,
    @"birthday": [NSDate date],
    @"object": @{
        @"key":@"value"
    },
    @"object_arr":@[
        @{
            @"key":@"value"
        }
    ],
    @"arr": @[@"value"],
};
[TDAnalytics setSuperProperties:superProperties];
```

:::

::: el-tab-pane label=Swift

```
var superProperties: [AnyHashable : Any] = [:]
superProperties["channel"] = "ta" //string
superProperties["age"] = 1 //number
superProperties["isSuccess"] = true //boolean
superProperties["birthday"] = Date() //time
superProperties["object"] = [
    "key": "value"
] //object
superProperties["object_arr"] = [["key": "value"]] // object array
superProperties["arr"] = ["value"] // array

//set common event properties
TDAnalytics.setSuperProperties(superProperties)
```

:::

::::

Common event properties will be saved to cache and don't need to be called every time App starts. If `setSuperProperties:` is called to set a previously set common event property, it will overwrite the previous property.

- Event property is a `NSDictionary` object, where each element represents a property.
- Key is the property name, string type, must start with a letter, contain numbers, letters and underscore "\_", maximum 50 characters, case insensitive, TE will convert to lowercase
- Value is the property value, supports string, number, boolean, time, object, object array, array
- If you need to upload boolean properties, please use `@YES` and `@NO` or `[NSNumber numberWithBool:YES]` and `[NSNumber numberWithBool:NO]` to assign values. **Cannot use** `@true`, `@false`, `@TRUE` and `@FALSE` to assign boolean data.
<!-- unsupported block: 34 -->

**Event property and user property requirements are consistent with common event properties**

#### 3.3 Sending Events

You can call `track` to upload events. We recommend you set event properties and sending conditions according to your previously prepared tracking document. Here is an example of user purchasing a product:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// Upload product purchase event
NSDictionary *eventProperties = @{@"product_name": @"book"};
[TDAnalytics track:@"product_buy" properties:eventProperties];
```

:::

::: el-tab-pane label=Swift

```
// Upload product purchase event
**let** properties = ["product_name": "book"] **as** [String: **Any**]
TDAnalytics.track("product_buy", properties: properties)
```

:::

::::

Event name is string type, must start with a letter, can contain numbers, letters and underscore "\_", maximum 50 characters.

#### 3.4 Setting User Properties

For general user properties, you can call `user_set:` to set them. Properties uploaded using this interface will overwrite previous property values. If the user property did not exist before, it will create a new user property. The type will be consistent with the uploaded property type. Here is an example of setting username:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// "username" is "ThinkingData"
[TDAnalytics userSet:@{@"username": @"ThinkingData"}];
// "username" is "TA"
[TDAnalytics userSet:@{@"username": @"TA"}];
```

:::

::: el-tab-pane label=Swift

```
// Set user properties
//now "username" is "ThinkingData"
TDAnalytics.userSet(["usernaame": "ThinkingData"])
//now "username" is "TA"
TDAnalytics.userSet(["usernaame": "TA"])
```

:::

::::

### 4. Best Practices

The following sample code includes all the above operations. We recommend using the following steps:

```
if (privacy policy authorized) {
    // enable log
    [TDAnalytics enableLog:NO];

    // SDK needs to be initialized on the main thread
    NSString *appid = @"APPID";
    NSString *url = @"SERVER_URL";
    TDConfig *config = [[TDConfig alloc] init];
    config.appid = appid;
    config.serverUrl = url;
    [TDAnalytics startAnalyticsWithConfig:config];

    [TDAnalytics login:@"TD"];

    NSDictionary *superProperties = @{
        @"channel": @"ta",
        @"age": @1,
        @"isSuccess": @YES,
        @"birthday": [NSDate date],
        @"object": @{
            @"key":@"value"
        },
        @"object_arr":@[
            @{
                @"key":@"value"
            }
        ],
        @"arr": @[@"value"],
    };
    [TDAnalytics setSuperProperties:superProperties];

    NSDictionary *eventProperties = @{@"product_name": @"book"};
    [TDAnalytics track:@"product_buy" properties:eventProperties];

    // "username" is "ThinkingData"
    [TDAnalytics userSet:@{@"username": @"ThinkingData"}];
}

```

---

# Advanced Guide

### 1. Setting User ID

SDK instance will use `DeviceID_InstallCount` as the default visitor ID for each user by default. This visitor ID will be used as the identity identification ID when user is not logged in. Note that visitor ID will change when user reinstalls App or changes device.

#### 1.1 Setting Visitor ID

::: tip Tip

Generally, you don't need to customize visitor ID. Please make sure you understand the user identification rules before setting visitor ID.

If you need to replace visitor ID, you should call it immediately after SDK initialization is completed. Do not call it multiple times to avoid generating useless accounts.

:::

If your App has its own visitor ID management system for each user, you can call `setDistinctId` to set visitor ID:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
[TDAnalytics setDistinctId:@"Thinker"];
```

:::

::: el-tab-pane label=Swift

```
TDAnalytics.setDistinctId("Thinker")
```

:::

::::

If you need to get the current visitor ID, you can call `getDistinctId`:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
NSString *distinctId = [TDAnalytics getDistinctId];
```

:::

::: el-tab-pane label=Swift

```
let distinctId = TDAnalytics.getDistinctId()
```

:::

::::

#### 1.2 Setting Account ID

When user logs in, you can call `login` to set user's account ID. TE platform will use account ID as identity identification ID, and the set account ID will be retained until `logout` is called. Multiple calls to `login` will overwrite the previous account ID.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
[TDAnalytics login:@"TD"];
```

:::

::: el-tab-pane label=Swift

```
TDAnalytics.login("TD")
```

:::

::::

<!-- unsupported block: 34 -->

**This method will not upload login event**

#### 1.3 Clearing Account ID

After user logs out, you can call `logout` to clear account ID. Before the next `login` call, visitor ID will be used as identity identification ID.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
[TDAnalytics logout];
```

:::

::: el-tab-pane label=Swift

```
TDAnalytics.logout()
```

:::

::::

We recommend you call `logout` at explicit logout events, such as when user performs account deregistration action, rather than when closing App.

<!-- unsupported block: 34 -->

**This method will not upload logout event**

### 2. Sending Events

After SDK initialization is completed, you can perform data tracking and collect user behavior information. Regular events can generally meet business scenario requirements. You can also use first-time, updatable events according to your actual business scenarios.

#### 2.1 Regular Events

You can call `track` to upload events. We recommend you set event properties and sending conditions according to your previously prepared document. Here is an example of user purchasing a product:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
NSDictionary *eventProperties = @{@"product_name": @"book"};
[TDAnalytics track:@"product_buy" properties:eventProperties];
```

:::

::: el-tab-pane label=Swift

```
let properties = ["product_name": "book"] as [String: Any]
TDAnalytics.track("product_buy", properties: properties)
```

#### 2.2 First-time Events

First-time events refer to events that will only be recorded once for a certain device or other dimension ID. For example, in some scenarios, you may want to record an activation event on a certain device, you can use first-time events to report data.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
TDFirstEventModel *firstModel = [[TDFirstEventModel alloc] initWithEventName:@"device_activation"];
firstModel.properties = @{@"key":@"value"};
[TDAnalytics trackWithEventModel:firstModel];
```

:::

::: el-tab-pane label=Swift

```
let firstModel = TDFirstEventModel(eventName:"device_activation")
firstModel.properties = ["KEY": "VALUE"]
TDAnalytics.track(with: firstModel)
```

:::

::::

If you want to use other dimensions other than device to judge whether it's first-time, you can customize first_check_id for first-time events:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
TDFirstEventModel *firstModel = [[TDFirstEventModel alloc] initWithEventName:@"device_activation" firstCheckID:@"TD"];
firstModel.properties = @{@"key":@"value"};
[TDAnalytics trackWithEventModel:firstModel];
```

:::

::: el-tab-pane label=Swift

```
let firstModel = TDFirstEventModel(eventName:"device_activation", firstCheckID:"TD")
firstModel.properties = ["KEY": "VALUE"]
TDAnalytics.track(with: firstModel)
```

:::

::::

<!-- unsupported block: 34 -->

Note: Since the verification of whether it's first-time is completed on the server side, first-time events will be delayed by 1 hour before being stored in database.

#### 2.3 Updatable Events

You can use updatable events to implement the need to modify event data in specific scenarios. Updatable events need to specify an ID that identifies the event, and pass it when creating the updatable event object. TE backend will determine the data to be updated based on event name and event ID.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// Example: report updatable event, assuming event name is UPDATABLE_EVENT
// After reporting, event property status is 3, price is 100
TDUpdateEventModel *updateModel = [[TDUpdateEventModel alloc] initWithEventName:@"UPDATABLE_EVENT" eventID:@"test_event_id"];
updateModel.properties = @{@"status": @3, @"price": @100};
[TDAnalytics trackWithEventModel:updateModel];

// After reporting, event property status is updated to 5, price remains unchanged
TDUpdateEventModel *updateModelNew = [[TDUpdateEventModel alloc] initWithEventName:@"UPDATABLE_EVENT" eventID:@"test_event_id"];
updateModelNew.properties = @{@"status": @5};
[TDAnalytics trackWithEventModel:updateModelNew];
```

:::

::: el-tab-pane label=Swift

```
// Example: report updatable event, assuming event name is UPDATABLE_EVENT
// After reporting, event property status is 3, price is 100
let updateModel = TDUpdateEventModel(eventName: "UPDATABLE_EVENT", eventID: "test_event_id")
updateModel.properties = ["status": 3, "price": 100]
TDAnalytics.track(with: updateModel)

// After reporting, event property status is 5, price remains unchanged
let updateModel_new = TDUpdateEventModel(eventName: "UPDATABLE_EVENT", eventID: "test_event_id")
updateModel_new.properties = ["status": 5]
TDAnalytics.track(with: updateModel_new)
```

:::

::::

#### 2.4 Overwritable Events

Overwritable events are similar to updatable events, the difference is that overwritable events will completely overwrite previous data with the latest data. From the effect, it's equivalent to deleting the previous data and storing the latest data. TE backend will determine the data to be updated based on event name and event ID.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// Example: report overwritable event, assuming event name is OVERWRITE_EVENT
// After reporting, event property status is 3, price is 100
TDOverwriteEventModel *overwriteModel = [[TDOverwriteEventModel alloc] initWithEventName:@"OVERWRITE_EVENT" eventID:@"test_event_id"];
overwriteModel.properties = @{@"status": @3, @"price": @100};
[TDAnalytics trackWithEventModel:overwriteModel];

// After reporting, event property status is 5, price property is deleted
TDOverwriteEventModel *overwriteModel_new = [[TDOverwriteEventModel alloc] initWithEventName:@"OVERWRITE_EVENT" eventID:@"test_event_id"];
overwriteModel_new.properties = @{@"status": @5};
[TDAnalytics trackWithEventModel:overwriteModel_new];
```

:::

::: el-tab-pane label=Swift

```
// Example: report overwritable event, assuming event name is OVERWRITE_EVENT
// After reporting, event property status is 3, price is 100
let overwriteModel = TDOverwriteEventModel(eventName: "OVERWRITE_EVENT", eventID: "test_event_id")
overwriteModel.properties = ["status": 3, "price": 100]
TDAnalytics.track(with: overwriteModel)

// After reporting, event property status is 5, price is deleted
let overwriteModel_new = TDOverwriteEventModel(eventName: "UPDATABLE_EVENT", eventID: "test_event_id")
overwriteModel_new.properties = ["status": 5]
TDAnalytics.track(with: overwriteModel_new)
```

:::

::::

### 2.5 Common Event Properties

Common event properties refer to properties that every event will upload. Based on property update frequency, common event properties are divided into `static common event properties` and `dynamic common event properties`. You can choose different common event property setting methods according to your specific business scenario requirements; we recommend you set common event properties before sending events. For the same event, when common event property, event custom property, preset property have the same Key, we will assign values according to the following priority: `custom property>dynamic common event property>static common event property>preset property`.

#### 2.5.1 Static Common Event Properties

Static common event properties are low-frequency changing properties that every event will have, such as user membership level. After setting static common event properties via `setSuperProperties`, SDK will get the set common event properties as event properties when collecting events.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
[TDAnalytics setSuperProperties:@{@"vip_level": @(2)}];
```

:::

::: el-tab-pane label=Swift

```
TDAnalytics.setSuperProperties(["vip_level" : 2])
```

:::

::::

Static common event properties will be saved to cache and don't need to be called every time App starts. If the property already exists, the newly set property will overwrite the original property value; if the property did not exist before, it will create a new property. Besides property setting, we also provide other APIs to operate static common event properties to meet daily business needs.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// Clear a common event property, clear previously set "isTest" property
[TDAnalytics unsetSuperProperty:@"isTest"];

// Clear all common event properties
[TDAnalytics clearSuperProperties];

//Get all common properties
[TDAnalytics getSuperProperties];
```

:::

::: el-tab-pane label=Swift

```
// Clear a common event property, clear previously set "isTest" property
TDAnalytics.unsetSuperProperty("isTest")

// Clear all common event properties
TDAnalytics.clearSuperProperties()

// Get all common properties
TDAnalytics.getSuperProperties()
```

:::

::::

#### 2.5.2 Dynamic Common Event Properties

Dynamic common event properties are high-frequency changing properties that every event will have, such as user's coin count. After setting dynamic common property class via `setDynamicSuperProperties`, SDK will get dynamic common properties when collecting events and add them to the triggered event.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// Set dynamic common property, dynamically get event occurrence time when event is reported
[TDAnalytics setDynamicSuperProperties:^NSDictionary * _Nonnull{
    return @{@"now": [NSDate date]};
}];
```

:::

::: el-tab-pane label=Swift

```
// Set dynamic common property, dynamically get event occurrence time when event is reported
TDAnalytics.setDynamicSuperProperties{ () -> [String : Any] in
    return ["now": Date()]
}
```

:::

::::

### 2.6 Recording Event Duration

If you need to record the duration of an event, you can call `timeEvent` to start timing. Configure the event name you want to time. When you upload the event, `#duration` property will be automatically added to your event properties to represent the recorded duration, in seconds. Note that the same event name can only have one timing task.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// The following example completes the statistics of user staying time on a product page
[TDAnalytics timeEvent:@"stay_shop"];
    /*
     do someting .......
     */
// User leaves product page, timing ends, "stay_shop" event will have #duration property representing event duration
[TDAnalytics track:@"stay_shop"];
```

:::

::: el-tab-pane label=Swift

```
//The following example completes the statistics of user staying time on a product page
TDAnalytics.timeEvent("stay_shop")
    /*
     do someting .......
     */
//User leaves product page, timing ends, "stay_shop" event will have #duration property representing event duration
TDAnalytics.track("stay_shop")
```

:::

::::

### 3. User Properties

TE platform supports the following user property setting APIs: `userSet`, `userSetOnce`, `userAdd`, `userUnset`, `userDelete`, `userAppend`, `userUniqAppend`.

#### 3.1 userSet

For general user properties, you can call `userSet` to set them. Properties uploaded using this interface will overwrite previous property values. If the user property did not exist before, it will create a new user property. The type will be consistent with the uploaded property type. Here is an example of setting username:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
//now "username" is "ThinkingData"
[TDAnalytics userSet:@{@"username": @"ThinkingData"}];
//now "username" is "TA"
[TDAnalytics userSet:@{@"username": @"TA"}];
```

:::

::: el-tab-pane label=Swift

```
// Set user properties
//now "username" is "ThinkingData"
TDAnalytics.userSet(["username": "ThinkingData"])
//now "username" is "TA"
TDAnalytics.userSet(["username": "TA"])
```

:::

::::

#### 3.2 userSetOnce

If you want to upload a user property that only needs to be set once, you can call `userSetOnce` to set it. When the property already has a value, this information will be ignored. Here is an example of setting first payment time:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// first_payment_time is 2018-01-01 01:23:45.678
[TDAnalytics userSetOnce:@{@"first_payment_time": @"2018-01-01 01:23:45.678"}];
// first_payment_time remains 2018-01-01 01:23:45.678
[TDAnalytics userSetOnce:@{@"first_payment_time": @"2018-12-31 01:23:45.678"}];
```

:::

::: el-tab-pane label=Swift

```
// first_payment_time is 2018-01-01 01:23:45.678
TDAnalytics.userSetOnce(["first_payment_time": "2018-01-01 01:23:45.678"])
// first_payment_time remains 2018-01-01 01:23:45.678
TDAnalytics.userSetOnce(["first_payment_time": "2018-12-31 01:23:45.678"])
```

:::

::::

#### 3.3 userAdd

When you want to upload numeric properties, you can call `userAdd` to perform cumulative operations on the property. If the property has not been set, it will be assigned 0 before calculation. Negative values can be passed, equivalent to subtraction operation. Here is an example of cumulative payment amount:

:::: el-tabs

::: el-tab-pane label=Objective-C

```
//total_revenue is 30
[TDAnalytics userAdd:@{@"total_revenue": @30}];

//total_revenue is 678
[TDAnalytics userAdd:@{@"total_revenue": @648}];
```

:::

::: el-tab-pane label=Swift

```
//total_revenue is 30
TDAnalytics.userAdd(["total_revenue": 30])

//total_revenue is 678
TDAnalytics.userAdd(["total_revenue": 648])
```

:::

::::

#### 3.4 userUnset

When you want to clear a user's user property value, you can call `userUnset` to clear the specified property. If the property has not been created in the cluster, `userUnset` will **not** create the property

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// Clear the user's cumulative payment amount property value
[TDAnalytics userUnset:@"total_revenue"];
```

:::

::: el-tab-pane label=Swift

```
// Clear the user's cumulative payment amount property value
TDAnalytics.userUnset("total_revenue")
```

:::

::::

#### 3.5 userDelete

If you want to delete a user, you can call `userDelete` to delete the user. You will no longer be able to query this user's user properties, but the events generated by this user can still be queried.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
[TDAnalytics userDelete];
```

:::

::: el-tab-pane label=Swift

```
TDAnalytics.userDelete()
```

:::

::::

#### 3.6 userAppend

You can call `userAppend` to append elements to Array type user properties.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// Call userAppend to append elements to user property product_buy. If not exists, will create this element
[TDAnalytics userAppend:@{@"product_buy": @[@"apple", @"ball"]}];
```

:::

::: el-tab-pane label=Swift

```
// Call userAppend to append elements to user property product_buy. If not exists, will create this element
TDAnalytics.userAppend(["product_buy": ["apple", "ball"]])
```

:::

::::

#### 3.7 userUniqAppend

From v2.8.0, you can call `userUniqAppend` to append elements to Array type user properties.

Calling `userUniqAppend` interface will deduplicate the appended user properties, `userAppend` interface does not deduplicate, user properties can have duplicates.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// user_list property value is ["apple", "ball"]
[TDAnalytics userAppend:@{@"user_list":@[@"apple", @"ball"]}];
// user_list property value is ["apple","apple","ball","cube"]
[TDAnalytics userAppend:@{@"user_list":@[@"apple", @"cube"]}];
// user_list property value is ["apple", "ball","cube"]
[TDAnalytics userUniqAppend:@{@"user_list":@[@"apple", @"cube"]}];
```

:::

::: el-tab-pane label=Swift

```
// user_list property value is ["apple", "ball"]
TDAnalytics.userAppend(["user_list": ["apple", "ball"]])
// user_list property value is ["apple","apple","ball","cube"]
TDAnalytics.userAppend(["user_list": ["apple", "cube"]])
// user_list property value is ["apple", "ball","cube"]
TDAnalytics.userUniqAppend(["user_list": ["apple", "cube"]])
```

:::

::::

### 4. Other Features

#### 4.1 Getting Device ID

You can call `getDeviceId` to get device ID:

```
[TDAnalytics getDeviceId];
```

#### 4.2 Setting Default Timezone

By default, SDK will use local time when interface is called as event occurrence time for reporting. You can also set default timezone interface to specify default timezone, so all events will align event time according to your set timezone:

```
// Get TDConfig instance
TDConfig *config = [[TDConfig alloc] init];
// Set default timezone to UTC
config.defaultTimeZone = [NSTimeZone timeZoneWithName:@"UTC"];
// Initialize SDK
[TDAnalytics startAnalyticsWithConfig:config];
```

<!-- unsupported block: 34 -->

Note: Aligning event time with specified timezone will lose device local timezone information. If you need to preserve device local timezone information, you currently need to add related properties to events yourself.

#### 4.3 Time Calibration

SDK will use local time as event occurrence time by default. If user manually modifies device time, it will affect your business analysis. In this case, you can use time calibration operation to ensure the accuracy of event occurrence time. We provide `timestamp`, `NTP` two time calibration methods.

You can use the current timestamp obtained from server to calibrate SDK time. After that, all calls without specified time, including event data and user property setting operations, will use the calibrated time as occurrence time.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// 1585633785954 is current unix timestamp in milliseconds, corresponding to Beijing time 2020-03-31 13:49:45
[TDAnalytics calibrateTime:1585633785954];
```

:::

::: el-tab-pane label=Swift

```
// 1585633785954 is current unix timestamp in milliseconds, corresponding to Beijing time 2020-03-31 13:49:45
TDAnalytics.calibrateTime(1585633785954)
```

:::

::::

You can also set NTP server address, then SDK will try to get current time from the passed NTP service address and calibrate SDK time. If correct result is not obtained within default timeout (3 seconds), local time will be used for data reporting.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
// Use Apple's NTP service for time calibration
[TDAnalytics calibrateTimeWithNtp:@"time.apple.com"];
```

:::

::: el-tab-pane label=Swift

```
TDAnalytics.calibrateTime(withNtp:"time.apple.com")
```

:::

::::

<!-- unsupported block: 34 -->

- Using NTP service for time calibration has some uncertainty, we recommend you prefer using timestamp calibration method
- You need to carefully choose your NTP server address to ensure that user devices can quickly get server time under good network conditions

#### 4.4 Immediately Upload Data

In certain business scenarios, if you expect data to be immediately uploaded to TE server, you can call `flush` interface

::: el-tabs

::: el-tab-pane label=Objective-C

```
[TDAnalytics flush];
```

:::

::: el-tab-pane label=Swift

```
TDAnalytics.flush()()
```

:::

::::

---

# Real-time Debugging

During SDK integration, you can view SDK logs in IDE console or use TE's Debug feature for real-time debugging.

### 1. Printing SDK Logs

:::: el-tabs

::: el-tab-pane label=Objective-C

```
[TDAnalytics enableLog:YES];
```

:::

::: el-tab-pane label=Swift

```
TDAnalytics.enableLog(true)
```

:::

::::

<!-- unsupported block: 34 -->

After enabling logs, you can filter ThinkingData related logs in IDE to observe SDK data reporting.

### 2. Enabling Debug Mode

Enabling Debug mode requires two steps:

1. Enable Debug mode on client
   Here is sample code for enabling Debug mode on client:

```
[TDAnalytics enableLog:YES];
NSString *appid = @"AppId";
NSString *url = @"ServerUrl";

// SDK needs to be initialized on the main thread

// the second way
TDConfig *config = [[TDConfig alloc] init];
config.appid = appid;
config.serverURL = url;
/*
Set running mode to Debug mode
Normal mode: data will be cached and uploaded according to certain caching strategy, default is normal mode; recommended for production environment
Debug mode: data is uploaded one by one. When problems occur, it will alert users via logs and exceptions; not recommended for production environment
DebugOnly mode: only validate data, will not store; not recommended for production environment
 */
config.mode = TDModeDebug;
[TDAnalytics startAnalyticsWithConfig:config];
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

# Preset Properties

#### 1. Preset Properties for All Events

The following preset properties are preset properties that all events in SDK will have

**Property Name**

**Chinese Name**

Property Type

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

iOS 11.2.2, Android 8.0.0 etc.

#manufacturer

Device Manufacturer

Text

User's device manufacturer, such as Apple, vivo etc.

#os

OS

Text

Such as Android, iOS etc.

#device_id

Device ID

Text

User's device ID, iOS gets user's IDFV or UUID, Android gets androidID

#app_version

APP Version

Text

Your APP version

#bundle_id

App Unique Identifier

Text

App package name or process name

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

Network status when uploading event, such as WIFI, 3G, 4G etc.

#zone_offset

Timezone Offset

Number

Data time offset hours relative to UTC time

#install_time

Program Install Time

Time

User's app install time, value from system

#system_language

System Language

Text

User's device system language (ISO 639-1, i.e. two lowercase English letters), such as zh, en etc.

#### 2. Other Preset Properties

Besides the preset properties mentioned above, there are some preset properties that need to call corresponding interfaces to be recorded:

**Property Name**

**Chinese Name**

Property Type

**Description**

#duration

Event Duration

Number

Need to call timing function interface `timeEvent:`, records event occurrence duration, unit is seconds

#background_duration

Background Stay Duration

Number

Need to call timing function interface `timeEvent`, records app's background stay duration within event occurrence interval, unit is seconds

#### 3. Getting Preset Properties

You can call `getPresetProperties` method to get preset properties.

When server-side tracking needs some preset properties from App side, you can use this method to get App side preset properties and then pass to server.

:::: el-tabs

::: el-tab-pane label=Objective-C

```
//Get property object
TDPresetProperties *presetProperties = [TDAnalytics getPresetProperties];

//Generate event preset properties
NSDictionary *properties = [presetProperties toEventPresetProperties];
/*
   {
        "#os": "iOS",
        "#device_id": "A8B1C00B-A6AC-4856-8538-0FBC642C1BAD",
        "#bundle_id": "com.sw.thinkingdatademo",
        "#manufacturer": "Apple",
        "#system_language": "zh",
        "#os_version": "10",
        "#network_type": "WIFI",
        "#zone_offset": 8,
        "#app_version":"1.0.0"
    }
*/

//Get a specific preset property
NSString *bundle_id = presetProperties.bundle_id;//package name
NSString *os = presetProperties.os;//os type, such as iOS
NSString *system_language = presetProperties.system_language;//phone system language type
NSString *os_version = presetProperties.os_version;//system version number
NSNumber *zone_offset = presetProperties.zone_offset;//timezone offset
```

:::

::: el-tab-pane label=Swift

```
let presetProperties = TDAnalytics.getPresetProperties();

//Generate event preset properties
let properties = presetProperties.toEventPresetProperties();

//Get a specific preset property
let bundle_id = presetProperties.bundle_id;//package name
let os = presetProperties.os;//os type, such as iOS
let system_language = presetProperties.system_language;//phone system language type
let os_version = presetProperties.os_version;//system version number
let zone_offset = presetProperties.zone_offset;//timezone offset value
```

:::

::::

<!-- unsupported block: 34 -->

IP, country and city information are generated from server-side parsing, client does not provide interface to get these properties
