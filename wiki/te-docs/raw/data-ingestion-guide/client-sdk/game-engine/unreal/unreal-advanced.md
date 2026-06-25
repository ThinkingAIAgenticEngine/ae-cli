---
code: unreal_sdk_advanced
name: "Unreal-Advanced"
wikiToken: T3M0w3OWGi4LYjk1XYQcUCbCnff
parentWikiToken: Tjh7wx7FYinevfkG0mwcLxsSnea
updateTime: 1774251975000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=unreal_sdk_advanced
---
## 1**. Managing User Identity**
SDK instances would use random UUID as the default distinct ID of each user by default, which would be used as the identity identification ID of users under an unlogged-in state. It should be noted that the distinct ID would change after the user reinstalled the App or use the APP with a new device.
### **1.1. Identify**
::: tip
Generally speaking, you do not need to customize a distinct ID. Please ensure that you understand [<text underline="true">User Identification Rules</text>](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc)<text color="purple" underline="true"> </text>before setting a distinct ID. 
If you need to change the distinct ID, please call the api immediately after SDK is initialized. To avoid the generation of useless accounts, please do not call such a process multiple times.
:::
If your App has its own distinct ID management system for each user, you can call `SetDistinctId` to set the distinct ID:
```cpp
// set distinct ID as Thinker
UTDAnalytics::SetDistinctId("Thinker");
```

If you need to obtain the current distinct ID, please call `GetDistinctId`:
```cpp
FString distinctId = UTDAnalytics::GetDistinctId();
```

### **1.2 Login**
When the users  log in, `Login` could be called to set the account ID of the user. TE  would use the account ID as the identity identification ID, and the account ID that has been set would be saved before `Logout` is called. The previous account ID would be replaced if `Login` has been called multiple times.
```cpp
// The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TE
UTDAnalytics::Login("TE");
```

<quote-container>
**Login events wouldn't be uploaded in this method.**
</quote-container>

### **1.3 Removing Account ID**
After the user logs out, `Logout` could be called to remove the account ID. The distinct ID would be used as the identity identification ID before the next time `Login` is called. 
```java
UTDAnalytics::Logout();
```

It is recommended that you call logout upon explicit logout event. For example, call `Logout` when the user commits the behavior of canceling an account; do not call such a process when the App is closed.
<quote-container>
**Logout events wouldn't be uploaded in this method.**
</quote-container>

## **Sending Events**
After SDK is initialized, you can track user behaviour data. In general, ordinary events could meet business requirements. You can also use the First/Updatable event based on your own business requirements.
### **2.1 Ordinary Events**
 You can call `Track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```cpp
TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
Properties->SetStringField("product_name", "product name");
UTDAnalytics::Track("product_buy",Properties);
```

###  **2.2 First Events**
The First Events refers to events that would only be recorded once for the ID of a certain device or other dimensions. For example, under certain scenarios, you may want to record the activation event on a certain device. In this case, you can perform data tracking with the first event.
```cpp
TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
Properties->SetStringField("key", "value");
UTDAnalytics::TrackFirst("device_activation",Properties);
```

If you want to judge whether an event is the First Event from other dimensions, you can define a first_check_id for the First Event:
```cpp
TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
Properties->SetStringField("key", "value");
UTDAnalytics::TrackFirstWithId("account_activation", Properties,"TE");
```

<quote-container>
Note: Since the server has to check whether the event is the first event, the first event will be put in storage one hour later by default.
</quote-container>

### **2.3 Updatable Events**
You can meet the requirements for event data modification under specific scenarios through Updatable Events. The ID of Updatable Events should be specified and uploaded when the objects of Updatable Events are created. TE would determine the data to be updated according to the event name and event ID.
```cpp
 //The event property status is 3 after reporting, with the price being 100 TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
Properties->SetNumberField("status",3);
Properties->SetNumberField("price",100);
UTDAnalytics::TrackUpdate("UPDATABLE_EVENT", Properties,"test_event_id");

//The event property status is 5 after reporting, with the price remaining the same
TSharedPtr<FJsonObject> NewProperties = MakeShareable(new FJsonObject);
NewProperties->SetNumberField("status",5);
UTDAnalytics::TrackUpdate("UPDATABLE_EVENT",NewProperties,"test_event_id");
```

### **2.4 Overwritable Events**
Despite the similarity with Updatable Events, Overwritable Events would replace all historical data with the latest data. Looking from the perspective of effect, such a process is equivalent to the behavior of deleting the previous data while putting the latest data in storage. TE would determine the data to be updated according to the event name and event ID.
```cpp
 //The event property status is 3 after reporting, with the price being 100 TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject); TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
