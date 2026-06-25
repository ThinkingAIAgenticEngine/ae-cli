---
code: javascript_sdk_advanced
name: "JavaScript-Advanced"
wikiToken: BwkywAk0aiKI9Skyhk8cKnlKnde
parentWikiToken: HwzHwHeb5iFceqk6Eylcd03UnMh
updateTime: 1774251968000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=javascript_sdk_advanced
---

## 1**. Managing User Identity**
SDK instances would use random UUID as the default distinct ID of each user by default, which would be used as the identity identification ID of users under an unlogged-in state. It should be noted that the distinct ID would change after the user reinstalled the App or use the APP with a new device.
### **1.1. Identify**
::: tip
Generally speaking, you do not need to customize a distinct ID Please ensure that you understand [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc) before setting a distinct ID. 
If you need to change the distinct ID, please call the API immediately after SDK is initialized. To avoid the generation of useless accounts, please do not call such a process multiple times.
:::
If your APP has its own distinct ID management system for each user, you can call `identify` to set the distinct ID:
```javascript
ta.identify("Thinker");
```

If you need to get the current distinct ID, please call `getDistinctId`:
```javascript
//Return distinct ID
var distinctId = ta.getDistinctId();
```

### **1.2 Login**
When the users  log in, `login` could be called to set the account ID of the user. TE  would use the account ID as the identity identification ID, and the account ID that has been set would be saved before `logout` is called. The previous account ID would be replaced if `login` has been called multiple times.
```javascript
// The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TE
ta.login("TE");
```

<quote-container>
**Login events wouldn't be uploaded in this method.**
</quote-container>

### **1.3 Removing Account ID**
After the user logs out, `logout` could be called to remove the account ID. The distinct ID would be used as the identity identification ID before the next time `login` is called. 
```javascript
ta.logout();
```

It is recommended that you call logout upon explicit logout event. For example, call `logout` when the user commits the behavior of canceling an account; do not call such a process when the App is closed.
<quote-container>
**Logout events wouldn't be uploaded in this method.**
</quote-container>

## **Sending Events**
After SDK is initialized, you can track user behaviour data. In general, ordinary events could meet business requirements. You can also use the First/Updatable Event based on your own business requirements.
### **2.1 Ordinary Events**
 You can call `track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```javascript
ta.track(
  "product_buy", //event name
  { product_name: "product_name"} //event property
);
```

### **2.2 First Events**
The First Events refers to events that would only be recorded once for the ID of a certain device or other dimensions. For example, under certain scenarios, you may want to record the activation event on a certain device. In this case, you can perform data tracking with the first event.
```javascript
ta.trackFirst({
  eventName: "device_activation",
  properties: { key:"value" }
});
```

If you want to judge whether an event is the first event from other dimensions, you can define a first_check_id for the First Event:
```javascript
//set the user ID as the first_check_id of the first event to track the first initialization event of the user.
ta.trackFirst({
  eventName: "account_activation",
  firstCheckId: "TA",
  properties: { key: "value"}
});
```

<quote-container>
Note: Since the server has to check whether the event is the first event, the first event will be put in storage one hour later by default.
</quote-container>

### **2.3 Updatable Events**
You can meet the requirements for event data modification under specific scenarios through Updatable Event. The ID of Updatable Event should be specified and uploaded when the objects of Updatable Event are created. TE would determine the data to be updated according to the event name and event ID.
```javascript
//The event property status is 3 after reporting, with the price being 100
ta.trackUpdate({
  eventName: "UPDATABLE_EVENT",
  properties: { status: 3, price: 100 },
  eventId: "test_event_id"
});

//The event property status is 5 after reporting, with the price remaining the same
ta.trackUpdate({
  eventName: "UPDATABLE_EVENT",
  properties: { status: 5 },
  eventId: "test_event_id"
});
```

### **2.4 Overwriteable Event****s**
Despite the similarity with Updatable Event, Overwritable Event would replace all historical data with the latest data. Looking from the perspective of effect, such a process is equivalent to the behavior of deleting the previous data while putting the latest data in storage. TE would determine the data to be updated according to the event name and event ID.
```javascript
//The event property status is 3 after reporting, with the price being 100
ta.trackOverwrite({
  eventName: "OVERWRITE_EVENT",
  properties: { status: 3, price: 100 },
  eventId: "test_event_id"
});


