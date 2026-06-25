---
code: csharp_sdk_advanced
name: "C#-Advanced"
wikiToken: IauKwIL6UiVIadkz8FCcBHL4n4f
parentWikiToken: V2W3wvcfkiGW3lk9rrDcnosAnqi
updateTime: 1774249296000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=csharp_sdk_advanced
---

## **Sending Events**
After SDK is initialized, you can track user behaviour data. In general, ordinary events could meet business requirements. You can also use the First/Updatable Event based on your own business requirements.
### 1.1 **Ordinary Events**
 You can call `track` to upload events. It is suggested that you set event properties  based on the document about data tracking drafted previously. Procurement of a commodity by a user is taken as the example here:
```csharp
Dictionary<string, object> properties = new Dictionary<string, object>();
properties.Add("product_name", "goods_name");
properties.Add("price", "123");
te.Track("accountId", "distinctId", "product_buy", properties);
```

### 1.2 **First Events**
The First Events refers to events that would only be recorded once for the ID of a certain device or other dimensions.   For example, under certain scenarios, you may want to record the activation event on a certain device.   In this case, you can perform data tracking with the First Event.
If you want to judge whether an event is the First Event from other dimensions, you can define a first_check_id for the First Event:
```csharp
Dictionary<string, object> properties = new Dictionary<string, object>();
properties.Add("price", 35);
te.TrackFirst("accountId", "distinctId", "device_activation", "first_check_id", properties);
```

<quote-container>
Note: Since the server has to check whether the event is the First Event, the First Event will be put in storage one hour later by default.
</quote-container>

### 1.3 ** Updatable Events**
You can meet the requirements for event data modification under specific scenarios through Updatable Event. The TE would determine the data to be updated according to the event name and event ID.
```csharp
Dictionary<string, object> properties = new Dictionary<string, object>();
properties.Add("price", 100);
properties.Add("status", 3);
te.TrackUpdate("accountId", "distinctId", "UPDATABLE_EVENT", "event_id", properties);

Dictionary<string, object> newProperties = new Dictionary<string, object>();
newProperties.Add("status", 5);

te.TrackUpdate("accountId", "distinctId", "UPDATABLE_EVENT", "event_id", properties);
```

### 1.4 **Overwritable Event****s**
Despite the similarity with Updatable Event, Overwritable Event would cover all historical data with the latest data. Looking from the perspective of effect, such a process is equivalent to the behavior of deleting the previous data while putting the latest data in storage. The TE would determine the data to be updated according to the event name and event ID.
```csharp
Dictionary<string, object> properties = new Dictionary<string, object>();
properties.Add("price", 100);
properties.Add("status", 3);
te.TrackOverwrite("accountId", "distinctId", "OVERWRITE_EVENT", "event_id", properties);

Dictionary<string, object> newProperties = new Dictionary<string, object>();
newProperties.Add("status", 5);
te.TrackOverwrite("accountId", "distinctId", "OVERWRITE_EVENT", "event_id", properties);
```

## **User Properties**
User property setting APIs supported by the TE  include: `UserSet`, `UserSetOnce`, `UserAdd`, `UserAppend`, `UserUniqAppend`, `UserUnSet`, `UserDelete`.
### 2.1 UserSet
You can call `UserSet` to set general user properties. The original properties would be replaced if the properties uploaded via the API are used. If  user properties are not set before, user properties will be created. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here:
```csharp
Dictionary<string, object> properties= new Dictionary<string, object>();
properties.Add("user_name","TA");
te.UserSet("accountId","distinctId", properties);

Dictionary<string, object> newProperties= new Dictionary<string, object>();
newProperties.Add("user_name","TE");
te.UserSet("accountId","distinctId", newProperties);
```

