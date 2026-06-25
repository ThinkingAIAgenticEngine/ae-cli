---
code: android_sdk_advanced
name: "Android-Advanced"
wikiToken: LqfmwtW1xi0jzwkrKpscKEzFnme
parentWikiToken: Sis2weaL2iJOOWklkX1cZAtcnVc
updateTime: 1774249038000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=android_sdk_advanced
---

## 1**. Managing User Identity**
SDK instances would use random UUID as the default distinct ID of each user by default, which would be used as the identity identification ID of users under an unlogged-in state. It should be noted that the distinct ID would change after the user reinstalled the App or use the APP with a new device.
### **1.1. Identify**
::: tip
Generally speaking, you do not need to customize a distinct ID. Please ensure that you understand [<text underline="true">User Identification Rules</text>](https%3A%2F%2Fthinkingdata.feishu.cn%2Fwiki%2FORyZwNANpi12XBkyGgUccSy0ntb)<text color="purple" underline="true"> </text>before setting a distinct ID. 
If you need to change the distinct ID, please call the api immediately after SDK is initialized. To avoid the generation of useless accounts, please do not call such a process multiple times.
:::
If your App has its own distinct ID management system for each user, you can call `identify` to set the distinct ID:
```java
// set distinct ID as Thinker
TDAnalytics.setDistinctId("Thinker");
```

If you need to get the current distinct ID, please call `getDistinctId`:
```java
//Return distinct ID
String distinctId = TDAnalytics.getDistinctId();
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
After SDK is initialized, you can track user behaviour data. In general, ordinary events could meet business requirements. You can also use the First/Updatable Event based on your own business requirements.
### **2.1 Ordinary Events**
 You can call `track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```java
try {
    JSONObject properties = new JSONObject();
    properties."product_name", "product name");
    TDAnalytics.track("product_buy",properties);
} catch (JSONException e) {
    e.printStackTrace();   
}
```


### **2.2 First Events**
The First Events refers to events that would only be recorded once for the ID of a certain device or other dimensions. For example, under certain scenarios, you may want to record the activation event on a certain device. In this case, you can perform data tracking with the first event.
```java
JSONObject properties = new JSONObject();
try {
    properties.put("key", "value");
} catch (JSONException e) {
    e.printStackTrace();
}
TDAnalytics.track(new TDFirstEventModel("device_activation", properties));
```

If you want to judge whether an event is the First Event from other dimensions, you can define a first_check_id for the First Event:
```java
//set the user ID as the first_check_id of the first event to track the first initialization event of the user.
TDFirstEvent firstEvent = new TDFirstEvent("account_activation", properties);
firstEvent.setFirstCheckId("TE");
TDAnalytics.track(model);
```

<quote-container>
Note: Since the server has to check whether the event is the First Event, the First Event will be put in storage one hour later by default.
</quote-container>

### **2.3 Updatable Events**
You can meet the requirements for event data modification under specific scenarios through Updatable Events. The ID of Updatable Events should be specified and uploaded when the objects of Updatable Events are created. TE would determine the data to be updated according to the event name and event ID.
```java
 //The event property status is 3 after reporting, with the price being 100
JSONObject properties = new JSONObject();
try {
    properties.put("status", 3);
    properties.put("price", 100);
} catch (JSONException e) {
    e.printStackTrace();
}
TDAnalytics.track(new TDUpdatableEventModel("UPDATABLE_EVENT", properties, "test_event_id"));

//The event property status is 5 after reporting, with the price remaining the same
JSONObject properties_new = new JSONObject();
try {
    properties_new.put("status", 5);
} catch (JSONException e) {
    e.printStackTrace();
}
TDAnalytics.track(new TDUpdatableEventModel("UPDATABLE_EVENT", properties_new, "test_event_id"));
```


### **2.4 Overwritable Events**
Despite the similarity with Updatable Events, Overwritable Events would replace all historical data with the latest data. Looking from the perspective of effect, such a process is equivalent to the behavior of deleting the previous data while putting the latest data in storage. TE would determine the data to be updated according to the event name and event ID.
```java
// Instance: Assume the event name is OVERWRITE_EVENT when reporting an overwritable event
//The event property status is 3 after reporting, with the price being 100
JSONObject properties = new JSONObject();
try {
    properties.put("status", 3);
    properties.put("price", 100);
} catch (JSONException e) {
    e.printStackTrace();
}
TDAnalytics.track(new TDOverWritableEventModel("OVERWRITE_EVENT", properties, "test_event_id"));

//The event property status is 5 after reporting, with the price deleted
JSONObject properties_new = new JSONObject();
try {
    properties_new.put("status", 5);
} catch (JSONException e) {
    e.printStackTrace();
}
TDAnalytics.track(new TDOverWritableEventModel("OVERWRITE_EVENT", properties_new, "test_event_id"));
```

