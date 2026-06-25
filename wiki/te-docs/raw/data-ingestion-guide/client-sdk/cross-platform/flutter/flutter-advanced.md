---
code: flutter_sdk_advanced
name: "Flutter-Advanced"
wikiToken: HGZfwfrFmidWBVkBtKzclpHEnSe
parentWikiToken: OzW1wBUwbiX7D5k8ZaSc6Uy0ndh
updateTime: 1774251995000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=flutter_sdk_advanced
---

## 1**. Managing User Identity**
SDK instances would use random UUID as the default distinct ID of each user by default, which would be used as the identity identification ID of users under an unlogged-in state. It should be noted that the distinct ID would change after the user reinstalled the App or use the APP with a new device.
### **1.1. Identify**
::: tip
Generally speaking, you do not need to customize a distinct ID. Please ensure that you understand [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc)<text color="purple"> </text>before setting a distinct ID. 
If you need to change the distinct ID, please call the API immediately after SDK is initialized. To avoid the generation of useless accounts, please do not call such a process multiple times.
:::
If your App has its own distinct ID management system for each user, you can call `setDistinctId` to set the distinct ID:
```dart
//set distinct ID as Thinker
TDAnalytics.setDistinctId("Thinker");
```

If you need to obtain the current distinct ID, please call `getDistinctId`:
```java
//return distinct ID
String distinctId = await TDAnalytics.getDistinctId();
```

### **1.2 Login**
When the users  log in, `login` could be called to set the account ID of the user. TE  would use the account ID as the identity identification ID, and the account ID that has been set would be saved before `logout` is called. The previous account ID would be replaced if `login` has been called multiple times.
```java
// The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TE
TDAnalytics.login("TA");
```

<quote-container>
**Login events wouldn't be uploaded in this method.**
</quote-container>

### **1.3 Removing Account ID**
After the user logs out, `logout` could be called to remove the account ID. The distinct ID would be used as the identity identification ID before the next time `login` is called. 
```java
TDAnalytics.logout();
```

It is recommended that you call logout upon explicit logout event. For example, call `logout` when the user commits the behavior of canceling an account; do not call such a process when the App is closed.
<quote-container>
**Logout events wouldn't be uploaded in this method.**
</quote-container>

## **Sending Events**
After SDK is initialized, you can track user behaviour data. In general, ordinary events could meet business requirements. You can also use the First/Updatable Event based on your own service scenario.
### **2.1 Ordinary Events**
 You can call `track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```dart
TDAnalytics.track('pruoduct_buy', properties: <String, dynamic>{'product_name': 'product_name'});
```

### **2.2 First Events**
The First Events refers to events that would only be recorded once for the ID of a certain device or other dimensions. For example, under certain scenarios, you may want to record the activation event on a certain device. In this case, you can perform data tracking with the first event.
```dart
var properties = {'key': 'value'};
TDFirstEventModel firstModel =TDFirstEventModel('device_activation','', properties);
TDAnalytics.trackEventModel(firstModel);
```

If you want to judge whether an event is the first event from other dimensions, you can define a first_check_id for the First Event:
```dart
//set the user ID as the first_check_id of the first event to track the first initialization event of the user.
var properties = {'key': 'value'};
TDFirstEventModel firstModel =TDFirstEventModel('device_activation','TA', properties);
TDAnalytics.trackEventModel(firstModel);
```

<quote-container>
Note: Since the server has to check whether the event is the first event, the first event will be put in storage one hour later by default.
</quote-container>

### **2.3 Updatable Events**
You can meet the requirements for event data modification under specific scenarios through updatable events. The ID of updatable events should be specified and uploaded when the objects of updatable events are created. TE would determine the data to be updated according to the event name and event ID.
```c
//The event property status is 3 after reporting, with the price being 100
var properties = {
  'status': 3,
  'price': 100
};
TDUpdatableEventModel updateModel = TDUpdatableEventModel('UPDATABLE_EVENT', 'test_event_id', properties);
TDAnalytics.trackEventModel(updateModel);

