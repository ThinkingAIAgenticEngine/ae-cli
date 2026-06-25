---
code: cocos2d-x_sdk_advanced
name: "Cocos2d-x-Advanced"
wikiToken: FQF1wNXmZiaQ42kNmOicojvCnO6
parentWikiToken: D4l8wlZzuifeHUkWUXbcnUuYnM6
updateTime: 1774251979000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=cocos2d-x_sdk_advanced
---

## 1**. Managing User Identity**
SDK instances would use random UUID as the default distinct ID of each user by default, which would be used as the identity identification ID of users under an unlogged-in state. It should be noted that the distinct ID would change after the user reinstalled the App or use the APP with a new device.
### **1.1. Identify**
::: tip
Generally speaking, you do not need to customize a distinct ID. Please ensure that you understand [<text underline="true">User Identification Rules</text>](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc)<text color="purple"> </text>before setting a distinct ID. 
If you need to change the distinct ID, please call the api immediately after SDK is initialized. To avoid the generation of useless accounts, please do not call such a process multiple times.
:::
If your App has its own distinct ID management system for each user, you can call `setDistinctId` to set the distinct ID:
```java
// set distinct ID as Thinker
TDAnalytics::setDistinctId("Thinker");
```

If you need to get the current distinct ID, please call `getDistinctId`:
```java
//Return distinct ID
string distinctId = TDAnalytics::getDistinctId();
```

### **1.2 Login**
When the users  log in, `login` could be called to set the account ID of the user. TE  would use the account ID as the identity identification ID, and the account ID that has been set would be saved before `logout` is called. The previous account ID would be replaced if `login` has been called multiple times.
```java
// The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TE
TDAnalytics::login("TE");
```

<quote-container>
**Login events wouldn't be uploaded in this method.**
</quote-container>

### **1.3 Removing Account ID**
After the user logs out, `logout` could be called to remove the account ID. The distinct ID would be used as the identity identification ID before the next time `login` is called. 
```java
TDAnalytics::logout();
```

It is recommended that you call logout upon explicit logout event. For example, call `logout` when the user commits the behavior of canceling an account; do not call such a process when the App is closed.
<quote-container>
**Logout events wouldn't be uploaded in this method.**
</quote-container>

## **Sending Events**
After SDK is initialized, you can track user behaviour data. In general, ordinary events could meet business requirements. You can also use the first/updatable event based on your own business requirements.
### **2.1 Ordinary Events**
 You can call `track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```cpp
TDJSONObject eventProperties;
eventProperties.setString("product_name", "product name");
TDAnalytics::track("product_buy",eventProperties);
```

###  **2.2 First Events**
The First Events refers to events that would only be recorded once for the ID of a certain device or other dimensions. For example, under certain scenarios, you may want to record the activation event on a certain device. In this case, you can perform data tracking with the first event.
```cpp
TDJSONObject jsonObject;
jsonObject.setString("key","value");
TDFirstEventModel *firstEvent = new TDFirstEventModel("device_activation",jsonObject);
TDAnalytics::track(firstEvent);
```

If you want to judge whether an event is the First Event from other dimensions, you can define a first_check_id for the First Event:
```cpp
//set the user ID as the first_check_id of the first event to track the first initialization event of the user.
TDJSONObject jsonObject;
jsonObject.setString("key","value");
TDFirstEventModel *firstEvent = new TDFirstEventModel("account_activation",jsonObject);
firstEvent->setFirstCheckId("TE");
TDAnalytics::track(firstEvent);
```

<quote-container>
Note: Since the server has to check whether the event is the first event, the first event will be put in storage one hour later by default.
</quote-container>

### **2.3 Updatable Events**
You can meet the requirements for event data modification under specific scenarios through Updatable Events. The ID of Updatable Events should be specified and uploaded when the objects of Updatable Events are created. TE would determine the data to be updated according to the event name and event ID.
```cpp
//The event property status is 3 after reporting, with the price being 100
TDJSONObject jsonObject;
jsonObject.setNumber("status", 3);
jsonObject.setNumber("price", 100);
TDUpdatableEventModel *updatableEvent = new TDUpdatableEventModel("UPDATABLE_EVENT",jsonObject,"test_event_id");
TDAnalytics::track(updatableEvent);

