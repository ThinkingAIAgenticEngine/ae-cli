---
code: unity_sdk_advanced
name: "Unity-Advanced"
wikiToken: A3TawLiiwiV2LZkUDTAc1YuOnmd
parentWikiToken: NaFYwOKI1iN5mgkTPQwcZY0tnRg
updateTime: 1774249091000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=unity_sdk_advanced
---
## **1. Managing User Identity**
SDK instances would use random UUID as the default distinct ID of each user by default, which would be used as the identity identification ID of users under an unlogged-in state. It should be noted that the distinct ID would change after the user reinstalled the App or use the APP with a new device.
### **1.1. Identify**
::: tip
Generally speaking, you do not need to customize a distinct ID Please ensure that you understand [<text underline="true">User Identification Rules</text>](https%3A%2F%2Fthinkingdata.feishu.cn%2Fwiki%2FORyZwNANpi12XBkyGgUccSy0ntb)<text color="purple" underline="true"> </text>before setting a distinct ID. 
If you need to change the distinct ID, please call the api immediately after SDK is initialized. To avoid the generation of useless accounts, please do not call such a process multiple times.
:::
If your App has its own distinct ID management system for each user, you can call `SetDistinctId` to set the distinct ID:
```csharp
// set distinct ID as Thinker
TDAnalytics.SetDistinctId("Thinker");
```

If you need to get the current distinct ID, please call `GetDistinctId`:
```csharp
// return distinct ID
String distinctId = TDAnalytics.GetDistinctId();
```

### **1.2 Login**
When the users  log in, `Login` could be called to set the account ID of the user. TE  would use the account ID as the identity identification ID, and the account ID that has been set would be saved before `Logout` is called. The previous account ID would be replaced if `Login` has been called multiple times.
```csharp
// The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TE
TDAnalytics.Login("TA");
```

<quote-container>
**Login events wouldn't be uploaded in this method.**
</quote-container>

### **1.3 Removing Account ID**
After the user logs out, `Logout` could be called to remove the account ID. The distinct ID would be used as the identity identification ID before the next time `Login` is called. 
```csharp
TDAnalytics.Logout();
```

It is recommended that you call logout upon explicit logout event. For example, call `Logout` when the user commits the behavior of canceling an account; do not call such a process when the App is closed.
<quote-container>
**Logout events wouldn't be uploaded in this method.**
</quote-container>

## **2. Sending Events**
After SDK is initialized, you can track user behaviour data. In general, ordinary events could meet business requirements. You can also use the First/Updatable event based on your own service scenario.
### **2.1 Ordinary Events**
 You can call `Track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```csharp
Dictionary<string, object> properties = new Dictionary<string, object>(){
    {"product_name", "product name"}
};
TDAnalytics.Track("product_buy", properties);
```

### **2.2 First Events**
The First Events refers to events that would only be recorded once for the ID of a certain device or other dimensions. For example, under certain scenarios, you may want to record the activation event on a certain device. In this case, you can perform data tracking with the First Event.
```csharp
Dictionary<string, object> properties = new Dictionary<string, object>() { 
    { "status", 1} 
};
TDFirstEventModel firstEvent = new TDFirstEventModel("first_event");
firstEvent.Properties = properties;
TDAnalytics.Track(firstEvent);
```

If you want to judge whether an event is the First Event from other dimensions, you can define a first_check_id for the First Event:
```csharp
//set the user ID as the first_check_id of the first event to track the first initialization event of the user.
Dictionary<string, object> properties = new Dictionary<string, object>(){
    {"key", "value"}
};
TDFirstEventModel firstEvent = new TDFirstEventModel("first_event", "any-user-id");
firstEvent.Properties = properties;
TDAnalytics.Track(firstEvent);
```

<quote-container>
Note: Since the server has to check whether the event is the First event, the First event will be put in storage one hour later by default.
</quote-container>

### **2.3 Updatable Events**
You can meet the requirements for event data modification under specific scenarios through Updatable Events. The ID of Updatable Events should be specified and uploaded when the objects of Updatable Events are created. TE would determine the data to be updated according to the event name and event ID.
```csharp
 //The event property status is 3 after reporting, with the price being 100
TDUpdatableEventModel updatableEvent = new TDUpdatableEventModel("UPDATABLE_EVENT", "test_event_id");
updatableEvent.Properties = new Dictionary<string, object>{
    {"status", 3},
    {"price", 100}
};
TDAnalytics.Track(updatableEvent);

