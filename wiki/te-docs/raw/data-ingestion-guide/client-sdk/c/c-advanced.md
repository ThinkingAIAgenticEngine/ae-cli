---
code: csharp_sdk_advanced
name: "C#-Advanced"
wikiToken: Lx4bwX6lEiEdy7kLndmcs86JnSh
parentWikiToken: ENH2wrxtFicwM7koUgtcPsaCnOE
updateTime: 1774252000000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=csharp_sdk_advanced
---

## 1**. Managing User Identity**
SDK instances would use random UUID as the default distinct ID of each user by default, which would be used as the identity identification ID of users under an unlogged-in state. It should be noted that the distinct ID would change after the user reinstalled the App or use the APP with a new device.
### **1.1. Identify**
::: tip
Generally speaking, you do not need to customize a distinct ID. Please ensure that you understand [<text underline="true">User Identification Rules</text>](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc)<text color="purple" underline="true"> </text>before setting a distinct ID. 
If you need to change the distinct ID, please call the API immediately after SDK is initialized. To avoid the generation of useless accounts, please do not call such a process multiple times.
:::
If your App has its own distinct ID management system for each user, you can call `SetIdentity` to set the distinct ID:
```csharp
TDAnalytics.SetDistinctId("Thinker");
TDAnalytics.GetDistinctId()
```

### **1.2 Login**
When the users  log in, `Login` could be called to set the account ID of the user. TE  would use the account ID as the identity identification ID, and the account ID that has been set would be saved before `Log``o``ut` is called. The previous account ID would be replaced if `Login` has been called multiple times.
```csharp
TDAnalytics.Login("TA");
```

<quote-container>
**Login events wouldn't be uploaded in this method.**
</quote-container>

### **1.3 Removing Account ID**
After the user logs out, `Logout` could be called to remove the account ID. The distinct ID would be used as the identity identification ID before the next time `Login` is called. 
```java
TDAnalytics.Logout();
```

It is recommended that you call logout upon explicit logout event. For example, call `Logout` when the user commits the behavior of canceling an account; do not call such a process when the App is closed.
<quote-container>
**Logout events wouldn't be uploaded in this method.**
</quote-container>

## **Sending Events**
After SDK is initialized, you can track user behaviour data. In general, ordinary events could meet business requirements. You can also use the First/Updatable Event based on your own service scenario.
### **2.1 Ordinary Events**
You can call `Track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```csharp
Dictionary<string, Object> dic = new Dictionary<string, object>();
dic.Add("product_name", "product name");
TDAnalytics.Track( "product_buy",dic);
```

### **2.2 First Events**
The First Events refers to events that would only be recorded once for the ID of a certain device or other dimensions. For example, under certain scenarios, you may want to record the activation event on a certain device. In this case, you can perform data tracking with the First Event.
```csharp
Dictionary<string, Object> dic = new Dictionary<string, object>();
dic.Add("key", "value");
TDFirstEventModel firstEventModel = new TDFirstEventModel("device_activation", dic);
TDAnalytics.Track(firstEventModel);
```

If you want to judge whether an event is the First Event from other dimensions, you can define a `first_check_id` for the First Event:
```csharp
Dictionary<string, Object> dic = new Dictionary<string, object>();
dic.Add("key", "value");
TDFirstEventModel firstEventModel = new TDFirstEventModel("device_activation", dic,"TA");
TDAnalytics.Track(firstEventModel);
```

<quote-container>
Note: Since the server has to check whether the event is the First Event, the first event will be put in storage one hour later by default.
</quote-container>

### **2.3 Updatable Events**
You can meet the requirements for event data modification under specific scenarios through Updatable Events. The ID of Updatable Events should be specified and uploaded when the objects of Updatable Events are created. TE would determine the data to be updated according to the event name and event ID.
```csharp
 //The event property status is 3 after reporting, with the price being 100
Dictionary<string, Object> dic = new Dictionary<string, object>();
dic.Add("price", 100);
dic.Add("status",3);
TDUpdatableEventModel updatableEventModel = new TDUpdatableEventModel("UPDATABLE_EVENT", dic, "updateEventId");
TDAnalytics.Track(updatableEventModel);

//The event property status is 5 after reporting, with the price remaining the same
Dictionary<string, Object> dic1 = new Dictionary<string, object>();
dic1.Add("status",5);
TDUpdatableEventModel updatableEventModel = new TDUpdatableEventModel("UPDATABLE_EVENT", dic1,"updateEventId");
TDAnalytics.Track(updatableEventModel);
```

###  **2.4 Overwritable Events**
Despite the similarity with Updatable Events, Overwritable Events would replace all historical data with the latest date. Looking from the perspective of effect, such a process is equivalent to the behavior of deleting the previous data while putting the latest data in storage. TE would determine the data to be updated according to the event name and event ID.
```csharp
// Instance: Assume the event name is OVERWRITE_EVENT when reporting an overwritable event
//The event property status is 3 after reporting, with the price being 100
Dictionary<string, Object> dic = new Dictionary<string, object>();
dic.Add("price", 100);
dic.Add("status",3);
TDOverwritableEventModel overwritableEventModel = new TDOverwritableEventModel("OVERWRITABLE_EVENT", dic,"eventId");
TDAnalytics.Track(overwritableEventModel);