Properties->SetNumberField("status",3);
Properties->SetNumberField("price",100);
UTDAnalytics::TrackOverwrite("OVERWRITE_EVENT", Properties,"test_event_id");

//The event property status is 5 after reporting, with the price remaining the same
TSharedPtr<FJsonObject> NewProperties = MakeShareable(new FJsonObject);
NewProperties->SetNumberField("status",5);
UTDAnalytics::TrackOverwrite("OVERWRITE_EVENT",NewProperties,"test_event_id")
```

### **2.5 Super Properties**
Super Properties refer to properties that would be uploaded by each event. Super Properties could be divided into `static super properties` and `dynamic super properties`based on the update frequency. You can select different methods for super property setting according to business requirements; we recommend that you set Super Properties first before sending events. In the same event, when the keys of Super Properties, self-defined event properties, and preset properties are the same, we would assign value according to the following priority:  `self-defined properties>dynamic super properties>static super properties>preset properties`.
#### **2.5.1 Static Super Properties**
Static Super Properties are properties that all events might have and would change with a low frequency, for example, the user membership class. After setting static Super Properties through `SetSuperProperties`, SDK would use the preset Super Properties as the event properties when tracking events.
```cpp
TSharedPtr<FJsonObject> SuperProperties = MakeShareable(new FJsonObject);
SuperProperties->SetNumberField("vip_level",2);
UTDAnalytics::SetSuperProperties(SuperProperties);
```

Static Super Properties would be saved in local storage, and should not be called every time the App is closed. If such properties already exist, the reset properties would replace the original properties. If such properties do not exist, properties would be newly created. In addition to property setting, we also provide other APIs to set and manage Static Super Properties and meet general business requirements.
```cpp
//get all certain super properties
TSharedPtr<FJsonObject> SuperProperties = UTDAnalytics::GetSuperProperties();
```

#### **2.5.2 Dynamic Super Properties**
Dynamic Super Properties that all events might have and would change with a high frequency, for example, the quantity of the gold coins the user possesses. After setting dynamic Super Properties

 through `SetDynamicSuperPropertiesTracker`, SDK would obtain the properties in event tracking automatically, and add such properties to the event triggered.
```cpp
static FString TDReturnDyldParams() {
    return "{\"dyld_property1\":\"value1\",\"dyld_property2\":\"value2\"}";
}
void UMyDemoWidget::callSetDynamicSuperPropertiesFunction(){
    // since V1.5.0
    UTDAnalytics::dynamicPropertiesMap.insert(pair<FString,FString(*)(void)>("inset your appid" ,&TDReturnDyldParams));
    // since V1.5.0
    UTDAnalytics::SetDynamicSuperProperties(this, &UMyDemoWidget::TDReturnDyldParams, "your appid");
}
```

### **2.6 Timing Events**
If you need to record the duration of a certain event, you can call `TimeEvent` . Configure the name of the event you want to record. When you upload the event, `#duration` would be added to your event property automatically to record the duration of the event (Unit: second). It should be noted that only one task can be timed with the same event name.
```cpp
//The following instance has recorded the time the user spent on a certain product page
UTDAnalytics::TimeEvent("stay_shop");
 /**do someting
    .......
 **/
//the timing would end when the user leaves the product page. "stay_shop" event would carry#duration, a property representing event duration. 
UTDAnalytics::Track("stay_shop", "");
```


<quote-container>
Note: Windows/MacOS does not currently support recording event duration.
</quote-container>

## **3. User Properties**
User property setting APIs supported by TE  include: `UserSet，UserSetOnce`,`UserAdd`,`UserUnset`,`UserDelete`,`UserAppend`,`UserUniqAppend`.
### 3.1 UserSet
You can call `UserSet` to set general user properties. The original properties would be replaced if the properties uploaded via the API are used. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here:
```cpp
//the username now is TA
TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
Properties->SetStringField("user_name", "TA");
UTDAnalytics::UserSet(Properties);
//the username now is TE
TSharedPtr<FJsonObject> NewProperties = MakeShareable(new FJsonObject);
NewProperties->SetStringField("user_name", "TE");
UTDAnalytics::UserSet(NewProperties);
```

### 3.2 UserSetOnce
If the user property you want to upload only needs to be set once, you can call `UserSetOnce` to set the property. If such property had been set before, this message would be ignored. Let's take the setting of the first payment time as an example:
```cpp
//first_payment_time is 2018-01-01 01:23:45.678
TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
Properties->SetStringField("first_payment_time","2018-01-01 01:23:45.678");
UTDAnalytics::UserSetOnce(Properties);
//first_payment_time is still 2018-01-01 01:23:45.678
TSharedPtr<FJsonObject> NewProperties = MakeShareable(new FJsonObject);
NewProperties->SetStringField("first_payment_time","2018-12-31 01:23:45.678");
UTDAnalytics::UserSetOnce(NewProperties);
```

