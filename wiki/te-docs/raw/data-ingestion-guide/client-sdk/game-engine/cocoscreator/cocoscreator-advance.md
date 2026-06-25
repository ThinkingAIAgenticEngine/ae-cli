---
code: cocoscreator_sdk_advanced
name: "CocosCreator-Advance"
wikiToken: DHMrw6JkgiGcwxkzyPKc55VJn0c
parentWikiToken: AL6VwEXmiiAgK7kXq97c8YXNnLc
updateTime: 1774251982000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=cocoscreator_sdk_advanced
---

## 1**. Managing User Identity**
SDK instances would use random UUID as the default distinct ID of each user by default, which would be used as the identity identification ID of users under an unlogged-in state. It should be noted that the distinct ID would change after the user reinstalled the App or use the APP with a new device.
### **1.1. Identify**
::: tip
Generally speaking, you do not need to customize a distinct ID. Please ensure that you understand [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc)<text color="purple"> </text>before setting a distinct ID. 
If you need to change the distinct ID, please call the api immediately after SDK is initialized. To avoid the generation of useless accounts, please do not call such a process multiple times.
:::
If your App has its own distinct ID management system for each user, you can call `setDistinctId` to set the distinct ID:
```java
// set distinct ID as Thinker
TDAnalytics.setDistinctId("Thinker");
```

If you need to get the current distinct ID, please call `getDistinctId`:
```java
//返回访客ID
let distinctId = TDAnalytics.getDistinctId();
```

### **1.2 Login**
When the users  log in, `login` could be called to set the account ID of the user. TE  would use the account ID as the identity identification ID, and the account ID that has been set would be saved before `logout` is called. The previous account ID would be replaced if `login` has been called multiple times.
```javascript
// The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TE
TDAnalytics.login("TE");
```

<quote-container>
Note: Login events wouldn't be uploaded in this method.
</quote-container>

### **1.3 Removing Account ID**
After the user logs out, `logout` could be called to remove the account ID. The distinct ID would be used as the identity identification ID before the next time `login` is called. 
```javascript
TDAnalytics.logout();
```

It is recommended that you call logout upon explicit logout event. For example, call `logout` when the user commits the behavior of canceling an account; do not call such a process when the App is closed.
<quote-container>
Note: Logout events wouldn't be uploaded in this method.
</quote-container>

## **2.** **Sending Events**
After SDK is initialized, you can track user behaviour data. In general, ordinary events could meet business requirements. You can also use the First/Updatable Event based on your own business requirements.
### **2.1 Ordinary Events**
 You can call `track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```javascript
TDAnalytics.track({
    eventName: "product_buy", // event name
    properties: { product_name: "product name" } // properties
});
```

### **2.2 First Events**
The First Events refers to events that would only be recorded once for the ID of a certain device or other dimensions. For example, under certain scenarios, you may want to record the activation event on a certain device. In this case, you can perform data tracking with the First Event.
```javascript
TDAnalytics.trackFirst({
    eventName: "device_activation",
    properties: { key: "value" }
});
```

If you want to judge whether an event is the First Event from other dimensions, you can define a first_check_id for the First Event:
```javascript
//set the user ID as the first_check_id of the first event to track the first initialization event of the user.
TDAnalytics.trackFirst({
    eventName: "account_activation",
    firstCheckId: "TE",
    properties: { key: "value" }
});
```

<quote-container>
Note: Since the server has to check whether the event is the First Event, the First Event will be put in storage one hour later by default.
</quote-container>

### **2.3 Updatable Events**
You can meet the requirements for event data modification under specific scenarios through Updatable Events. The ID of Updatable Events should be specified and uploaded when the objects of Updatable Events are created. TE would determine the data to be updated according to the event name and event ID.
```javascript
 //The event property status is 3 after reporting, with the price being 100
TDAnalytics.trackUpdate({
    eventName: "UPDATABLE_EVENT",
    properties: { status: 3, price: 100 },
    eventId: "test_event_id"
});

//The event property status is 5 after reporting, with the price remaining the same
TDAnalytics.trackUpdate({
    eventName: "UPDATABLE_EVENT",
    properties: { status: 5 },
    eventId: "test_event_id"
});
```

### **2.4 Overwritable Events**
Despite the similarity with Updatable Events, Overwritable Events would replace all historical data with the latest data. Looking from the perspective of effect, such a process is equivalent to the behavior of deleting the previous data while putting the latest data in storage. TE would determine the data to be updated according to the event name and event ID.
```javascript
//The event property status is 3 after reporting, with the price being 100
TDAnalytics.trackOverwrite({
    eventName: "OVERWRITE_EVENT",
    properties: { status: 3, price: 100 },
    eventId: "test_event_id"
});