//The event property status is 5 after reporting, with the price remaining the same
var properties_new = {
  'status': 5
};
var updateModel_new = TDUpdatableEventModel('UPDATABLE_EVENT', 'test_event_id', properties_new);
TDAnalytics.trackEventModel(updateModel_new);
```

### **2.4 Overwritable Event****s**
Despite the similarity with updatable events, overwritable events would replace all historical data with the latest data. Looking from the perspective of effect, such a process is equivalent to the behavior of deleting the previous data while putting the latest data in storage. TE would determine the data to be updated according to the event name and event ID.
```c
// The event property status is 3 after reporting, with the price being 100
var properties = {
    'status': 3,
    'price': 100
};
var overwriteModel = TDOverWritableEventModel('OVERWRITABLE_EVENT', 'test_event_id', properties);
TDAnalytics.trackEventModel(overwriteModel);

// The event property status is 5 after reporting, with the price deleted
var properties_new = {
    'status': 5
};
var overwriteModel_new = TDOverWritableEventModel('OVERWRITABLE_EVENT', 'test_event_id', properties_new);
TDAnalytics.trackEventModel(overwriteModel_new);
```

### **2.5 Super Properties**
Super Properties refer to properties that would be uploaded by each event. Super Properties could be divided into `static super properties` and `dynamic super properties`based on the update frequency. You can select different methods for super property setting according to business requirements; we recommend that you set Super Properties first before sending events. In the same event, when the keys of Super Properties, self-defined event properties, and preset properties are the same, we would assign value according to the following priority:  `self-defined properties>dynamic super properties>static super properties>preset properties`.
#### **2.5.1 Static Super Properties**
Static Super Properties are properties that all events might have and would change with a low frequency, for example, the user membership class. After setting static super properties through `setSuperProperties`, SDK would use the preset super properties as the event properties when tracking events.
```dart
Map<String, dynamic> superProperties = {
  'vip_level': 2
};
TDAnalytics.setSuperProperties(superProperties);
```

Static Super Properties would be saved in local storage, and should not be called every time the App is closed. If such properties already exist, the reset properties would replace the original properties. If such properties do not exist, properties would be newly created. In addition to property setting, we also provide other APIs to set and manage static super properties and meet general business requirements.
```dart
//clear a certain super property
TDAnalytics.unsetSuperProperty('SUPER_LIST');
//clear all certain super properties
TDAnalytics.clearSuperProperties();
//obtain all certain super properties
await TDAnalytics.getSuperProperties();
```

#### **2.5.2 Dynamic S****uper Properties**
Dynamic Super Properties that all events might have and would change with a high frequency, for example, the quantity of the gold coins the user possesses. After setting Dynamic Super Properties through `setDynamicSuperProperties`, SDK would get the properties in `getDynamicSuperProperties` during event tracking automatically, and add such properties to the event triggered.
```dart
TDAnalytics.setDynamicSuperProperties((){
  return <String, dynamic> {
    'DYNAMIC_DATE': DateTime.now().toUtc(),
  };
});
```

### **2.6 Timing Events**
If you need to record the duration of a certain event, you can call `timeEvent` . Configure the name of the event you want to record. When you upload the event, `#duration` would be added to your event property automatically to record the duration of the event (Unit: second). It should be noted that only one task can be timed with the same event name.
```dart
//The following instance has recorded the time the user spent on a certain product page
//The user enters the product page and starts the timing
TDAnalytics.timeEvent('stay_shop');
// do some thing...
//the timing would end when the user leaves the product page. "stay_shop" event would carry#duration, a property representing event duration. 
TDAnalytics.track("stay_shop");
```

## **3. User Properties**
User property setting APIs supported by TE  include: `userSet`,`userSetOnce`,`userAdd`,`userUnset`,`userDelete`,`userAppend`,`userUniqAppend`
### 3.1 userSet
You can call `userSet` to set general user properties. The original properties would be replaced if the properties uploaded via the API are used. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here:
```dart
TDAnalytics.userSet(<String, dynamic>{'user_name': 'TA'});  //the username now is TA
TDAnalytics.userSet(<String, dynamic>{'user_name': 'TE'});  //the username now is TE
```

### 3.2 userSetOnce
If the user property you want to upload only needs to be set once, you can call `userSetOnce` to set the property. If such property had been set before, this message would be neglected. Let's take the setting of the first payment time as an example:
```dart
//first_payment_time is 2018-01-01 01:23:45.678
TDAnalytics.userSetOnce(<String, dynamic>{'first_payment_time': '2018-01-01 01:23:45.678'});
//first_payment_time is still 2018-01-01 01:23:45.678
TDAnalytics.userSetOnce(<String, dynamic>{'first_payment_time': '2018-12-31 01:23:45.678'});
```

