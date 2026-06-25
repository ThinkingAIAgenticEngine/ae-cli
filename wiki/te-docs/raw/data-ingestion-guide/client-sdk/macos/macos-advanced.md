---
code: macos_sdk_advanced
name: "macOS-Advanced"
wikiToken: VXDLwciQyixZ39kwAI5cDeRfndd
parentWikiToken: AjsqwxZYhiklqfkGXetcWhjBnue
updateTime: 1774252001000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=macos_sdk_advanced
---

## 1**.** Managing User Identity
SDK TDAnalyticss would use random UUID as the default distinct ID of each user by default, which would be used as the identity identification ID of users under an unlogged-in state. It should be noted that the distinct ID would change after the user reinstalled the APP or used the APP with a new device.
### **1.1.** Identify
::: tip
Generally speaking, you do not need to customize a distinct ID. Please ensure that you understand [<text underline="true">User Identification Rules</text>](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc)<text color="purple" underline="true"> </text>before setting a distinct ID. 
If you need to change the distinct ID, please call the API immediately after SDK is initialized. To avoid the generation of useless accounts, please do not call such a process multiple times.
:::
If your APP has its own distinct ID management system for each user, you can call `setDistinctId` to set the distinct ID:
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
// set distinct ID as Thinker
[TDAnalytics setDistinctId:@"Thinker"];
```

:::
::: el-tab-pane label=Swift
```swift
// set distinct ID as Thinker
TDAnalytics.setDistinctId("Thinker")
```

:::
::::
If you need to get the current distinct ID, please call `getDistinctId`:
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
//Return distinct ID
NSString* distinctId = [TDAnalytics getDistinctId];
```

:::
::: el-tab-pane label=Swift
```swift
//Return distinct ID
let distinctId = TDAnalytics.getDistinctId()
```

:::
::::
### **1.2 Login**
When the users  log in, `login` could be called to set the account ID of the user. TE  would use the account ID as the identity identification ID, and the account ID that has been set would be saved before `logout` is called. The previous account ID would be replaced if `login` has been called multiple times.
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
// The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TE
[TDAnalytics login:@"TE"];
```

:::
::: el-tab-pane label=Swift
```swift
// The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TE
TDAnalytics.login("TE")
```

:::
::::
<quote-container>
**Login events wouldn't be uploaded in this method.**
</quote-container>

### **1.3 Removing Account ID**
After the user logs out, `logout` could be called to remove the account ID. The distinct ID would be used as the identity identification ID before the next time `login` is called. 
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
[TDAnalytics logout];
```

:::
::: el-tab-pane label=Swift
```swift
TDAnalytics.logout()
```

:::
::::
It is recommended that you call logout upon explicit logout event. For example, call `logout` when the user commits the behavior of canceling an account; do not call such a process when the APP is closed.
<quote-container>
**Logout events wouldn't be uploaded in this method.**
</quote-container>

## **Sending Events**
After SDK is initialized, you can track user behaviour data. In general, ordinary events could meet business requirements. You can also use the First/Updatable Event based on your own business requirements.
### **2.1 Ordinary Events**
 You can call `track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
NSDictionary *eventProperties = @{ @"product_name": @"product name"};
[TDAnalytics track:@"product_buy" properties:eventProperties];
```

:::
::: el-tab-pane label=Swift
```swift
let properties = ["product_name": "product name"] as [String: Any]
TDAnalytics.track("product_buy", properties: properties)
```

### **2.2 First Events**
The First Events refers to events that would only be recorded once for the ID of a certain device or other dimensions. For example, under certain scenarios, you may want to record the activation event on a certain device. In this case, you can perform data tracking with the First Event.
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
TDFirstEventModel *firstModel = [[TDFirstEventModel alloc] initWithEventName:@"device_activation"];
firstModel.properties = @{@"key":@"value"};
[TDAnalytics trackWithEventModel:firstModel];
```

:::
::: el-tab-pane label=Swift
```swift
let firstModel = TDFirstEventModel(eventName:"device_activation")
firstModel.properties = ["KEY": "VALUE"]
TDAnalytics.track(with: firstModel)
```

:::
::::
If you want to judge whether an event is the first event from other dimensions, you can define a first_check_id for the First Event:
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
TDFirstEventModel *firstModel = [[TDFirstEventModel alloc] initWithEventName:@"device_activation" firstCheckID:@"TD"];
firstModel.properties = @{@"key":@"value"};
[TDAnalytics trackWithEventModel:firstModel];
```