//The event property status is 5 after reporting, with the price deleted
TDAnalytics.trackOverwrite({
    eventName: "OVERWRITE_EVENT",
    properties: { status: 5 },
    eventId: "test_event_id"
});
```

### **2.5 Super Properties**
Super properties refer to properties that would be uploaded by each event. Super properties could be divided into `static super properties` and `dynamic super properties`based on the update frequency. You can select different methods for super property setting according to business requirements; we recommend that you set super properties first before sending events. In the same event, when the keys of super properties, self-defined event properties, and preset properties are the same, we would assign value according to the following priority:  `self-defined properties>dynamic super properties>static super properties>preset properties`.
#### **2.5.1 Static Super Properties**
Static super properties are properties that all events might have and would change with a low frequency, for example, the user membership class. After setting static super properties through `setSuperProperties`, SDK would use the preset super properties as the event properties when tracking events.
```javascript
//set super properties
TDAnalytics.setSuperProperties({ channel: "Apple" });
```

Static super properties would be saved in local storage, and should not be called every time the App is closed. If such properties already exist, the reset properties would replace the original properties. If such properties do not exist, properties would be newly created. In addition to property setting, we also provide other APIs to set and manage static super properties and meet general business requirements.
```javascript
//get all super properties
var superProperties = TDAnalytics.getSuperProperties();
//clear a super property named 'channel'
TDAnalytics.unsetSuperProperty("channel");
//clear all super properties
TDAnalytics.clearSuperProperties();
```

#### **2.5.2 Dynamic super properties**
Dynamic super properties that all events might have and would change with a high frequency, for example, the quantity of the gold coins the user possesses. After setting dynamic super properties through `setDynamicSuperPropertiesTracker`, SDK would obtain the properties during event tracking automatically, and add such properties to the event triggered.
```javascript
// set dynamic super properties
TDAnalytics.setDynamicSuperProperties(function() {
  var d = new Date();
  d.setHours(10);
  return { date: d };
});
```

### **2.6 Timing Events**
If you need to record the duration of a certain event, you can call `timeEvent` . Configure the name of the event you want to record. When you upload the event, `#duration` would be added to your event property automatically to record the duration of the event (unit: second). It should be noted that only one task can be timed with the same event name.
```javascript
//The user enters the product page and starts the timing
TDAnalytics.timeEvent({
    eventName: "stay_shop"
});
/**do someting
    .......
**/
    //the timing would end when the user leaves the product page. "stay_shop" event would carry#duration, a property representing event duration. 
TDAnalytics.track({
    eventName: "stay_shop",
    properties: {
        product_name: "product name"
    }
});
```

## **3. User Properties**
User property setting APIs supported by TE  include: `userSet`,  `userSetOnce`, `userAdd`, `userUnset`, `userDelete`, `userAppend`, `userUniqAppend`.
### **3.1 UserSet**
You can call `userSet` to set general user properties. The original properties would be replaced if the properties uploaded via the API are used. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here:
```javascript
// current username is TA
TDAnalytics.userSet({
    properties: {
        username: "TA" 
    }
});
// current username is TE
TDAnalytics.userSet({
    properties: {
        username: "TE" 
    }
});
```

### **3.2 UserSetOnce**
If the user property you want to upload only needs to be set once, you can call `userSetOnce` to set the property. If such property had been set before, this message would be neglected. Let's take the setting of the first payment time as an example:
```javascript
//first_payment_time is '2018-01-01 01:23:45.678'
TDAnalytics.userSetOnce({
    properties: {
        first_payment_time: "2018-01-01 01:23:45.678" 
    }
});
//first_payment_time is '2018-01-01 01:23:45.678' as before
TDAnalytics.userSetOnce({
    properties: {
        first_payment_time: "2018-12-31 01:23:45.678" 
    }
});
```

### **3.3 UserAdd**
When you want to upload numeric property for cumulative operation, you can call `userAdd`.
If the property has not been set, it would be given a value of 0 before computing. A negative value could be uploaded, which is equivalent to subtraction operation. Let's take the accumulative payment amount as an example:
```javascript
//current total_revenue is 30
TDAnalytics.userAdd({
    properties: {
        total_revenue: 30
    }
});
//current total_revenue is 678
TDAnalytics.userAdd({
    properties: {
        total_revenue: 648
    }
});
```