//The event property status is 5 after reporting, with the price remaining the same
TDJSONObject jsonObject_new;
jsonObject_new.setNumber("status", 5);
TDUpdatableEventModel *updatableEvent = new TDUpdatableEventModel("UPDATABLE_EVENT",jsonObject_new,"test_event_id");
TDAnalytics::track(updatableEvent);
```

###  **2.4 Overwritable Events**
Despite the similarity with Updatable Events, Overwritable Events would replace all historical data with the latest data. Looking from the perspective of effect, such a process is equivalent to the behavior of deleting the previous data while putting the latest data in storage. TE would determine the data to be updated according to the event name and event ID.
```cpp
// Instance: Assume the event name is OVERWRITE_EVENT when reporting an overwritable event
//The event property status is 3 after reporting, with the price being 100 TDJSONObject jsonObject;
jsonObject.setNumber("status", 3);
jsonObject.setNumber("price", 100);
TDOverwritableEventModel *overWritableEvent = new TDOverwritableEventModel("OVERWRITABLE_EVENT",jsonObject,"test_event_id");
TDAnalytics::track(overWritableEvent);

//The event property status is 5 after reporting, with the price deleted
TDJSONObject jsonObject_new;
jsonObject_new.setNumber("status", 5);
TDOverwritableEventModel overWritableEvent_new =  new TDOverwritableEventModel("OVERWRITABLE_EVENT",jsonObject_new,"test_event_id");
TDAnalytics::track(overWritableEvent_new);
```

### **2.5 Super Properties**
Super Properties refer to properties that would be uploaded by each event. Super Properties  could be divided into `static super properties` and `dynamic super properties`based on the update frequency. You can select different methods for super property setting according to business requirements; we recommend that you set Super Properties  first before sending events. In the same event, when the keys of Super Properties , self-defined event properties, and preset properties are the same, we would assign value according to the following priority:  `self-defined properties>dynamic super properties>static super properties>preset properties`.
#### **2.5.1 Static Super Properties**
Static Super Properties  are properties that all events might have and would change with a low frequency, for example, the user membership class. After setting Static Super Properties  through `setSuperProperties`, SDK would use the preset Super Properties  as the event properties when tracking events.
```cpp
 TDJSONObject superProperties;
 userProperties.setNumber("level",2);
 TDAnalytics::setSuperProperties(superProperties);
```

Static Super Properties would be saved in local storage, and should not be called every time the App is closed. If such properties already exist, the reset properties would replace the original properties. If such properties do not exist, properties would be newly created. In addition to property setting, we also provide other APIs to set and manage Static Super Properties and meet general business requirements.
```cpp
//clear a certain super property
TDAnalytics::unsetSuperProperty("CHANNEL");
//clear all certain super properties
TDAnalytics::clearSuperProperties();
//get all certain super properties
TDAnalytics::getSuperProperties();
```

#### **2.5.2 Dynamic Super Properties**
Dynamic Super Properties  that all events might have and would change with a high frequency, for example, the quantity of the gold coins the user possesses. After setting Dynamic Super Properties through `setDynamicSuperPropertiesTracker`, SDK would get the properties in event tracking automatically, and add such properties to the event triggered.
```cpp
//frequency update of gold coin quantity 
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

### **2.6 Timing Events**
If you need to record the duration of a certain event, you can call `timeEvent` . Configure the name of the event you want to record. When you upload the event, `#duration` would be added to your event property automatically to record the duration of the event (Unit: second). It should be noted that only one task can be timed with the same event name.
```cpp
//The following instance has recorded the time the user spent on a certain product page
//The user enters the product page and starts the timing
TDAnalytics::timeEvent("stay_shop");
// do some thing...
//the timing would end when the user leaves the product page. "stay_shop" event would carry#duration, a property representing event duration. 
TDAnalytics::track("stay_shop");
```

## **3. User Properties**
User property setting APIs supported by TE  include: `userSet`, `userSetOnce`, `userAdd`, `userUnset`, `userDelete`, `userAppend`, `userUniqAppend`.
### 3.1 UserSet
You can call `userSet` to set general user properties. The original properties would be replaced if the properties uploaded via the API are used. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here:
```cpp
//the username now is TA
TDJSONObject properties;
properties.setString("username", "TA");
TDAnalytics::userSet(properties);
//the userName now is TE
TDJSONObject newProperties;
newProperties.setString("username", "TE");
TDAnalytics::userSet(newProperties);
```

###  3.2 UserSetOnce
If the user property you want to upload only needs to be set once, you can call `userSetOnce` to set the property. If such property had been set before, this message would be ignored. Let's take the setting of the first payment time as an example:
```cpp
//first_payment_time is 2018-01-01 01:23:45.678
TDJSONObject userProperties;
userProperties.setString("first_payment_time","2018-01-01 01:23:45.678");
TDAnalytics::userSetOnce(userProperties);

//first_payment_time is still 2018-01-01 01:23:45.678
TDJSONObject newUserProperties;
newUserProperties.setString("first_payment_time","2018-12-31 01:23:45.678");
TDAnalytics::userSetOnce(newUserProperties);
```