//The event property status is 5 after reporting, with the price deleted
ta.trackOverwrite({
  eventName: "OVERWRITE_EVENT",
  properties: { status: 5 },
  eventId: "test_event_id"
});
```

### **2.5 Super Properties**
Super Properties refer to properties that would be uploaded by each event. Super Properties could be divided into `static super properties` and `dynamic super properties`based on the update frequency. You can select different methods for super property setting according to business requirements; we recommend that you set super properties first before sending events. 
Before introducing how to set public properties, you need to understand the characteristics of the three types of public properties, and choose the appropriate type according to actual needs:
- Static Public Properties: Effective for all pages. The lowest priority, when caching is enabled, it will be cached in localStorage or cookie. Only fixed values can be set.
- Page Public Properties: effective for the current page, with the highest priority. If the SDK is reinitialized, the page public properties will be cleared. Only fixed values can be set.
- Dynamic Public Properties: effective for the current page, with a lower priority than page public attributes. After reinitializing the SDK, you need to set dynamic public properties again, and you can set dynamic variables.
#### **2.5.1 Static Super Properties**
Static Super Properties are properties that all events might have and would change with a low frequency, for example, the user membership class. After setting static super properties through `setSuperProperties`, SDK would use the preset super properties as the event properties when tracking events.
```javascript
// set super properties
ta.setSuperProperties({ vip_level: 2});
```

Static Super Properties would be saved in local storage, and should not be called every time the Website is closed. If such properties already exist, the reset properties would replace the original properties. If such properties do not exist, properties would be created. In addition to property setting, we also provide other API to set and manage static super properties and meet general business requirements.
```javascript
//obtain all certain super properties
var superProperties = ta.getSuperProperties();
// clear a certain super property
ta.unsetSuperProperty("channel");
// clear all certain super properties
ta.clearSuperProperties();
```

#### **2.5.2 Page Public Properties**
 For some static properties in the page, such as the name or address of a page, you may want to add this property to all events triggered in this page.Static properties like this that need to apply to all events in the page,You can set it with `setPageProperty` ,Note that public properties set with `setPageProperty` are only valid for the current page.
```javascript
//Set the page ID as a public property of the page, and all events triggered in this page will have the following properties
ta.setPageProperty({ page_id: "page10001" });
```

If you want to get the page public properties of the current page, you can call `getPageProperty` 
```javascript
//Get the page public properties of the current page
var pageProperty = ta.getPageProperty();
```

#### **2.5.3 ****Dynamic Super Properties**
Dynamic Super Properties that all events might have and would change with a high frequency, for example, the quantity of the gold coins the user possesses. After setting Dynamic Super Properties through `setDynamicSuperPropertiesTracker`, SDK would get the properties in `getDynamicSuperProperties` during event tracking automatically, and add such properties to the event triggered.
```javascript
ta.setDynamicSuperProperties(function() {
  var d = new Date();
  d.setHours(10);
  return { date: d };
});
```

### **2.6 Timing Events**
If you need to record the duration of a certain event, you can call `timeEvent` . Configure the name of the event you want to record. When you upload the event, `#duration` would be added to your event property automatically to record the duration of the event (Unit: second). It should be noted that only one task can be timed with the same event name.
```javascript
//The following instance has recorded the time the user spent on a certain product page
ta.timeEvent("stay_shop");
/**do someting
    .......
**/
//the timing would end when the user leaves the product page. "stay_shop" event would carry#duration, a property representing event duration. 
ta.track("stay_shop",{product_name:"product_name"});
```

###  **2.7 Send data in batches**
The SDK version needs to be 1.6.1 or above to support data batch sending
```javascript
var config = {
    appId: '2f2d8810817c4cbfb7c38aeb8466615a',
    serverUrl: 'https://receiver-ta-preview.thinkingdata.cn',
    send_method: 'ajax',
    //Enable batch sending, the default is false
    batch:true
     //or
    batch: {
        size: 5,//The maximum value of data to be sent in batches at a time, defaulting to 5 pieces
        interval: 5000,//The interval in milliseconds, send immediately, the default is 5S
        storageLimit:200//The maximum number of data cached locally, the default is 200
    },
};
```