//The event property status is 5 after reporting, with the price remaining the same
TDUpdatableEventModel updatableEvent_new = new TDUpdatableEventModel("UPDATABLE_EVENT", "test_event_id");
updatableEvent_new.Properties = new Dictionary<string, object>{
    {"status", 5}
};
TDAnalytics.Track(updatableEvent_new);
```

### **2.4 Overwritable Events**
Despite the similarity with Updatable Events, Overwritable Events would replace all historical data with the latest data. Looking from the perspective of effect, such a process is equivalent to the behavior of deleting the previous data while putting the latest data in storage. TE would determine the data to be updated according to the event name and event ID.
```csharp
// Instance: Assume the event name is OVERWRITE_EVENT when reporting an overwritable event
//The event property status is 3 after reporting, with the price being 100
TDOverwritableEventModel overWritableEvent = new TDOverwritableEventModel("OVERWRITABLE_EVENT", "test_event_id");
overWritableEvent.Properties = new Dictionary<string, object>{
    {"status", 3},
    {"price", 100}
};
TDAnalytics.Track(overWritableEvent);

//The event property status is 5 after reporting, with the price deleted
TDOverwritableEventModel overWritableEvent_new = new TDOverwritableEventModel("OVERWRITABLE_EVENT", "test_event_id");
overWritableEvent_new.Properties = new Dictionary<string, object>{
    {"status", 5}
};
TDAnalytics.Track(overWritableEvent_new);
```

### **2.5 Super Properties**
Super properties refer to properties that would be uploaded by each event. Super properties could be divided into `static super properties` and `dynamic super properties`based on the update frequency. You can select different methods for super property setting according to business requirements; we recommend that you set super properties first before sending events. In the same event, when the keys of super properties, self-defined event properties, and preset properties are the same, we would assign value according to the following priority:  `self-defined properties>dynamic super properties>static super properties>preset properties`.
#### **2.5.1 Static Super Properties**
Static super properties are properties that all events might have and would change with a low frequency, for example, the user membership class. After setting static super properties through `SetSuperProperties`, SDK would use the preset super properties as the event properties when tracking events.
```csharp
Dictionary<string, object> superProperties = new Dictionary<string, object>(){ 
    {"vip_level", 2}
};
TDAnalytics.SetSuperProperties(superProperties);
```

Static super properties would be saved in local storage, and should not be called every time the App is closed. If such properties already exist, the reset properties would replace the original properties. If such properties do not exist, properties would be newly created. In addition to property setting, we also provide other APIs to set and manage static super properties and meet general business requirements.
```csharp
//clear super property named 'CHANNEL'
TDAnalytics.UnsetSuperProperty("CHANNEL");
//clear all super properties
TDAnalytics.ClearSuperProperties();
//get all super properties
TDAnalytics.GetSuperProperties();
```

#### **2.5.2 Dynamic super properties**
Dynamic super properties that all events might have and would change with a high frequency, for example, the quantity of the gold coins the user possesses. After setting dynamic super properties through `SetDynamicSuperProperties`, SDK would obtain the properties in `GetDynamicSuperProperties` during event tracking automatically, and add such properties to the event triggered.
```csharp
// 1. implement dynamic properties interface, this is an example of setting the dynamic change of gold coins
public class DynamicProp : TDDynamicSuperPropertiesHandler
{    
    int coin = 0;
    public Dictionary<string, object> GetDynamicSuperProperties()
    {  
         coin++;
         return new Dictionary<string, object>() {
             {"coin",coin}
         };
    }
}
// 2. set dynamic properties
TDAnalytics.SetDynamicSuperProperties(new DynamicProp());
```

### **2.6 Timing Events**
If you need to record the duration of a certain event, you can call `TimeEvent` . Configure the name of the event you want to record. When you upload the event, `#duration` would be added to your event property automatically to record the duration of the event (unit: second). It should be noted that only one task can be timed with the same event name.
```csharp
//The following instance has recorded the time the user spent on a certain product page
//The user enters the product page and starts the timing
TDAnalytics.TimeEvent("stay_shop");
/**do someting
    .......
**/
//the timing would end when the user leaves the product page. "stay_shop" event would carry#duration, a property representing event duration. 
TDAnalytics.Track("stay_shop");
```

## **3. User Properties**
User property setting APIs supported by TE  include: `UserSet`,`UserSetOnce`,`UserAdd`,`UserUnset`,`UserDelete`,`UserAppend`,`UserUniqAppend`.
### **3.1 UserSet**
You can call `UserSet` to set general user properties. The original properties would be replaced if the properties uploaded via the API are used. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here:

```csharp
//the username now is TA
TDAnalytics.UserSet(new Dictionary<string, object>(){
    {"user_name", "TA"}
});
//the username now is TE
TDAnalytics.UserSet(new Dictionary<string, object>(){
    {"user_name", "TE"}
});
```

### **3.2 UserSetOnce**
If the user property you want to upload only needs to be set once, you can call `UserSetOnce` to set the property. If such property had been set before, this message would be neglected. Let's take the setting of the first payment time as an example:
```csharp
//first_payment_time is '2018-01-01 01:23:45.678'
TDAnalytics.UserSetOnce(new Dictionary<string, object>(){
    {"first_payment_time","2018-01-01 01:23:45.678"}
});
 //first_payment_time is '2018-01-01 01:23:45.678' as before
TDAnalytics.UserSetOnce(new Dictionary<string, object>(){
    {"first_payment_time","2018-12-31 01:23:45.678"}
});
```

### **3.3 UserAdd**
When you want to upload numeric attributes for cumulative operation, you can call `UserAdd`.
If the property has not been set, it would be given a value of 0 before computing. A negative value could be uploaded, which is equivalent to subtraction operation. Let's take the accumulative payment amount as an example:
```csharp
//current total_revenue is 30
TDAnalytics.UserAdd(new Dictionary<string, object>(){
    {"total_revenue",30}
});
//current total_revenue is 678
TDAnalytics.UserAdd(new Dictionary<string, object>(){
    {"total_revenue",648}
})
```

<quote-container>
The set attribute key is a string, and the Value is only allowed to be a numeric value.
</quote-container>

### **3.4 UserUnset**
When you need to clear the user properties of users, you can call `UserUnset` to clear specific properties.  `UserUnset` would not create properties that have not been created in the cluster.
```csharp
// delete a user property named 'userPropertyName'
TDAnalytics.UserUnset("userPropertyName");
// delete some user properties as List
List<string> listProps = new List<string>();
listProps.Add("aaa");
listProps.Add("bbb");
listProps.Add("ccc");

TDAnalytics.UserUnset(listProps);
```

### **3.5 UserDelete**
You can call `UserDelete` to delete a user. After deleting the user, you would no longer be able to inquire about its user property, but could still obtain the events data triggered by the user.
```csharp
TDAnalytics.UserDelete();
```

### **3.6 UserAppend**
You can call `UserAppend` to add user properties of array type.
```csharp
List<string> stringList = new List<string>();
stringList.Add("apple");
stringList.Add("ball");
// call UserAppend to add elements for user property user_list. In this case, mon-existing elements would be newly created
TDAnalytics.UserAppend(new Dictionary<string, object>{
    {"user_list", stringList }
});
```

### **3.7 UserUniqAppend**
Since the v2.4.0, you can call `UserUniqAppend` to add user properties of array type. You can delete duplicated user property by calling `UserUniqAppend` interface. If you call `UserAppend` API, duplicated user property might not be deleted.
```csharp
//the property value of user_list is ["apple"，"ball"]
List<string> stringList = new List<string>();
stringList.Add("apple");
stringList.Add("ball");
TDAnalytics.UserAppend(new Dictionary<string, object>{
    {"user_list", stringList}
});

List<string> stringList1 = new List<string>();
stringList1.Add("apple");
stringList1.Add("cube");
//the property value of user_list is ["apple","apple","ball","cube"]
TDAnalytics.UserAppend(new Dictionary<string, object>{
    {"user_list", stringList1}
});
//the property value of user_list is ["apple","ball","cube"]
TDAnalytics.UserUniqAppend(new Dictionary<string, object>{
    {"user_list", stringList1}
});
```

## **4. Encryption**
Since v2.4.0, SDK supports the encryption function for iOS/Android devices, while the client side supports AES+RSA in encrypting data and the server in the decryption of data. The encryption/decryption capability should be realized through coordination between the client side and the server. For detailed information, please consult our customer success manager.
```csharp
TDConfig tdConfig = new TDConfig(appId, serverUrl);
tdConfig.EnableEncrypt("YOUR_ENCRYPT_PUBLIC_KEY", 1);
TDAnalytics.Init(tdConfig);
```

## **5. Other**
### 5.1  Device ID
You can call `GetDeviceId` to obtain the device ID:
```csharp
TDAnalytics.GetDeviceId();
```