### **2.5 Super Properties**
Super properties refer to properties that would be uploaded by each event. Super properties could be divided into `static super properties` and `dynamic super properties`based on the update frequency. You can select different methods for super property setting according to business requirements; we recommend that you set super properties first before sending events. In the same event, when the keys of super properties, self-defined event properties, and preset properties are the same, we would assign value according to the following priority:  `self-defined properties>dynamic super properties>static super properties>preset properties`.
#### **2.5.1 Static Super Properties**
Static super properties are properties that all events might have and would change with a low frequency, for example, the user membership class. After setting static super properties through `setSuperProperties`, SDK would use the preset super properties as the event properties when tracking events.
```java
//set super properties
try {
    JSONObject superProperties = new JSONObject();
    superProperties.put("vip_level",2);
    TDAnalytics.setSuperProperties(superProperties);
} catch (JSONException e) {
    e.printStackTrace();
}
```

Static super properties would be saved in local storage, and should not be called every time the App is closed. If such properties already exist, the reset properties would replace the original properties. If such properties do not exist, properties would be newly created. In addition to property setting, we also provide other APIs to set and manage static super properties and meet general business requirements.
```java
//clear a certain super property
TDAnalytics.unsetSuperProperty("Channel");
//clear all certain super properties
TDAnalytics.clearSuperProperties();
//obtain all certain super properties
TDAnalytics.getSuperProperties();
```

#### **2.5.2 Dynamic super properties**
Dynamic super properties that all events might have and would change with a high frequency, for example, the quantity of the gold coins the user possesses. After setting dynamic super properties through `setDynamicSuperPropertiesTracker`, SDK would obtain the properties in `getDynamicSuperProperties` during event tracking automatically, and add such properties to the event triggered.
```java
int coin = 0;
TDAnalytics.setDynamicSuperProperties(new TDAnalytics.TDDynamicSuperPropertiesHandler() {
    @Override
    public JSONObject getDynamicSuperProperties() {
        JSONObject dynamicSuperProperties = new JSONObject();
        coin++; //frequency update of gold coin quantity 
        try {
            dynamicSuperProperties.put("coin",coin);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        return dynamicSuperProperties;
    }
});
```

### **2.6 Timing Events**
If you need to record the duration of a certain event, you can call `timeEvent` . Configure the name of the event you want to record. When you upload the event, `#duration` would be added to your event property automatically to record the duration of the event (unit: second). It should be noted that only one task can be timed with the same event name.
```java
//The following instance has recorded the time the user spent on a certain product page
try {
    //The user enters the product page and starts the timing
    TDAnalytics.timeEvent("stay_shop");
    /**do someting
    .......
    **/
    //the timing would end when the user leaves the product page. "stay_shop" event would carry#duration, a property representing event duration. 
    TDAnalytics.track("stay_shop");
} catch (JSONException e) {
    e.printStackTrace();
}
```

## **3. User Properties**
User property setting APIs supported by TE  include: `userSet`,`userSetOnce`,`userAdd`,`userUnset`,`userDelete`,`userAppend`,`userUniqAppend`.
### 3.1 userSet
You can call `userSet` to set general user properties. The original properties would be replaced if the properties uploaded via the API are used. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here:
```java
try {
    //the username now is TA
    JSONObject properties = new JSONObject();
    properties.put("username","TA");
    TDAnalytics.userSet(properties);
    //the userName now is TE
    JSONObject newProperties = new JSONObject();
    newProperties.put("username","TE");
    TDAnalytics.userSet(newProperties);
} catch (JSONException e) {
    e.printStackTrace();
}
```

### 3.2 userSetOnce
If the user property you want to upload only needs to be set once, you can call `userSetOnce` to set the property. If such property had been set before, this message would be neglected. Let's take the setting of the first payment time as an example:
```java
try {
    //first_payment_time is 2018-01-01 01:23:45.678
    JSONObject properties = new JSONObject();
    properties.put("first_payment_time","2018-01-01 01:23:45.678");
    TDAnalytics.userSetOnce(properties);
    
    //first_payment_time is still 2018-01-01 01:23:45.678
    JSONObject newProperties = new JSONObject();
    newProperties.put("first_payment_time","2018-12-31 01:23:45.678");
    TDAnalytics.userSetOnce(newProperties); 
       
} catch (JSONException e) {
    e.printStackTrace();
}
```