- batch: Whether to enable data batch sending, if not required, the default value is false
- size: The maximum value of data sent in batches, the default is 5, the minimum value is 1, and the maximum value is 30
- interval: sending interval, the default is 6000
- storageLimit: The maximum number of data cached locally, the default is 200
Attention:
1. The batch sending function and the callback function can not be used at the same time. For example, if the track is added with a callback, the callback will not be executed after using the batch sending function.
2. Batch sending uses ajax to send data by default.
3. If more than 200 pieces of data have been stored in localStorage, the batch sending function will be disabled. Only these 200 pieces of data will be saved in localStorage, and the newly generated data will be sent using the configuration method. The first-out strategy removes 20 pieces of data each time, and sends data to these 20 pieces of data at the same time.
4. Only one of app_js_bridge and batch_send can be selected, and batch sending can no longer be used if the connection is enabled.
5. Use local storage to store.
6. Send data directly in debug or debugOnly mode.
## **3. User Properties**
User property setting APIs supported by TE  include: `userSet`,`userSetOnce`,`userAdd`,`userUnset`,`userDel``ete`,`userAppend`,`userUniqAppend`.
### 3.1 userSet
You can call `userSet` to set general user properties. The original properties would be replaced if the properties uploaded via the API are used. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here:
```javascript
//the username now is TA
ta.userSet({ username: "TA" });
//the username now is TE
ta.userSet({ username: "TE" });
```

### 3.2 userSetOnce
If the user property you want to upload only needs to be set once, you can call `userSetOnce` to set the property. If such property had been set before, this message would be neglected. Let's take the setting of the first payment time as an example:
```javascript
//first_payment_time is 2018-01-01 01:23:45.678
ta.userSetOnce({first_payment_time: "2018-01-01 01:23:45.678" });
//first_payment_time is still 2018-01-01 01:23:45.678
ta.userSetOnce({first_payment_time: "2018-12-31 01:23:45.678" });
```

### 3.3 userAdd
When you want to upload numeric attributes for cumulative operation, you can call `userAdd`.
If the property has not been set, it would be given a value of 0 before computing. A negative value could be uploaded, which is equivalent to subtraction operation. Let's take the accumulative payment amount as an example:
```javascript
//in this case, the total_revenue is 30
ta.userAdd({ total_revenue: 30 });
//in this case, the total_revenue is 678
ta.userAdd({ total_revenue: 648 });
```

### 3.4 userUnset
When you need to clear the user properties of users, you can call `userUnset` to clear specific properties.  `userUnset` would not create properties that have not been created in the cluster.
```javascript
// reset properties of a single user
ta.userUnset("userPropertykey");
```

### 3.5 userDelete
You can call `userDelete` to delete a user. After deleting the user, you would no longer be able to inquire about its user property, but could still query the events data triggered by the user.
```javascript
ta.userDelete();
```

### 3.6 userAppend
You can call `userAppend` to add user properties of array type.
```javascript
ta.userAppend({ user_list: ["apple", "ball"] });
```

### 3.7 userUniqAppend
If you call `userAppend` API, duplicated user property might not be merged.
```javascript
//in this case, the property value of user_list is ["apple"，"ball"]
ta.userAppend({ user_list: ["apple", "ball"] });
//in this case, the property value of user_list is ["apple","apple","ball","cube"]
ta.userAppend({ user_list: ["apple", "cube"] });
//in this case, the property value of user_list is ["apple"，"ball","cube"]
ta.userUniqAppend({ user_list: ["apple", "cube"] });
```

## **4. Encryption**
The SDK supports data encryption using AES+RSA. The data encryption function requires the cooperation of the client and the server. For specific usage methods, please consult customer success manager.
```javascript
var config = {
    appId: "xxx",
    serverUrl: "xxx",
     secretKey: {
       //The encrypted public key can be obtained in the TA management background
       publicKey: '公钥',
       //public key version number
       version: 1
     },
};
```

<quote-container>
Support data encryption, need to introduce additional crypto-js and jsencrypt
</quote-container>

```javascript
<script src="https://cdn.bootcdn.net/ajax/libs/crypto-js/4.1.1/crypto-js.js"></script>
<script src="https://cdn.bootcss.com/jsencrypt/3.2.1/jsencrypt.js"></script>
```