### 3.3 userAdd
When you want to upload numeric attributes for cumulative operation, you can call `userAdd`.
If the property has not been set, it would be given a value of 0 before computing. A negative value could be uploaded, which is equivalent to subtraction operation. Let's take the accumulative payment amount as an example:
```dart
//in this case, the total_revenue is 30
TDAnalytics.userAdd(<String, num>{ 'total_revenue': 30});
//in this case, the total_revenue is 678
TDAnalytics.userAdd(<String, num>{ 'total_revenue': 648});
```

### 3.4 UserUnset
When you need to clear the user properties of users, you can call `userUnset` to clear specific properties.  `userUnset` would not create properties that have not been created in the cluster.
```dart
TDAnalytics.userUnset('USER_INT');
```

### 3.5 UserDelete
You can call `userDelete` to delete a user. After deleting the user, you would no longer be able to inquire about its user property, but could still obtain the events data triggered by the user.
```dart
TDAnalytics.userDelete();
```

### 3.6 UserAppend
You can call `userAppend` to add user properties of array type.
```dart
TDAnalytics.userAppend(<String, List>{
  'USER_LIST': ['apple','ball'],
});
```

### 3.7 UserUniqAppend
You can call `userUniqAppend` to add user properties of array type. You can delete duplicated user property by calling `userUniqAppend` API. If you call `userAppend` API, duplicated user property might not be deleted.
```dart
//in this case, the property value of user_list is ["apple"，"ball"]
TDAnalytics.userAppend(<String, List>{ 'user_list': ['apple','ball']});
//in this case, the property value of user_list is ["apple","apple","ball","cube"]
TDAnalytics.userAppend(<String, List>{ 'user_list': ['apple','cube']});
//in this case, the property value of user_list is ["apple"，"ball","cube"]
TDAnalytics.useUniqrAppend(<String, List>{ 'user_list': ['apple','cube']});
```

## **4. Encryption**
The SDK supports data encryption using AES+RSA. The data encryption function requires the cooperation of the client and the server. For specific usage methods, please consult customer success manager.
```dart
TDConfig config = TDConfig();
config.appId = "APP_ID";
config.serverUrl = "SERVER_URL";
//Configure key information such as version number and public key
config.enableEncrypt(1,"publicKey");
TDAnalytics.initWithConfig(config);
```

## **5. Other**
### **5.1  ****Device ID**
You can call `getDeviceId` to get the device ID:
```dart
String deviceId = await TDAnalytics.getDeviceId();
```

### **5.2 Default Timezone**
SDK would use the local time as the event time by default. You can also assign a  timezone by setting the default timezone API. In this way, the time of all events could be aligned according to the timezone set by you:
```java
TDConfig config = TDConfig();
config.appId = "appId";
config.serverUrl = "serverUrl";
config.timeZone = "UTC";
TDAnalytics.initWithConfig(config);
```

<quote-container>
The local timezone information of the device would be lost if a specific timezone is used to align event time. If you need to save the local timezone information of the device, please add relevant properties for the event.
</quote-container>

### **5.3 Time Calibration**
SDK would use local time as the event time by default. If the user modifies the device time manually,  analysis would be affected. At this time, time calibration could be performed to ensure the accuracy of event time. We provide two time calibration methods: `timestamp` and `NTP.`
- You can use the current timestamp obtained from the server to calibrate the time of SDK. Thereafter, all calling operations not assigned with a specific time would use the calibrated time as the occurrence time, including event data and user property setting.
```java
// 1585633785954 is the current unix time stamp, with the unit being millisecond; the corresponding Beijing time is 2020-03-31 13:49:45
TDAnalytics.calibrateTime(1585633785954);
```

- You can also set the address of NTP server, after which SDK would try to obtain the current time from the uploaded NTP server address and calibrate the SDK time. If you failed to obtain the current return results within the default timeout interval (3s), local time would be used to track data.
```java
// use the NTP service of Apple Inc for time calibration 
TDAnalytics.calibrateTimeWithNtp("time.apple.com");
```

<quote-container>
1. Time calibration may fail due to unstable NTP server. It is suggested that you use a time stamp for time calibration as the priority
2. You should select your NTP server address carefully to ensure that the device of the user could obtain server time rapidly under sound network conditions
</quote-container>