:::
::: el-tab-pane label=Swift
```swift
let firstModel = TDFirstEventModel(eventName:"device_activation", firstCheckID:"TD")
firstModel.properties = ["KEY": "VALUE"]
TDAnalytics.track(with: firstModel)
```

:::
::::
<quote-container>
Note: Since the server has to check whether the event is the First Event, the First Event will be put in storage one hour later by default.
</quote-container>

### **2.3 Updatable Events**
You can meet the requirements for event data modification under specific scenarios through Updatable Events. The ID of Updatable Events should be specified and uploaded when the objects of Updatable Events are created. TE would determine the data to be updated according to the event name and event ID.
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
 //The event property status is 3 after reporting, with the price being 100
TDUpdateEventModel *updateModel = [[TDUpdateEventModel alloc] initWithEventName:@"UPDATABLE_EVENT" eventID:@"test_event_id"];
updateModel.properties = @{@"status": @3, @"price": @100};
[TDAnalytics trackWithEventModel:updateModel];

//The event property status is 5 after reporting, with the price remaining the same
TDUpdateEventModel *updateModelNew = [[TDUpdateEventModel alloc] initWithEventName:@"UPDATABLE_EVENT" eventID:@"test_event_id"];
updateModelNew.properties = @{@"status": @5};
[TDAnalytics trackWithEventModel:updateModelNew];
```

:::
::: el-tab-pane label=Swift
```swift
 //The event property status is 3 after reporting, with the price being 100 let updateModel = TDUpdateEventModel(eventName: "UPDATABLE_EVENT", eventID: "test_event_id")
let updateModel = TDUpdateEventModel(eventName: "UPDATABLE_EVENT", eventID: "test_event_id")
updateModel.properties = ["status": 3, "price": 100]
TDAnalytics.track(with: updateModel)

//The event property status is 5 after reporting, with the price remaining the same
let updateModel_new = TDUpdateEventModel(eventName: "UPDATABLE_EVENT", eventID: "test_event_id")
updateModel_new.properties = ["status": 5]
TDAnalytics.track(with: updateModel_new)
```

:::
::::
### **2.4 Overwritable Events**
Despite the similarity with Updatable Events, Overwritable Events would replace all historical data with the latest data. Looking from the perspective of effect, such a process is equivalent to the behavior of deleting the previous data while putting the latest data in storage. TE would determine the data to be updated according to the event name and event ID.
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
// TDAnalytics: Assume the event name is OVERWRITE_EVENT when reporting an overwritable event
//The event property status is 3 after reporting, with the price being 100
TDOverwriteEventModel *overwriteModel = [[TDOverwriteEventModel alloc] initWithEventName:@"OVERWRITE_EVENT" eventID:@"test_event_id"];
overwriteModel.properties = @{@"status": @3, @"price": @100};
[TDAnalytics trackWithEventModel:overwriteModel];

//The event property status is 5 after reporting, with the price deleted
TDOverwriteEventModel *overwriteModel_new = [[TDOverwriteEventModel alloc] initWithEventName:@"OVERWRITE_EVENT" eventID:@"test_event_id"];
overwriteModel_new.properties = @{@"status": @5};
[TDAnalytics trackWithEventModel:overwriteModel_new];
```