### 3.3 userAdd
When you want to upload numeric property for cumulative operation, you can call `userAdd`.
If the property has not been set, it would be given a value of 0 before computing. A negative value could be uploaded, which is equivalent to subtraction operation. Let's take the accumulative payment amount as an example:
```java
try {
    //in this case, the total_revenue is 30
    JSONObject properties = new JSONObject();additive operation
    properties.put("total_revenue",30);
    TDAnalytics.userAdd(properties);
    
    //in this case, the total_revenue is 678
    JSONObject newProperties = new JSONObject();
    newProperties.put("total_revenue",648);
    TDAnalytics.userAdd(newProperties);
} catch (JSONException e) {
    e.printStackTrace();
}
```

<quote-container>
The property key is a string, and the value is only allowed to be a numeric value.
</quote-container>

### 3.4 userUnset
When you need to clear the user properties of users, you can call `userUnset` to clear specific properties.  `userUnset` would not create properties that have not been created in the cluster.
```java
// reset properties of a single user
TDAnalytics.userUnset("key1");
// reset properties of several users
TDAnalytics.userUnset("key1", "key2", "key3");
```

### 3.5 userDelete
You can call `userDelete` to delete a user. After deleting the user, you would no longer be able to inquire about its user property, but could still query the events data triggered by the user.
```java
TDAnalytics.userDelete();
```

### 3.6 userAppend
You can call `userAppend` to add user properties of array type.
```java
try {
    // list is the value of user property user_list, JSONArray type
    JSONArray list = new JSONArray("[\"apple\", \"ball\"]");
    JSONObject properties = new JSONObject();
    properties.put("user_list", list);
    // call user_append to add elements for user property user_list. In this case, mon-existing elements would be newly created
    TDAnalytics.userAppend(properties);
} catch (JSONException e) {
    e.printStackTrace();
}
```

### 3.7 userUniqAppend
You can call `userUniqAppend` to add user properties of array type. You can delete duplicated user property by calling `userUniqAppend` interface. If you call `userAppend` API, duplicated user property will be merged.
```javascript
try {
    // list is the value of user property user_list, JSONArray type
    //in this case, the property value of user_list is ["apple"，"ball"]
    JSONArray list = new JSONArray("[\"apple\", \"ball\"]");
    JSONObject properties = new JSONObject();
    properties.put("user_list", list);
    TDAnalytics.userAppend(properties);
    
    
    //in this case, the property value of user_list is ["apple","apple","ball","cube"]
    JSONArray list1 = new JSONArray("[\"apple\", \"cube\"]");
    JSONObject properties1 = new JSONObject();
    properties1.put("user_list", list1);
    TDAnalytics.userAppend(properties1);
    
    //in this case, the property value of user_list is ["apple"，"ball","cube"]
    TDAnalytics.userUniqAppend(properties1);
    
} catch (JSONException e) {
    e.printStackTrace();
}
```

## **4. Encryption**
The SDK supports data encryption using AES+RSA. The data encryption function requires the cooperation of the client and the server. For specific usage methods, please consult customer success manager.
```java
TDConfig config = TDConfig.getInstance(mContext,TA_APP_ID,TA_SERVER_URL);
//set public key information
config.enableEncrypt(1,"publicKey")
```

## **5. Enable H5 Connection **
If you need to connect with the JavaScript SDK that tracks the data of H5, please call the following API when initializing `WebView`. For detailed information, please refer to [<text underline="true">H5 and APP SDK Connection</text>](https%3A%2F%2Fthinkingdata.feishu.cn%2Fwiki%2FR66GwJYRFiQAxdkV3fkcY3vVnYd)
```java
// connect with H5 
TDAnalytics.setJsBridge(webView);
```

## **6. Other**
### **6.1  Device ID**
You can call `getDeviceId` to obtain the device ID:
```java
String deviceID = TDAnalytics.getDeviceId();//the value of device ID is Android ID
```

### **6.2 Default Timezone**
SDK would use the local time as the event time by default. You can also assign a  timezone by setting the default timezone API. In this way, the time of all events could be aligned according to the timezone set by you:
```java
// get TDConfig instance
TDConfig config = TDConfig.getInstance(this, TE_APP_ID, TE_SERVER_URL);
// set UTC as the default timezone
config.setDefaultTimeZone(TimeZone.getTimeZone("UTC"));
// initialize SDK
TDAnalytics.init(config);
```

<quote-container>
The local timezone information of the device would be lost if a specific timezone is used to align event time. If you need to save the local timezone information of the device, please add relevant properties for the event.
</quote-container>

