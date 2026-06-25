---
code: csharp_sdk_installation
name: "C#"
wikiToken: V2W3wvcfkiGW3lk9rrDcnosAnqi
parentWikiToken: IKVPwn4NfiIhijk5EcAcMf6pn7e
updateTime: 1774252015000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=csharp_sdk_installation
---

::: tip
Before you begin, please read [<text color="purple" underline="true">Preparation before Data Ingestion</text>](https://thinkingdata.feishu.cn/wiki/OhD8we9iai6Xk5kM1QNc8ITRnQe).
 :::
**Latest version**: v2.0.3
**Update time**: 2025-09-03
**Resource download: **[source code](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Fcsharp-sdk)
::: warning Notice 
Current documentation applies to v2.0.0 and later. For historical versions, see [Data Ingestion Guide - C# (V1)](https%3A%2F%2Fdocs.thinkingdata.cn%2Fta-manual%2Fv4.1%2Fen%2Finstallation%2Finstallation_menu%2Fserver_sdk%2Fcsharp_sdk_installation%2Fcsharp_sdk_installation.html) 
:::
## **SDK**** Integration**
### Method 1: NuGet Integration
1. Search for the ThinkingDataAnalytics library in NuGet and install it into your project.
1. When you install the ThinkingDataAnalytics library, the Newtonsoft.Json library will be automatically installed as well.
### Method 2: Integrate the DLL file
1. Download the SDK source code.
1. Open the solution in the source code and manually compile the DLL file of the SDK.
1. Import the DLL file of the ThinkingDataAnalytics SDK into your project.
1. The SDK depends on the Newtonsoft.Json framework for JSON parsing. Please manually add the Newtonsoft.Json library to your project.
### Logbus Integration
We recommend using SDK+LogBus to track and report data on server. You can refer to the following documents to complete the installation of Logbus:[ LogBus User Guide](https://thinkingdata.feishu.cn/wiki/SlE6wOEK3isQvukzEbnc5V0inNa)
## **Initialization**
The following is the sample code for SDK initialization:
```csharp
using ThinkingData.Analytics

TDAnalytics te = new TDAnalytics(new TDLoggerConsumer("LOG_DIRECTORY"));
```

`LOG_DIRECTORY` is the local folder path.
## **Common Features**
In order to ensure that the distinct ID and account ID can be bound smoothly, if your game uses the distinct ID and account ID, we strongly recommend that you upload these two IDs at the same time, otherwise the account will not match, causing users to double count. For specific ID binding rules, please refer to the chapter on [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc).
### 3.1 **Sending Events**
 You can call `Track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```csharp
Dictionary<string, object> properties = new Dictionary<string, object>();
properties.Add("#ip", "123.123.123.123");
properties.Add("channel", "TE");
properties.Add("age", 1);
properties.Add("is_success", true);

List<string> list = new List<string>();
list.Add("value");
properties.Add("array", list);

Dictionary<string, Object> objectTest = new Dictionary<string, object>();
objectTest.Add("key", "vale");
properties.Add("object", objectTest);

List<Object> object_arr = new List<Object>();
object_arr.Add(objectTest);
properties.Add("object_arr", object_arr);

te.Track("accountId", "distinctId", "Payment", properties);
```

- Key is the name of the property and refers to the string type. It must start with a character, and contain numbers, characters (insensitive to case, and upper cases would be transformed into lower cases by TE) and underscores "_", with a maximum length of 50 characters. 
- Value, the value of the property, supports string, numbers, Boolean, time, object, array object, and array
<quote-container>
**The requirements for event properties and user properties are the same as that for super properties**
</quote-container>

### 3.2 **User Properties**
You can set general user properties by calling `UserSet` API. The original properties would be replaced by the properties uploaded via this API. If no user properties are set before, user properties will be newly created. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here: 
```csharp
Dictionary<string, object> properties= new Dictionary<string, object>();
properties.Add("user_name","TA");
te.UserSet("accountId","distinctId", properties);

Dictionary<string, object> newProperties= new Dictionary<string, object>();
newProperties.Add("user_name","TE");
te.UserSet("accountId","distinctId", newProperties);
```

### 3.3 Reported data
With `TDLoggerConsumer`, the captured events are encoded as json strings and then added to the cache. Data is written to disk only when the string length in the cache exceeds the set length. The default maximum length is 8192.
You can call the `flush()` api to report data to the TE  immediately under certain service scenarios. However, frequent calls to `flush()` can result in degraded service performance.
```csharp
te.Flush();
```

### 3.4 Close  SDK
```csharp
te.Close();
```

<quote-container>
Close and exit the SDK. Please call this api before closing the server to avoid data loss in the cache
</quote-container>

## **Best Practice**
The following sample code covers all the above-mentioned operations. It is recommended that the codes be used in the following steps:
```csharp
using ThinkingData.Analytics

TDAnalytics te = new TDAnalytics(new TDLoggerConsumer("LOG_DIRECTORY"));

Dictionary<string, object> properties = new Dictionary<string, object>();
properties.Add("#ip", "123.123.123.123");
properties.Add("channel", "TE");
properties.Add("age", 1);
properties.Add("is_success", true);

List<string> list = new List<string>();
list.Add("value");
properties.Add("array", list);

Dictionary<string, Object> objectTest = new Dictionary<string, object>();
objectTest.Add("key", "vale");
properties.Add("object", objectTest);

List<Object> object_arr = new List<Object>();
object_arr.Add(objectTest);
properties.Add("object_arr", object_arr);

te.Track("accountId", "distinctId", "Payment", properties);

Dictionary<string, object> userProperties = new Dictionary<string, object>();
userProperties.Add("user_name", "TA");
te.UserSet("accountId", "distinctId", userProperties);

te.Flush();
```