### 3.3 UserAdd
When you want to upload numeric attributes for cumulative operation, you can call `UserAdd`.
If the property has not been set, it would be given a value of 0 before computing. A negative value could be uploaded, which is equivalent to subtraction operation. Let's take the accumulative payment amount as an example:
```cpp
//in this case, the total_revenue is 30
TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
Properties->SetNumberField("total_revenue",30);
UTDAnalytics::UserAdd(Properties);
//in this case, the total_revenue is 678
TSharedPtr<FJsonObject> NewProperties = MakeShareable(new FJsonObject);
NewProperties->SetNumberField("total_revenue",648);
UTDAnalytics::UserAdd(NewProperties);
```

<quote-container>
The set attribute key is a string, and the Value is only allowed to be a numeric value.
</quote-container>

### 3.4 UserDelete
You can call `UserDelete` to delete a user. After deleting the user, you would no longer be able to inquire about its user property, but could still query the events data triggered by the user.
```cpp
UTDAnalytics::UserDelete();
```

###  3.5 UserUnset
When you need to clear the user properties of users, you can call `UserUnset` to clear specific properties.  `UserUnset` would not create properties that have not been created in the cluster.
```cpp
UTDAnalytics::UserUnset("userPropertyName");
```

### 3.6 UserAppend
You can call `UserAppend` to add user properties of array type.
```cpp
TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
TArray< TSharedPtr<FJsonValue> > DataArray;
DataArray.Add(MakeShareable(new FJsonValueString("apple")));
DataArray.Add(MakeShareable(new FJsonValueString("ball")));
Properties->SetArrayField("user_list", DataArray);
UTDAnalytics::UserAppend(Properties);
```

### 3.7 UserUniqAppend
You can call `UserUniqueAppend` to add user properties of array type. You can delete duplicated user property by calling `UserUniqueAppend` interface. If you call `UserAppend` API, duplicated user property will be merged.
```cpp
// list is the value of user property user_list, JSONArray type
//in this case, the property value of user_list is ["apple"，"ball"]
TSharedPtr<FJsonObject> Properties = MakeShareable(new FJsonObject);
TArray< TSharedPtr<FJsonValue> > DataArray;
DataArray.Add(MakeShareable(new FJsonValueString("apple")));
DataArray.Add(MakeShareable(new FJsonValueString("ball")));
Properties->SetArrayField("user_list", DataArray);
UTDAnalytics::UserAppend(Properties);

//in this case, the property value of user_list is ["apple","apple","ball","cube"]
TSharedPtr<FJsonObject> Properties1 = MakeShareable(new FJsonObject);
TArray< TSharedPtr<FJsonValue> > DataArray1;
DataArray1.Add(MakeShareable(new FJsonValueString("apple")));
DataArray1.Add(MakeShareable(new FJsonValueString("cube")));
Properties->SetArrayField("user_list", DataArray1);
UTDAnalytics::UserAppend(Properties1);

//in this case, the property value of user_list is ["apple"，"ball","cube"]
UTDAnalytics::UserUniqueAppend(Properties1);
```

## **4. Other**
### **4.1  ****Device ID**
You can call `GetDeviceId` to obtain the device ID:
```cpp
FString deviceId = UTDAnalytics::GetDeviceId();
```

### **4.2 Time Calibration**
SDK would use local time as the event time by default. If the user modifies the device time manually,  analysis would be affected. At this time, time calibration could be performed to ensure the accuracy of event time. We provide two time calibration methods: `timestamp` and `NTP` .
- You can use the current timestamp obtained from the server to calibrate the time of SDK. Thereafter, all calling operations not assigned with a specific time would use the calibrated time as the occurrence time, including event data and user property setting.
```java
// 1585633785954 is the current unix time stamp, with the unit being millisecond; the corresponding Beijing time is 2020-03-31 13:49:45
UTDAnalytics::CalibrateTime(1585633785954);
```

- You can also set the address of NTP server, after which SDK would try to obtain the current time from the uploaded NTP server address and calibrate the SDK time. If you failed to obtain the current return results within the default timeout interval (3s), local time would be used to track data.
```java
//use the NTP service of Apple Inc for time calibration 
UTDAnalytics::CalibrateTimeWithNtp("time.apple.com");
```

<quote-container>
1. Time calibration may fail due to unstable NTP server. It is suggested that you use a time stamp for time calibration as the priority
2. You should select your NTP server address carefully to ensure that the device of the user could obtain server time rapidly under sound network conditions
</quote-container>

### 4.3 Flush
You can call the `Flush` API to report data to TE  immediately .
```javascript
UTDAnalytics::Flush();
```