### 5.2 Default Timezone
SDK would use the local time as the event time by default. You can also assign a  timezone by setting the default timezone API. In this way, the time of all events could be aligned according to the timezone set by you:
```csharp
TDConfig tdConfig = new TDConfig(appId, serverUrl);
tdConfig.timezone = TDTimeZone.UTC;
TDAnalytics.Init(tdConfig);
```

<quote-container>
The local timezone information of the device would be lost if a specific timezone is used to align event time. If you need to save the local timezone information of the device, please add relevant properties for the event.
</quote-container>

### 5.3 Time Calibration
SDK would use local time as the event time by default. If the user modifies the device time manually,  analysis would be affected. At this time, time calibration could be performed to ensure the accuracy of event time. We provide two time calibration methods: `timestamp` and `NTP`.
- You can use the current timestamp obtained from the server to calibrate the time of SDK. Thereafter, all calling operations not assigned with a specific time would use the calibrated time as the occurrence time, including event data and user property setting.
```csharp
// 1585633785954 is the current unix time stamp, with the unit being millisecond; 
// the corresponding Beijing time is 2020-03-31 13:49:45
TDAnalytics.CalibrateTime(1585633785954);
```

- You can also set the address of NTP server, after which SDK would try to obtain the current time from the uploaded NTP server address and calibrate the SDK time. If you failed to obtain the current return results within the default timeout interval (3s), local time would be used to track data.
```csharp
// use the NTP service of Apple Inc for time calibration 
TDAnalytics.CalibrateTimeWithNtp("time.apple.com");
```

<quote-container>
1. Using NTP service for time calibration would create some uncertainties. It is suggested that you use a time stamp for time calibration as the priority
2. You should select your NTP server address carefully to ensure that the device of the user could obtain server time rapidly under sound network conditions
</quote-container>

### 5.4 Flush
You can call the `Flush` API to report data to TE  immediately .
```csharp
TDAnalytics.Flush();
```

### 5.5 Country/Region code
In some business scenarios, if you need to know the country/region code of the user device, you can get it through`GetLocalRegion`
```csharp
TDAnalytics.GetLocalRegion();
```

### 5.6 Supports Lua-style invocation.
If you need to directly call in a Lua file, you can use the encapsulated Lua API. [Click to download](https%3A%2F%2Fdownload.thinkingdata.cn%2Fclient%2Funity%2Fta_unity_lua_sdk.zip).
After downloading, import TDAnalytics.lua and TDAnalyticsProxy.cs into your project.
The usage example is as follows:
```lua
local config = {
    appId = "AppId",
    serverUrl = "ServerUrl",
    enableLog = true, -- Enable logging, default is false
    mode = 'debug' -- Default is 'normal'
}

-- Initialize the SDK
TDAnalytics.init(config);

-- If the user is logged in, set the user's account ID as the unique identifier
TDAnalytics.login("TA")

-- After setting common event properties, every event will include these properties
local superProperties = {}
superProperties["channel"] = "ta" -- String
superProperties["age"] = 1 -- Number
superProperties["isSuccess"] = true -- Boolean
superProperties["birthday"] = os.date("%Y-%m-%d %H:%M:%S") -- Time
superProperties["object"] = { key="value" } -- Object
superProperties["object_arr"] = { { key="value" } } -- Array of objects
superProperties["arr"] = { "value" } -- Array
TDAnalytics.setSuperProperties(superProperties) -- Set common event properties

-- Send an event
TDAnalytics.track("product_buy", {
    product_name="Product Name"
});

-- Set user properties
TDAnalytics.userSet({
    user_name = "TE"
})
```

### 5.7 WeChat automatic data collection
For the WeChat Mini-Game platform, the following automatic event collection is currently supported: show events, hide events, and launch events. The integration steps are as follows:
- Download the WeChat Mini-Game Plugin:
      Go to the menu: Window → Package Manager → + → Add package from git url
      PackageManager Git URL: https://github.com/wechat-miniprogram/minigame-tuanjie-transform-sdk.git
- Define Custom Macro:
  Go to the menu: Edit → Project Settings → Scripting Define Symbols
  Add a new global macro: TD_WEIXIN_GAME_MODE
  Click the Apply button to save the settings.
- Add Assembly Dependency:
  In the Project window, navigate to: ThinkingAnalytics → TDAnalytics (Assembly Definition) → Assembly Definition References → + → Select WxWasmSDKRuntime
Example usage:
```json
// Enable automatic event collection, supporting show, hide, and launch events
TDAnalytics.EnableAutoTrack(TDAutoTrackEventType.AppStart | TDAutoTrackEventType.AppEnd | TDAutoTrackEventType.AppInstall);
```