:::
::: el-tab-pane label=Swift
```swift
// TDAnalytics: Assume the event name is OVERWRITE_EVENT when reporting an overwritable event
//The event property status is 3 after reporting, with the price being 100 let overwriteModel = TDOverwriteEventModel(eventName: "OVERWRITE_EVENT", eventID: "test_event_id")
let overwriteModel = TDOverwriteEventModel(eventName: "OVERWRITE_EVENT", eventID: "test_event_id")
overwriteModel.properties = ["status": 3, "price": 100]
TDAnalytics.track(with: overwriteModel)

//The event property status is 5 after reporting, with the price deleted
let overwriteModel_new = TDOverwriteEventModel(eventName: "UPDATABLE_EVENT", eventID: "test_event_id")
overwriteModel_new.properties = ["status": 5]
TDAnalytics.track(with: overwriteModel_new)
```

:::
::::
## **2.5 Super Properties**
Super properties refer to properties that would be uploaded by each event. Super properties could be divided into `static super properties` and `dynamic super properties`based on the update frequency. You can select different methods for super property setting according to business requirements; we recommend that you set super properties first before sending events. In the same event, when the keys of super properties, self-defined event properties, and preset properties are the same, we would assign value according to the following priority:  `self-defined properties>dynamic super properties>static super properties>preset properties`.
#### **2.5.1 Static Super Properties**
Static Super Properties are properties that all events might have and would change with a low frequency, for example, the user membership class. After setting Static Super Properties through `setSuperProperties`, SDK would use the preset Super Properties as the event properties when tracking events.
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
[TDAnalytics setSuperProperties:@{@"vip_level": @(2)}];
```

:::
::: el-tab-pane label=Swift
```swift
TDAnalytics.setSuperProperties(["vip_level" : 2])
```

:::
::::
Static Super Properties would be saved in local storage, and should not be called every time the App is closed. If such properties already exist, the reset properties would replace the original properties. If such properties do not exist, properties would be newly created. In addition to property setting, we also provide other APIs to set and manage Static Super Properties and meet general business requirements.
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
//clear a certain super property
[TDAnalytics unsetSuperProperty:@"isTest"];

//clear all certain super properties
[TDAnalytics clearSuperProperties];

//get all certain super properties
[TDAnalytics getSuperProperties];
```

:::
::: el-tab-pane label=Swift
```swift
//clear a certain super property
TDAnalytics.unsetSuperProperty("isTest")

//clear all certain super properties
TDAnalytics.clearSuperProperties()

//get all certain super properties
TDAnalytics.getSuperProperties()
```

:::
::::
### **2.5.2 Dynamic Super Properties**
Dynamic Super Properties that all events might have and would change with a high frequency, for example, the quantity of the gold coins the user possesses. After setting Dynamic Super Properties through `setDynamicSuperProperties`, SDK would get the properties in event tracking automatically, and add such properties to the event triggered.
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
int coin = 0;
//frequency update of gold coin quantity 
[TDAnalytics setDynamicSuperProperties:^NSDictionary * _Nonnull{
    coin++;
    return @{@"coin": @(coin)};
}];
```

:::
::: el-tab-pane label=Swift
```swift
var coin = 0 ;
//frequency update of gold coin quantity 
TDAnalytics.setDynamicSuperProperties { () -> [String : Any] in
    coin++
    return ["coin": coin]
}
```

:::
::::
## **2.6 Timing Events**
If you need to record the duration of a certain event, you can call `timeEvent` . Configure the name of the event you want to record. When you upload the event, `#duration` would be added to your event property automatically to record the duration of the event (unit: second). It should be noted that only one task can be timed with the same event name.
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
//The following TDAnalytics has recorded the time the user spent on a certain product page
[TDAnalytics timeEvent:@"stay_shop"];
 /**do someting
    .......
 **/
//the timing would end when the user leaves the product page. "stay_shop" event would carry#duration, a property representing event duration. 
[TDAnalytics track:@"stay_shop"];
```

:::
::: el-tab-pane label=Swift
```swift
//The following TDAnalytics has recorded the time the user spent on a certain product page
TDAnalytics.timeEvent("stay_shop")
 /**do someting
    .......
 **/