### 3.3 UserAdd
When you want to upload numeric attributes for cumulative operation, you can call `userAdd`.
If the property has not been set, it would be given a value of 0 before computing. A negative value could be uploaded, which is equivalent to subtraction operation. Let's take the accumulative payment amount as an example:
```cpp
//in this case, the total_revenue is 30
TDJSONObject userProperties;
userProperties.setNumber("total_revenue",30);
TDAnalytics::userAdd(userProperties);

//in this case, the total_revenue is 678
TDJSONObject newUserProperties;
newUserProperties.setNumber("total_revenue",648);
TDAnalytics::userAdd(newUserProperties);
```

<quote-container>
The set attribute key is a string, and the Value is only allowed to be a numeric value.
</quote-container>

### 3.4 UserUnset
When you need to clear the user properties of users, you can call `userUnset` to clear specific properties.  `userUnset` would not create properties that have not been created in the cluster.
```cpp
TDAnalytics::userUnset("coin");
```

### 3.5 UserDelete
You can call `userDelete` to delete a user. After deleting the user, you would no longer be able to inquire about its user property, but could still query the events data triggered by the user.
```cpp
TDAnalytics::userDelete();
```

 3.6 UserAppend
You can call `userAppend` to add user properties of array type.
```cpp
TDJSONObject userProperties;
vector<string> listValue;
listValue.push_back("apple");
listValue.push_back("ball");
userProperties.setList("user_list",listValue);
TDAnalytics::userAppend(userProperties);
```

### 3.7 UserUniqAppend
Since the v2.8.0, you can call `userUniqAppend` to add user properties of array type. You can delete duplicated user property by calling `userUniqAppend` interface. If you call `userAppend` API, duplicated user property will be merged.
```cpp
// list is the value of user property user_list, JSONArray type
//in this case, the property value of user_list is ["apple"，"ball"]
TDJSONObject properties;
vector<string> dataArray;
dataArray.push_back("apple");
dataArray.push_back("ball");
properties.setList("user_list",dataArray);
TDAnalytics::userAppend(properties);

//in this case, the property value of user_list is ["apple","apple","ball","cube"]
TDJSONObject properties1;
vector<string> dataArray1;
dataArray1.push_back("apple");
dataArray1.push_back("cube");
properties1.setList("user_list",dataArray1);
TDAnalytics::userAppend(properties1);

 //in this case, the property value of user_list is ["apple"，"ball","cube"]
TDAnalytics::userUniqAppend(properties1);
```

## **4. Other**
### **4.1  ****Device ID**
You can call `getDeviceId` to get the device ID:
```cpp
TDAnalytics::getDeviceId();

// TDAnalytics::setDistinctId(TDAnalytics::getDeviceId());
```

### **4.2 Time Calibration**
SDK would use local time as the event time by default. If the user modifies the device time manually,  analysis would be affected. At this time, time calibration could be performed to ensure the accuracy of event time. We provide two time calibration methods: `timestamp` and `NTP`.
- You can use the current timestamp got from the server to calibrate the time of SDK. Thereafter, all calling operations not assigned with a specific time would use the calibrated time as the occurrence time, including event data and user property setting.
```java
// 1585633785954 is the current unix time stamp, with the unit being millisecond; the corresponding Beijing time is 2020-03-31 13:49:45
TDAnalytics::calibrateTime(1585633785954);
```

- You can also set the address of NTP server, after which SDK would try to get the current time from the uploaded NTP server address and calibrate the SDK time. If you failed to get the current return results within the default timeout interval (3s), local time would be used to track data.
```java
//use the NTP service of Apple Inc for time calibration 
TDAnalytics::calibrateTimeWithNtp("time.apple.com");
```

<quote-container>
1. Time calibration may fail due to unstable NTP server. It is suggested that you use a time stamp for time calibration as the priority
2. You should select your NTP server address carefully to ensure that the device of the user could get server time rapidly under sound network conditions
</quote-container>

### 4.3 Flush
You can call the `flush` API to report data to TE  immediately .
```javascript
TDAnalytics::flush();
```


### **4.4 Encryption**
Since v1.3.2 , Supports data encryption using AES+RSA. The data encryption function requires the cooperation of the client and the server. For specific usage methods, please consult customer success manager.
```cpp
TDConfig config1(APPID,SERVER_URL);
config1.setEnableEncrypt(true);
config1.setSecretKey(TDSecretKey(_version, _secretKey));
TDAnalytics::init(config1);
```
