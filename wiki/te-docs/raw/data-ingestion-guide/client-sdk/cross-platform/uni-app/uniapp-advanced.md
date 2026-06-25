---
code: uniapp_sdk_advanced
name: "uniapp-Advanced"
wikiToken: DM7kwtiBMiCpWCkk7icczidxn7c
parentWikiToken: N0e7w3csPiU7MkkMCO9c7PXVnSb
updateTime: 1774251989000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=uniapp_sdk_advanced
---

## 1**. Managing User Identity**
SDK instances would use random UUID as the default distinct ID of each user by default, which would be used as the identity identification ID of users under an unlogged-in state. It should be noted that the visitor ID would change after the user clear cache or use the APP with a new device.
### **1.1. Identify**
:: tip
Generally speaking, you do not need to define a distinct ID for yourself. Please ensure that you understand [<text underline="true">User Identification Rules</text>](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc)<text color="purple" underline="true"> </text>before setting a distinct ID. 
:::
If your App has its own visitor ID management system for each user, you can call `identify` to set the distinct ID:
```java
// set distinct ID as Thinker
TDAnalytics.setDistinctId("Thinker");
```

If you need to obtain the current visitor ID, please call `getDistinctId`:
```java
//Return distinct ID
let distinctId = TDAnalytics.getDistinctId();
```

### **1.2 Login**
When the user is logging in, `login` could be called to set the account ID of the user. TE platform would use the account ID as the identity identification ID, and the account ID that has been set would be saved before `logout` is called. The previous account ID would be covered if `login` has been called multiple times.
```javascript
//The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TE
TDAnalytics.login("TA");
```

<quote-container>
**The method will not upload  login events**
</quote-container>

### **1.3 Logout**
After the user logs out, `logout` could be called to eliminate the account ID. The visitor ID would be used as the identity identification ID before the next time `login` is called. 
```javascript
TDAnalytics.logout();
```

It is recommended that you call logout upon explicit logout event. For example, call `logout` when the user commits the behavior of canceling an account; do not call such a process when the App is closed.
<quote-container>
**The method will not upload  logout events**
</quote-container>

## **2. Events**
After SDK is initialized, you can perform data tracking to collect information about the behavior of users. In general, ordinary events could meet the requirements of service scenarios. You can also use the first/updatable event based on your own service scenario.
### **2.1 Ordinary Events**
You can call `track` to upload events. It is suggested that you set event properties  based on the document about data tracking drafted previously. Procurement of a commodity by a user is taken as the example here:
```javascript
TDAnalytics.track(
    eventName: "product_buy",
    properties: {
        product_name: "tv"
    }
);
```

### **2.2 First Events**
The first event refers to events that would only be recorded once for the ID of a certain device or other dimensions. For example, under certain scenarios, you may want to record the activation event on a certain device. In this case, you can perform data tracking with the first event.
```javascript
TDAnalytics.trackFirst({
    eventName: "device_activation",
    properties: { key: "value" }
});
```

If you want to judge whether an event is the first event from other dimensions, you can define a first_check_id for the first event:
```javascript
// set the user ID as the first_check_id of the first event to track the first initialization event of the user.
TDAnalytics.trackFirst({
  eventName: "account_activation",
  firstCheckId: "TA",
  properties: { key: "value" }
});
```

<quote-container>
Note: Since the server has to check whether the event is the first event, the first event will be put in storage one hour later by default.
</quote-container>

### **2.3 Updatable Events**
You can meet the requirements for event data modification under specific scenarios through updatable events. The ID of updatable events should be specified and uploaded when the objects of updatable events are created. The TE would determine the data to be updated according to the event name and event ID.
```javascript
// The event property status is 3 after reporting, with the price being 100
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

### **2.4 Overwritable Event****s**
Despite the similarity with updatable events, overwritable events would cover all historical data with the latest data. Looking from the perspective of effect, such a process is equivalent to the behavior of deleting the previous data while putting the latest data in storage. The TE would determine the data to be updated according to the event name and event ID.
```javascript
// The event property status is 3 after reporting, with the price being 100
TDAnalytics.trackOverwrite({
  eventName: "OVERWRITE_EVENT",
  properties: { status: 3, price: 100 },
  eventId: "test_event_id"
});