## Connecting Multiple Domain Names
SDK  can unify user behavior on websites with two different domain names, and it allows you to more effectively observe the conversion process of users on related websites.
```javascript
ta.quick('siteLinker', {
    linker: [
        { part_url: 'thinkingdata.cn', after_hash: true }，
        { part_url: 'example.com', after_hash: true }
    ]
})
```

part_url : The configured part_url string must be a substring of the URL to open the URL.

<lark-table rows="2" cols="4" column-widths="131,176,203,219">

  <lark-tr>
    <lark-td>
      The domain you want to open
    </lark-td>
    <lark-td>
      configuration
    </lark-td>
    <lark-td>
      a tag href address
    </lark-td>
    <lark-td>
      a label to get through the results
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      thinkingdata.cn
    </lark-td>
    <lark-td>
      { part_url: 'thinkingdata.cn', after_hash: false }
    </lark-td>
    <lark-td>
      https://thinkingdata.cn/
    </lark-td>
    <lark-td>
      https://thinkingdata.cn/?_tasdk='d'+distinctID
    </lark-td>
  </lark-tr>
</lark-table>

after_hash: Mandatory attribute, and the attribute value must be Boolean type, namely true or false, configure the _tasdk parameter in the hash part of the URL (that is, the part after #) or in the search part of the URL (that is, the part before # ?)

<lark-table rows="9" cols="3" column-widths="245,108,381">

  <lark-tr>
    <lark-td>
      url
    </lark-td>
    <lark-td>
      after_hash
    </lark-td>
    <lark-td>
      result
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td rowspan="2">
      https://thinkingdata.cn
    </lark-td>
    <lark-td>
      false {align="center"}
    </lark-td>
    <lark-td>
      https://thinkingdata.cn?_tasdk=distinctID
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      true {align="center"}
    </lark-td>
    <lark-td>
      https://thinkingdata.cn#?_tasdk=distinctID
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td rowspan="2">
      https://thinkingdata.cn#index
    </lark-td>
    <lark-td>
      false {align="center"}
    </lark-td>
    <lark-td>
      https://thinkingdata.cn?_tasdk=distinctID#index
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      true {align="center"}
    </lark-td>
    <lark-td>
      https://thinkingdata.cn#index?_tasdk=distinctID
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td rowspan="2">
      https://thinkingdata.cn?a=1#index
    </lark-td>
    <lark-td>
      false {align="center"}
    </lark-td>
    <lark-td>
      https://thinkingdata.cn?a=1&_tasdk=distinctID#index
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      true {align="center"}
    </lark-td>
    <lark-td>
      https://thinkingdata.cn?a=1#index?_tasdk=distinctID
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td rowspan="2">
      https://thinkingdata.cn?a=1#index?b=2 {align="center"}
    </lark-td>
    <lark-td>
      false {align="center"}
    </lark-td>
    <lark-td>
      https://thinkingdata.cn?a=1&_tasdk=distinctID#index?b=2
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      true {align="center"}
    </lark-td>
    <lark-td>
      https://thinkingdata.cn?a=1#index?b=2&_tasdk=distinctID
    </lark-td>
  </lark-tr>
</lark-table>

## **6. Other**
### **6.1  ****Device ID**
You can call `getDeviceId` to get the device ID:
```javascript
var deviceId = ta.getDeviceId();
```

### **6.2 Default Timezone**
SDK would use the local time as the event time by default. You can also assign a  timezone by setting the default timezone API. In this way, the time of all events could be aligned according to the timezone set by you:
```javascript
var config = {
    appId: "xxx",
    serverUrl: "xxx",
    zoneOffset:8
};
```

<quote-container>
The local timezone information of the device would be lost if a specific timezone is used to align event time. If you need to save the local timezone information of the device, please add relevant properties for the event.
</quote-container>

### **6.3 Disable the SDK from obtaining configuration information**
If you do not want the SDK to pull configuration information during initialization, you can control it in the following way:
```javascript {wrap}
var config = {
    appId: "xxx",
    serverUrl: "xxx",
    disableRConfig:false
};
ta.init(config);
```

Setting `disableRConfig` to `true` means prohibiting the SDK from pulling configuration information, while setting it to `false` means enabling the SDK to pull configuration information.