//the timing would end when the user leaves the product page. "stay_shop" event would carry#duration, a property representing event duration. 
TDAnalytics.track("stay_shop")
```

:::
::::
## **3. User Properties**
User property setting APIs supported by TE  include: `userSet`, `userSetOnce`, `userAdd`, `userUnset`, `userDelete`, `userAppend`, `userUniqAppend`.
### 3.1 UserSet
You can call `userSet` to set general user properties. The original properties would be replaced if the properties uploaded via the API are used. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here:
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
//the username now is ThinkingData
[TDAnalytics userSet:@{@"username": @"ThinkingData"}];
//the username now is TE
[TDAnalytics userSet:@{@"username": @"TE"}];
```

:::
::: el-tab-pane label=Swift
```swift
//the username now is ThinkingData
TDAnalytics.userSet(["usernaame": "ThinkingData"])
//the username now is TE
TDAnalytics.userSet(["usernaame": "TE"])
```

:::
::::
### 3.2 UserSetOnce
If the user property you want to upload only needs to be set once, you can call `userSetOnce` to set the property. If such property had been set before, this message would be ignored. Let's take the setting of the first payment time as an example:
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
//first_payment_time is 2018-01-01 01:23:45.678
[TDAnalytics userSetOnce:@{@"first_payment_time": @"2018-01-01 01:23:45.678"}];
//first_payment_time is still 2018-01-01 01:23:45.678
[TDAnalytics userSetOnce:@{@"first_payment_time": @"2018-12-31 01:23:45.678"}];
```

:::
::: el-tab-pane label=Swift
```swift
//first_payment_time is 2018-01-01 01:23:45.678
[TDAnalytics userSetOnce:@{@"first_payment_time": @"2018-01-01 01:23:45.678"}];
//first_payment_time is still 2018-01-01 01:23:45.678
TDAnalytics.userSetOnce(["first_payment_time": "2018-12-31 01:23:45.678"])
```

:::
::::
### 3.3 UserAdd
When you want to upload numeric properties for cumulative operation, you can call `userAdd`.
If the property has not been set, it would be given a value of 0 before computing. A negative value could be uploaded, which is equivalent to subtraction operation. Let's take the accumulative payment amount as an example:
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
//in this case, the total_revenue is 30
[TDAnalytics userAdd:@{@"total_revenue": @30}];

//in this case, the total_revenue is 678
[TDAnalytics userAdd:@{@"total_revenue": @648}];
```

:::
::: el-tab-pane label=Swift
```swift
//in this case, the total_revenue is 30
TDAnalytics.userAdd(["total_revenue": 30])

//in this case, the total_revenue is 678
TDAnalytics.userAdd(["total_revenue": 648])
```

:::
::::
<quote-container>
Properties key is a string, and the Value is only allowed to be a numeric value.
</quote-container>

### 3.4 UserUnset
When you need to clear the user properties of users, you can call `userUnset` to clear specific properties.  `userUnset` would not create properties that have not been created in the cluster.
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
// reset properties of a single user
[TDAnalytics userUnset:@"key"];
```

:::
::: el-tab-pane label=Swift
```swift
// reset properties of a single user
TDAnalytics.userUnset("key")
```

:::
::::
### 3.5 UserDelete
You can call `userDelete` to delete a user. After deleting the user, you would no longer be able to inquire about its user property, but could still query the events data triggered by the user.
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
[TDAnalytics userDelete];
```

:::
::: el-tab-pane label=Swift
```swift
TDAnalytics.userDelete()
```

:::
::::
### 3.6 UserAppend
You can call `userAppend` to add user properties of array type.
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
 // list is the value of user property user_list, JSONArray type
[TDAnalytics userAppend:@{@"user_list": @[@"apple", @"ball"]}];
```

:::
::: el-tab-pane label=Swift
```swift
 // list is the value of user property user_list, JSONArray type