// The event property status is 5 after reporting, with the price deleted
TDAnalytics.trackOverwrite({
  eventName: "OVERWRITE_EVENT",
  properties: { status: 5 },
  eventId: "test_event_id"
});
```

### **2.5 Super Properties**
Super properties refer to properties that would be uploaded by each event. Super properties could be divided into `static super properties` and `dynamic super properties`based on the update frequency. You can select different methods for super property setting according to the requirements of specific service scenarios; we recommend that you set super properties first before sending events. In the same event, when the keys of super properties, self-defined event properties, and preset properties are the same, we would assign value according to the following priority:  `self-defined properties>dynamic super properties>static super properties>preset properties`.
#### **2.5.1 Static Super Properties**
Static super properties are properties that all events might have and would change with a low frequency, for example, the user subscriber category. After setting static super properties through `setSuperProperties`, SDK would obtain and use the preset super properties as the event properties when tracking events.
```javascript
TDAnalytics.setSuperProperties({ vip_level: 2});
```

Static super properties would be saved in local storage, and should not be called every time the App is closed. If such properties already exist, the reset properties would cover the original properties. If such properties do not exist, properties would be newly created. In addition to property setting, we also provide other APIs to handle static super properties and meet daily service demands.
```javascript
// obtain all certain super properties
var superProperties = TDAnalytics.getSuperProperties();
// clear a certain super property
TDAnalytics.unsetSuperProperty("channel");
// clear all certain super properties
TDAnalytics.clearSuperProperties();
```

#### **2.5.2 Dynamic super properties**
Dynamic super properties that all events might have and would change with a high frequency, for example, the quantity of the gold coins the user possesses. After setting dynamic super properties through `setDynamicSuperPropertiesTracker`, SDK would obtain the properties in `getDynamicSuperProperties` during event tracking, and add such properties to the event triggered.
```javascript
TDAnalytics.setDynamicSuperProperties(function() {
    var d = new Date();
    d.setHours(10);
    return { date: d };
});
```

### **2.6 Timing Events**
If you need to record the duration of a certain event, you can call `timeEvent` to start timing. Configure the name of the event you want to record. When you upload the event, `#duration` would be added to your event property automatically to record the duration of the event (unit: second). It should be noted that only one task can be timed with the same event name.
```javascript
//The following instance has recorded the time the user spent on a certain product page
TDAnalytics.timeEvent({
    eventName: "stay_shop"
});
/**do someting
    .......
**/
//the timing would end when the user leaves the product page. "stay_shop" event would carry#duration, a property representing event duration. 
TDAnalytics.track("stay_shop",{product_name:"tv"});
```

## **3. User Properties**
User property setting APIs supported by the TE  include: `userSet`、`userSetOnce`、`userAdd`、`userUnset`、`userDelete`、`userAppend`、`userUniqAppend`.
### 3.1 userSet
You can call `userSet` to set general user properties. The original properties would be covered if the properties uploaded via the API are used. If  user properties are not set before, user properties will be newly created. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here:
```javascript
//the username now is TA
TDAnalytics.userSet({
    properties: {
        username: "TA" 
    }
});
//the username now is TE
TDAnalytics.userSet({
    properties: {
        username: "TE" 
    }
});
```