<quote-container>
The property key is a string, and the value is only allowed to be a numeric value.
</quote-container>

### **3.4 UserUnset**
When you need to clear the user properties of users, you can call `userUnset` to clear specific properties.  `userUnset` would not create properties that have not been created in the cluster.
```javascript
// remove a user property named 
TDAnalytics.userUnset({
    property: "userPropertykey"
});
```

### **3.5 UserDelete**
You can call `userDelete` to delete a user. After deleting the user, you would no longer be able to inquire about its user property, but could still query the events data triggered by the user.
```javascript
TDAnalytics.userDelete();
```

### **3.6 UserAppend**
You can call `userAppend` to add user properties of array type.
```javascript
TDAnalytics.userAppend({
    properties: {
        user_list: ["apple", "ball"]
    }
});
```

### **3.7 UserUniqAppend**
You can call `userUniqAppend` to add user properties of array type. You can delete duplicated user property by calling `userUniqAppend` interface. If you call `userAppend` API, duplicated user property will be merged.
```javascript
//current user_list is ["apple"，"ball"]
TDAnalytics.userAppend({
    properties: {
        user_list: ["apple", "ball"]
    }
});
//current user_list is ["apple","apple","ball","cube"]
TDAnalytics.userAppend({
    properties: {
        user_list: ["apple", "cube"]
    }
});
//current user_list is ["apple"，"ball","cube"]
TDAnalytics.userUniqAppend({
    properties: {
        user_list: ["apple", "cube"]
    }
});
```

## **4. Encryption**
The SDK supports data encryption using AES+RSA. The data encryption function requires the cooperation of the client and the server. For specific usage methods, please consult customer success manager.
```javascript
var config = {
  appId: "YOUR_APP_ID", // project APP ID
  serverUrl: "YOUR_SERVER_URL", // project server URL
  enableEncrypt: true, // enable data Encryption
  secretKey: {
    publicKey:'YOUR_PUBLIC_KEY', // public key
    version:1 // key version
   }
};
// initialization
TDAnalytics.init(config);
```

## **5. Other**
### **5.1  ****Device ID**
You can call `getDeviceId` to obtain the device ID:
```javascript
//the value of device ID is Android ID
var deviceId = TDAnalytics.getDeviceId();
```

### **5.2 Callback Function**
For interfaces such as **track**, **userSet**, **userSetOnce**, **userAdd**, **userDelete**, the onComplete callback is supported.
```javascript
// the callback is a parameter
TDAnalytics.track("test", { testkey: 123 }, new Date(), res => {
  console.log(res);
});
// the callback in object
TDAnalytics.track({
  eventName: "test",
  properties: { testkey: 123 },
  time: new Date(),
  onComplete: res => {
    console.log(res);
  }
});
```

Callback parameters: code, msg
code(in Normal mode):
- 0: success
- -1: data format error
- -2: APP ID invalid
- -3: network/server err
code(in Debug mode):
- 0: success
- -1: data format error
- 1: field error
- 2: request data error
- -3: network/server err
msg is a description of code
### 5.3 Enable Caching Event Data
Since v2.2.0, event caching is enabled.
```javascript
// config TE SDK
var config = {
  appId: "YOUR-APP-ID", // project APP ID
  serverUrl: "YOUR-SERVER-URL", // event data report server URL
  enableBatch: true, // enable caching event
  batchConfig: {
    size: 5, // event report batch size
    interval: 5000 // event report time interval, Ms
  }
};

// initialization
TDAnalytics.init(config); 
```

### 5.4 **Time Calibration**
- SDK would use local time as the event time by default. If the user modifies the device time manually,  analysis will be affected. At this time, time calibration could be performed to ensure the accuracy of event time. 
```typescript
TDAnalytics.calibrateTime(1585633785954);
```

- You can also set up automatic time calibration. The SDK will then attempt to retrieve the current time from the config interface and calibrate the SDK time. If the correct result is not obtained, subsequent data will be reported using the local time.
```typescript
var config = {
  appId: "YOUR_APPID",
  serverUrl: "YOUR_SERVER_URL",
  enableAutoCalibrated:true
};
TDAnalytics.init(config);
```

### 5.4 Set the default time zone
By default, the SDK (>=3.5.0) uses the local machine time as the event occurrence time. You can also specify a time zone by setting the default time zone interface. In this way, all events will be aligned with the time zone you set. 
```typescript
var config = {
  appId: "YOUR_APPID",
  serverUrl: "YOUR_SERVER_URL",
  zoneOffset:9
};
TDAnalytics.init(config);
```