### 2.2 UserSetOnce
If the user property you want to upload only needs to be set once, you can call `UserSetOnce` to set the property. If such property had been set before, this message would be ignored. Let's take the setting of the first payment time as an example:：
```csharp
Dictionary<string, object> properties = new Dictionary<string, object>();
properties.Add("first_payment_time", "2018-01-01 01:23:45.678");
te.UserSetOnce("accountId", "distinctId", properties);

Dictionary<string, object> newProperties = new Dictionary<string, object>();
newProperties.Add("first_payment_time", "2018-12-31 01:23:45.678");
te.UserSetOnce("accountId", "distinctId", newProperties);
```

### 2.3 UserAdd
When you want to upload numeric property for cumulative operation, you can call `UserAdd`.
If the property has not been set, it would be given a value of 0 before computing. A negative value could be uploaded, which is equivalent to subtraction operation. Let's take the accumulative payment amount as an example:
```csharp
Dictionary<string, object> properties = new Dictionary<string, object>();
properties.Add("total_revenue", 30);
te.UserAdd("accountId", "distinctId", properties);

Dictionary<string, object> newProperties = new Dictionary<string, object>();
newProperties.Add("total_revenue", 648);
te.UserAdd("accountId", "distinctId", newProperties);
```

<quote-container>
The property key is a string, and the value is only allowed to be a numeric value.
</quote-container>

### 2.4 UserAppend
You can call `UserAppend` to add user properties of array type.
```csharp
Dictionary<string, object> dictionary = new Dictionary<string, object>();
List<string> list = new List<string>();
list.Add("ball");
dictionary.Add("user_list", list);
te.UserAppend("accountId", "distinctId", dictionary);
```

### 2.5 UserUniqAppend
You can delete duplicated user property by calling `UserUniqAppend` API. If you call `UserAppend` API, duplicated user property might not be deleted.
```csharp
Dictionary<string, object> dictionary = new Dictionary<string, object>();
List<string> list = new List<string>();
list.Add("apple");
list.Add("ball");
dictionary.Add("user_list", list);
te.UserAppend("accountId", "distinctId", dictionary);

Dictionary<string, object> newDictionary = new Dictionary<string, object>();
List<string> newList = new List<string>();
newList.Add("apple");
newList.Add("cube");
newDictionary.Add("user_list", newList);
te.UserAppend("accountId", "distinctId", newDictionary);

te.UserUniqAppend("accountId", "distinctId", newDictionary);
```

### 2.6 UserUnSet
When you need to clear the user properties of users, you can call `UserUnSet` to clear specific properties. `UserUnSet` would not create properties that have not been created in the cluster.
```csharp
List<string> list = new List<string>();
list.Add("nickname");
list.Add("age");
te.UserUnSet("accountId", "distinctId", list);
```

### 2.7 UserDelete
You can call `UserDelete` to delete a user. After deleting the user, you would no longer be able to inquire about its user property, but could still query the events triggered by the user.
```csharp
te.UserDelete("accountId", "distinctId");
```

## **Other**
### 3.1 BatchConsumer
::: warning Notice
When the amount of data is too large or the network is abnormal, there is a risk of data loss. And it is not recommended to use it in a production environment
:::
Batches transmit data to the TE in real time, without the need for a transmission tool. 
```csharp
TDAnalytics te = new(new TDBatchConsumer("SERVER_URL", "APPID", true));
```

Instruction on parameters:
- `APPID`: The APPID of your project, which can be found on the project management page of  TE.
- `SERVER_URL`: 
  - If you are using a SaaS version, please check the receiver URL on this page
<image token="PfiKbR0P0oqr79xogQgclGM5nOf" width="1674" height="1318" align="center"/>

- If you use the private deployment version, you can customize the data tracking URL .
### 3.2 Timed refresh
By default, the SDK will only automatically report data based on the current data size. The SDK supports the scheduled refresh function, and you can configure the interval and autoFlush parameters in Config to enable the function of regularly reporting data.
```csharp
using ThinkingData.Analytics

TDLoggerConsumer.TDConfig config = new TDLoggerConsumer.TDConfig();
config.BatchSec = 3;

TDAnalytics te = new(new TDLoggerConsumer("LOG_DIRECTORY", config));
```