### **6.3 Time Calibration**
SDK would use local time as the event time by default. If the user modifies the device time manually,  analysis would be affected. At this time, time calibration could be performed to ensure the accuracy of event time. We provide two time calibration methods: `timestamp` and `NTP.`
- You can use the current timestamp obtained from the server to calibrate the time of SDK. Thereafter, all calling operations not assigned with a specific time would use the calibrated time as the occurrence time, including event data and user property setting.
```java
// 1585633785954 is the current unix time stamp, with the unit being millisecond; the corresponding Beijing time is 2020-03-31 13:49:45
TDAnalytics.calibrateTime(1585633785954);
```


- You can also set the address of NTP server, after which SDK would try to obtain the current time from the uploaded NTP server address and calibrate the SDK time. If you failed to obtain the current return results within the default timeout interval (3s), local time would be used to track data.
```java
//use the NTP service of Apple Inc for time calibration 
TDAnalytics.calibrateTimeWithNtp("time.apple.com");
```

<quote-container>
1. Time calibration may fail due to unstable NTP server. It is suggested that you use a time stamp for time calibration as the priority
2. You should select your NTP server address carefully to ensure that the device of the user could obtain server time rapidly under sound network conditions
</quote-container>

### 6.4 Flush
You can call the `flush` API to report data to TE  immediately .
```java
TDAnalytics.flush();
```

### 6.5 R**egion Code**
You can obtain such information through `getLocalRegion` to obtain the region code of the user device.
```java
TDAnalytics.getLocalRegion()
```

### 6.6 Disable Android ID Collection
If you don't need Android ID collection code in your project, you can use a plugin to isolate sensitive attributes (such as Android ID) in the code.

<lark-table rows="4" cols="2" column-widths="230,590">

  <lark-tr>
    <lark-td>
      Android Analytics SDK version
    </lark-td>
    <lark-td>
      plugin version
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      [oldest - 3.0.0)
    </lark-td>
    <lark-td>
      1.2.0
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      [3.0.0 - 3.1.0]
    </lark-td>
    <lark-td>
      2.1.0
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      (3.1.0 - latest]
    </lark-td>
    <lark-td>
      2.2.0
    </lark-td>
  </lark-tr>
</lark-table>

```groovy
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

### 6.7 Support IP Data Reporting
To prevent or resolve issues where client data fails to report to the server due to DNS hijacking, the SDK resolves the ServerUrl to obtain the IP and then reports data directly to the server via the IP. Here's an example of how to enable this:
```java
TDConfig config = TDConfig.getInstance(this, APPID, TE_SERVER_URL);
List<TDConfig.TDDNSService> list = new ArrayList<>();
list.add(TDConfig.TDDNSService.CLOUD_ALI);
list.add(TDConfig.TDDNSService.CLOUD_FLARE);
list.add(TDConfig.TDDNSService.CLOUD_GOOGLE);
config.enableDNSService(list);
```

### 6.8 Support SDK Error Callbacks
<callout emoji="glass_of_milk" background-color="light-orange" border-color="light-orange">
Requires Android Analytics SDK version >= 3.2.0
</callout>

In some scenarios, you might want to customize actions when a network request fails. You can register an error callback as shown below:
```java
TDAnalytics.registerErrorCallback(new TDAnalytics.TDSendDataErrorCallback() {
    @Override
    public void onSDKErrorCallback(int code, String errorMsg, String ext) {
        // todo
    }
});
```

Error Code Reference

<lark-table rows="2" cols="2" column-widths="100,720">

  <lark-tr>
    <lark-td>
      Error Code
    </lark-td>
    <lark-td>
      Description
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      1001
    </lark-td>
    <lark-td>
      Network request failed
    </lark-td>
  </lark-tr>
</lark-table>

### 6.9 Disable Pulling Configuration Information During Initialization
Starting from version 3.4.0, if you do not need to pull configuration information during SDK initialization, you can turn this feature off via `disableRConfig`. The specific code is as follows:
```java {wrap}
TDConfig config = TDConfig.getInstance(this, APPID, TE_SERVER_URL);
config.disableRConfig = true;
TDAnalytics.init(config);
```

### 6.10 Configure Backup Reporting Addresses
Starting from version 3.4.0, if you need to configure multiple reporting addresses, you can do so via `backupUrlList`. The sample code is as follows:
```java {wrap}
TDConfig config = TDConfig.getInstance(this, APPID, TE_SERVER_URL);
List<String>  backupUrlList = new ArrayList<>();
backupUrlList.add("serverurl1");
backupUrlList.add("serverurl2");
backupUrlList.add("serverurl3");
config.backupUrlList = backupUrlList;
TDAnalytics.init(config);
```