### 3.2 userSetOnce
If the user property you want to upload only needs to be set once, you can call `userSetOnce` to set the property. If such property had been set before, this message would be neglected. Let's take the setting of the first payment time as an example:
```javascript
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

### 3.3 userAdd
When you want to upload the property of the numeric type, we can call `userAdd` to accumulate operations against the property. If the property has not been set, it would be given a value of 0 before computing. A negative value could be uploaded, which is equivalent to subtraction operation. Let's take the accumulative payment amount as an example:
```javascript
//in this case, the total_revenue is 30
TDAnalytics.userAdd({
    properties: {
        total_revenue: 30
    }
});
//in this case, the total_revenue is 678
TDAnalytics.userAdd({
    properties: {
        total_revenue: 648
    }
});
```

### 3.4 userUnset
When you need to clear the user properties of users, you can call `userUnset` to clear specific properties.  `userUnset` would not create properties that have not been created in the cluster.
```javascript
//reset a single user property
TDAnalytics.userUnset({
    property: "userPropertykey"
});
```

### 3.5 userDelete
You can call `userDelete` to delete a user. After deleting the user, you would no longer be able to inquire about its user property, but could still obtain the events triggered by the user.
```javascript
TDAnalytics.userDelete();
```

### 3.6 userAppend
You can call `userAppend` to add user properties of array type.
```javascript
TDAnalytics.userAppend({
    properties: {
        user_list: ["apple", "ball"]
    }
});
```

### 3.7 userUniqAppend
you can call `userUniqAppend` to add user properties of array type. You can delete duplicated user property by calling `userUniqAppend` interface. If you call `userAppend` interface, duplicated user property might not be deleted.
```javascript
//in this case, the property value of user_list is ["apple"，"ball"]
TDAnalytics.userAppend({
    properties: {
        user_list: ["apple", "ball"]
    }
});
//in this case, the property value of user_list is ["apple","apple","ball","cube"]
TDAnalytics.userAppend({
    properties: {
        user_list: ["apple", "cube"]
    }
});
//in this case, the property value of user_list is ["apple"，"ball","cube"]
TDAnalytics.userUniqAppend({
    properties: {
        user_list: ["apple", "cube"]
    }
});
```

## **4. Encryption**
SDK supports the encryption function, while the client side supports AES+RSA in encrypting data and the server in the decryption of data. The encryption/decryption capability should be realized through coordination between the client side and the server. For detailed information, please consult our customer success personnel.
```javascript
var config = {
  appId: "YOUR_APP_ID", 
  serverUrl: "YOUR_SERVER_URL",
  enableEncrypt: true, // Enable the encryption function
  secretKey: {
    publicKey:'YOUR_PUBLIC_KEY', 
    version:0 
   }
};
TDAnalytics.init(config);
```

## **5. Other**
### **5.1  ****Device ID**
You can call `getDeviceId` to obtain the device ID:
```javascript
var deviceId = TDAnalytics.getDeviceId();
```

### 5.2 onCompelete callback function
::: tip
this callback function is not valid on Android and iOS platforms.
:::
For `track, userSet, userSetOnce, userAdd, userDel` and other interfaces, the onComplete callback is passed. You can pass onComplete directly after the original argument list, or you can use a parameter object. If you use a parameter object, onComplete must be included in the parameter object, otherwise a parameter error will occur. Take the preceding events as an example:
```javascript
// the callback is passed as a parameter object
TDAnalytics.track({
  eventName: "test", 
  properties: { testkey: 123 }, 
  time: new Date(), 
  onComplete: res => {
    console.log(res);
  } 
});
```

onComplete takes an argument res of type object and two attributes code and msg.
res.code is of type int, defined as follows:
- 0: succeed
- -1:  the data format is incorrect
- -2: APP ID invalid
- -3: the network or server is abnormal
 the Debug mode is defined as follows:
- 0: succeed
- -1:  parameter or permission verification problem
- 1:  indicates the basic error of the field, will give the detailed error field and the reason
- 2: represents the entire error
- -3: the network or server is abnormal
res.msg is the text description of res.code.
### 5.3  set event cache reporting
you can enable event cache reporting during initialization.
```javascript
var config = {
  appId: "YOU-APP-ID",
  serverUrl: "https://youserverurl.com", 
  enableBatch: true, // whether to enable batch event cache reporting.
  batchConfig: {
    size: 5, // the number of event cache reports
    interval: 5000 // Event cache reporting interval (milliseconds)
  }
};
//init
TDAnalytics.init(config); 
```