//The event property status is 5 after reporting, with the price deleted
Dictionary<string, Object> dic1 = new Dictionary<string, object>();
dic1.Add("status",5);
TDOverwritableEventModel overwritableEventModel = new TDOverwritableEventModel("OVERWRITABLE_EVENT", dic1,"eventId");
TDAnalytics.Track(overwritableEventModel);
```

### **2.5 Common event properties**
Public event attributes refer to the attributes that are uploaded for each event.
#### 2.5.1 Static public event attributes
Static public event attributes are attributes that change infrequently and are carried by each event, such as user membership level. After setting static public event attributes through setSuperProperties, the SDK will obtain the set public event attributes as event attributes when collecting events.
```javascript
Dictionary<string, object> superProperties = new Dictionary<string, object>();
superProperties["vip_level"] = 2;
TDAnalytics.SetSuperProperties(superProperties);
```

Static public event attributes will be saved in the cache and do not need to be called every time the App is started. If the attribute already exists, the re-set attribute will overwrite the original attribute value; if the attribute did not exist before, a new attribute will be created. In addition to attribute settings, we also provide other APIs to manage static public event attributes to meet daily business needs.
```javascript
//Clear a public event property
TDAnalytics.UnsetSuperProperties("Channel");
//Clear all public event properties
TDAnalytics.ClearSuperProperties();
//Get all public event properties
var superProperties = TDAnalytics.GetSuperProperties();
```

#### 2.5.2 Dynamic public event attributes
Dynamic public event attributes are attributes that change frequently and are carried by each event, such as the number of gold coins of a user. After setting the dynamic public attribute class through SetDynamicSuperProperties, the SDK will automatically obtain the attributes when collecting events and add them to the triggered events.
```javascript
static Dictionary<string, object> GetDynamicSuperProperties()
{
return new Dictionary<string, object> { { "coin", 10 } };
}