TDAnalytics.userAppend(["user_list": ["apple", "ball"]])
```

:::
::::
### 3.7 UserUniqAppend
Since the v2.8.0, you can call `userUniqAppend` to add user properties of array type. You can delete duplicated user property by calling `userUniqAppend` API. If you call `userAppend` API, duplicated user property might not be deleted.
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
// list is the value of user property user_list, JSONArray type
//in this case, the property value of user_list is ["apple"，"ball"]
[TDAnalytics userAppend:@{@"user_list":@[@"apple", @"ball"]}];
//in this case, the property value of user_list is ["apple","apple","ball","cube"]
[TDAnalytics userAppend:@{@"user_list":@[@"apple", @"cube"]}];
//in this case, the property value of user_list is ["apple"，"ball","cube"]
[TDAnalytics userUniqAppend:@{@"user_list":@[@"apple", @"cube"]}];
```

:::
::: el-tab-pane label=Swift
```swift
// list is the value of user property user_list, JSONArray type
//in this case, the property value of user_list is ["apple"，"ball"]
TDAnalytics.userAppend(["user_list": ["apple", "ball"]])
//in this case, the property value of user_list is ["apple","apple","ball","cube"]
TDAnalytics.userAppend(["user_list": ["apple", "cube"]])
//in this case, the property value of user_list is ["apple"，"ball","cube"]
TDAnalytics.userUniqAppend(["user_list": ["apple", "cube"]])
```

:::
::::

## **4. Other**
### **4.1  ****Device ID**
You can call `getDeviceId` to get the device ID:
```objectivec
[TDAnalytics getDeviceId];
```

### **6.2 Default Timezone**
SDK would use the local time as the event time by default. You can also assign a  timezone by setting the default timezone API. In this way, the time of all events could be aligned according to the timezone set by you:
```objectivec
// get TDConfig TDAnalytics
TDConfig *config = [[TDConfig alloc] init];
// set UTC as the default timezone
config.defaultTimeZone = [NSTimeZone timeZoneWithName:@"UTC"];
// initialize SDK
[TDAnalytics startAnalyticsWithConfig:config];
```

<quote-container>
The local timezone information of the device would be lost if a specific timezone is used to align event time. If you need to save the local timezone information of the device, please add relevant properties for the event.
</quote-container>


### **6.3 Time Calibration**
SDK would use local time as the event time by default. If the user modifies the device time manually,  analysis would be affected. At this time, time calibration could be performed to ensure the accuracy of event time. We provide two time calibration methods: `timestamp` and `NTP`.
- You can use the current timestamp got from the server to calibrate the time of SDK. Thereafter, all calling operations not assigned with a specific time would use the calibrated time as the occurrence time, including event data and user property setting.
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
// 1585633785954 is the current unix time stamp, with the unit being millisecond; the corresponding Beijing time is 2020-03-31 13:49:45
[TDAnalytics calibrateTime:1585633785954];
```

:::
::: el-tab-pane label=Swift
```swift
// 1585633785954 is the current unix time stamp, with the unit being millisecond; the corresponding Beijing time is 2020-03-31 13:49:45
TDAnalytics.calibrateTime(1585633785954)
```

:::
::::
- You can also set the address of NTP server, after which SDK would try to get the current time from the uploaded NTP server address and calibrate the SDK time. If you failed to get the current return results within the default timeout interval (3s), local time would be used to track data.
:::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
//use the NTP service of Apple Inc for time calibration 
[TDAnalytics calibrateTimeWithNtp:@"time.apple.com"];
```

:::
::: el-tab-pane label=Swift
```swift
TDAnalytics.calibrateTime(withNtp: "time.apple.com")
```

:::
::::
<quote-container>
- Time calibration may fail due to unstable NTP server. It is suggested that you use a time stamp for time calibration as the priority
- You should select your NTP server address carefully to ensure that the device of the user could get server time rapidly under sound network conditions
</quote-container>

### 6.4 Flush
You can call the `flush` API to report data to TE  immediately .
::: el-tabs
::: el-tab-pane label=Objective-C
```objectivec
[TDAnalytics flush];
```

:::
::: el-tab-pane label=Swift
```swift
TDAnalytics.flush()
```

:::
::::