TDAnalytics.Init(config);
TDAnalytics.SetDynamicSuperProperties(GetDynamicSuperProperties);
```

### 2.6 Recording event duration
If you need to record the duration of an event, you can call timeEvent to start timing. Configure the event name you want to time. When you upload the event, the #duration attribute will be automatically added to your event attributes to indicate the recorded duration in seconds. It should be noted that there can only be one task being timed for the same event name.
```javascript
//The user enters the product page and starts timing
TDAnalytics.TimeEvent("stay_shop");
/**do someting
.......
**/
//The user leaves the product page and the timing ends. The "stay_shop" event will have the attribute #duration indicating the duration of the event
TDAnalytics.Track("stay_shop");
```

## **3. User Properties**
User property setting APIs supported by TE  include:  `UserSet`,`UserSetOnce`,`UserAdd`,`UserUnset`,`UserDelete`,`UserAppend`
### 3.1 UserSet
You can call `UserSet` to set general user properties. The original properties would be replaced if the properties uploaded via the API are used. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here:
```csharp
//the username now is TA
TDAnalytics.UserSet(new Dictionary<string, object>(){{"user_name", "TA"}});
//the userName now is TE
TDAnalytics.UserSet(new Dictionary<string, object>(){{"user_name", "TE"}});
```

### 3.2 UserSetOnce
If the user property you want to upload only needs to be set once, you can call `UserSetOnce` to set the property. If such property had been set before, this message would be ignored. Let's take the setting of the first payment time as an example:
```csharp
//first_payment_time is 2018-01-01 01:23:45.678
TDAnalytics.UserSetOnce(new Dictionary<string, object>(){{"first_pay_time","2018-01-01 01:23:45.67"}});
//first_payment_time is still 2018-01-01 01:23:45.678
TDAnalytics.UserSetOnce(new Dictionary<string, object>(){{"first_pay_time","2018-12-31 01:23:45.678"}});
```

### 3.3 UserAdd
When you want to upload numeric attributes for cumulative operation, you can call `UserAdd`.
If the property has not been set, it would be given a value of 0 before computing. A negative value could be uploaded, which is equivalent to subtraction operation. Let's take the accumulative payment amount as an example:
```csharp
//in this case, the total_revenue is 30
TDAnalytics.UserAdd(new Dictionary<string, object>(){{"total_revenue",30}});
//in this case, the total_revenue is 678
TDAnalytics.UserAdd(new Dictionary<string, object>(){{"total_revenue",648}})
```

<quote-container>
The set attribute key is a string, and the Value is only allowed to be a numeric value.
</quote-container>

### 3.4 UserUnset
When you need to clear the user properties of users, you can call `UserUnSet` to clear specific properties.  `UserUnSet` would not create properties that have not been created in the cluster.
```csharp
List<string> list2 = new List<string>();
list2.Add("nickname");
list2.Add("age");
TDAnalytics.UserUnSet(list2);
```

###  3.5 UserDelete
You can call `UserDelete` to delete a user. After deleting the user, you would no longer be able to inquire about its user property, but could still obtain the events data triggered by the user.
```csharp
TDAnalytics.UserDelete();
```

### 3.6 UserAppend
You can call `UserAppend` to add user properties of array type.
```csharp
Dictionary<string, object> dictionary = new Dictionary<string, object>();
List<string> list6 = new List<string>();
list6.Add("true");
list6.Add("test");
dictionary.Add("arrkey4", list6);
TDAnalytics.UserAppend( dictionary);
```

## Encryption function
Starting from v2.0.0-beta.1, SDK supports the use of AES+RSA to encrypt data. The data encryption function requires the cooperation of the client and the server. Please consult the customer success personnel for specific usage methods.
```javascript
TDConfig config = new TDConfig();
config.AppId = appid;
config.ServerUrl = server_url;
config.EnableEncrypt = true;
config.Version = 1;
config.PublicKey = "publickKey";
TDAnalytics.Init(config);
```

## **Others**
### **5****.1 Printing Log**
During the process of SDK integration, you can perform real-time debugging by checking SDK's logs in the IDE console or using the Debug feature of TE.
```cpp
// After enabling, the log will be viewed in the ta_event_log.txt file in the project root directory
TDAnalytics.EnableLogType(TDLogType.LogTxt);
```

### **5****.2** **Preset Properties of All Events**

<lark-table rows="10" cols="4" column-widths="169,152,140,259">

  <lark-tr>
    <lark-td>
      ** Property name **
    </lark-td>
    <lark-td>
      **Display name **
    </lark-td>
    <lark-td>
      ** Property type **
    </lark-td>
    <lark-td>
      ** Instruction **
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #ip
    </lark-td>
    <lark-td>
      IP address
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      IP address of the user, based on which TE would get the geographical location of the user
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #country
    </lark-td>
    <lark-td>
      Country
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The country where the user is located; generated based on the IP address
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #country_code
    </lark-td>
    <lark-td>
      Country code
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The code of the country where the user is located (ISO 3166-1 alpha-2, two English characters in upper case); generated based on the IP address
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #province
    </lark-td>
    <lark-td>
      Province
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The province or state where the user is located; generated based on the IP address
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #city
    </lark-td>
    <lark-td>
      City
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The city where the user is located; generated based on the IP address
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #os
    </lark-td>
    <lark-td>
      OS
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      E.g., Android, iOS, Mac OS, etc.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #device_id
    </lark-td>
    <lark-td>
      Device ID
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The ID of the user device; IDFV or UUID of the user for iOS; androidID for Android
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #lib
    </lark-td>
    <lark-td>
      SDK type
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The type of the SDK to which you access, e.g., Android，iOS, etc.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #lib_version
    </lark-td>
    <lark-td>
      SDK version
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The version of the SDK to which you access
    </lark-td>
  </lark-tr>
</lark-table>

### 5.3 Time Calibration
The SDK uses the local time as the event occurrence time by default. If the user manually modifies the device time and affects your business analysis, you can calibrate the time to ensure the accuracy of the event occurrence time. We provide a timestamp time calibration method.
- You can use the current timestamp obtained from the server to calibrate the SDK time. After that, all calls without a specified time, including event data and user attribute setting operations, will use the calibrated time as the occurrence time.
```javascript
// 1585633785954 is the current unix timestamp in milliseconds, corresponding to Beijing time 2020-03-31 13:49:45
TDAnalytics.CalibrateTime(1585633785954);
```

- You can also set automatic time calibration, after which the SDK will try to obtain the current time from the config interface and calibrate the SDK time. If the correct return result is not obtained, the local time will be used to report the data later.
```javascript
TDConfig config = new TDConfig();
config.AppId = appid;
config.ServerUrl = server_url;
config.EnableAutoCalibrated = true;
TDAnalytics.Init(config);
```

### 5.4 Send data immediately
In some business scenarios, if you expect data to be reported to the TE server immediately, you can do so by calling the flush interface
```javascript
TDAnalytics.Flush();
```

### 5.5 Get device ID
You can get the device ID by calling getDeviceId:
```javascript
TDAnalytics.GetDeviceId();
```

### 5.6 Set the default time zone
By default, the SDK uses the local time when the interface is called as the event occurrence time for reporting. You can also specify the default time zone by setting the default time zone interface, so that all events will be aligned with the time zone you set:
```javascript
TDConfig config = new TDConfig();
config.AppId = appid;
config.ServerUrl = server_url;
config.ZoneOffset = 5;
TDAnalytics.Init(config);
```

Note: Aligning event times with a specified time zone will lose the device's local time zone information. If you need to keep the device's local time zone information, you currently need to add relevant attributes to the event yourself.
