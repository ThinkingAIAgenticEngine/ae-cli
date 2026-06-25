---
code: java_sdk_installation
name: "Java"
wikiToken: BuVmwRcFsi4Oq5knoDDcgJ3fnSN
parentWikiToken: IKVPwn4NfiIhijk5EcAcMf6pn7e
updateTime: 1774252005000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=java_sdk_installation
---

::: tip
Before you begin, please read [<text color="purple" underline="true">Preparation before Data Ingestion</text>](https://thinkingdata.feishu.cn/wiki/OhD8we9iai6Xk5kM1QNc8ITRnQe).
The minimum compatible JDK version is 8
 :::
**Latest version: v3.0.****4-beta.1**
**Update time: 202****6****-0****1****-****07**
**Resource download: **[**Source Code**](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Fjava-sdk)
::: warning Notice 
Current documentation applies to v3.0.0 and later. For historical versions, see [Data Ingestion Guide - Java (V2)](https%3A%2F%2Fdocs.thinkingdata.cn%2Fta-manual%2Fv4.1%2Fen%2Finstallation%2Finstallation_menu%2Fserver_sdk%2Fjava_sdk_installation%2Fjava_sdk_installation.html) 
:::
## **SDK**** Integration**
1.  With the Maven integration SDK, place the following dependency information in the `pom.xml` file (recommended):
```xml
<dependencies>
    // others...
    <dependency>
        <groupId>cn.thinkingdata</groupId>
        <artifactId>thinkingdatasdk</artifactId>
        <version>3.0.2</version>
    </dependency>
</dependencies>
```

1. Logbus Integration
We recommend using SDK+LogBus to track and report data on server. You can refer to the following documents to complete the installation of Logbus:[ LogBus User Guide](https://thinkingdata.feishu.cn/wiki/SlE6wOEK3isQvukzEbnc5V0inNa)
1. The API of the SDK is thread-safe and is called synchronously by default. It is recommended that you call the API in a child thread to avoid affecting the business thread.
## **Initialization**
### Simple initialization
The following is the sample code for SDK initialization:
```java
TDAnalytics te = new TDAnalytics(new TDLoggerConsumer("LOG_DIRECTORY"), false);
```

`LOG_DIRECTORY` is the local folder path.
### Full initialization
The SDK supports incoming configuration for initialization, and you can fine-tune the functionality of the SDK through configuration. For example, you can add a prefix to the log file.
```java
TDLoggerConsumer.Config config = new TDLoggerConsumer.Config("LOG_DIRECTORY");
config.setFilenamePrefix("unique_name");
TDAnalytics te = new TDAnalytics(new TDLoggerConsumer(config), false);
```

## **Common ****Features**
In order to ensure that the distinct ID and account ID can be bound smoothly, if your game uses the distinct ID and account ID, we strongly recommend that you upload these two IDs at the same time, otherwise the account will not match, causing users to double count. For specific ID binding rules, please refer to the chapter on [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc).
### 3.1 **Sending Events**
 You can call `track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```java
HashMap<String,Object> properties = new HashMap<>();
properties.put("#ip", "192.168.1.1");
properties.put("channel","te");
properties.put("age",1);
properties.put("isSuccess",true);
properties.put("birthday",new Date());

HashMap<String,Object>  object = new HashMap<>();
object.put("key", "value");
properties.put("object",object);

HashMap<String,Object> object1 = new HashMap<>();
object1.put("key", "value");

ArrayList<Object> arr = new ArrayList<>();
arr.add(object1);
properties.put("object_arr",arr);

ArrayList<String> arr1 = new ArrayList<>();
arr1.add("value");
properties.put("arr",arr1);

try {
    te.track("account_id","distinct_id","payment",properties);
} catch (Exception e) {
    System.out.println("except:"+e);
}
```

- Key is the name of the property and refers to the string type. It must start with a character, and contain numbers, characters (insensitive to case, and upper cases would be transformed into lower cases by TE) and underscores "_", with a maximum length of 50 characters. 
- Value, the value of the property, supports string, numbers, Boolean, time, object, array object, and array
<quote-container>
**The requirements for event properties and user properties are the same as that for super properties**
</quote-container>

### 3.2 **User Properties**
You can set general user properties by calling `userSet` API. The original properties would be replaced by the properties uploaded via this API. If no user properties are set before, user properties will be newly created. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here: 
```java
Map<String,Object> userProperties = new HashMap<String,Object>();
userProperties.put("user_name", "TA");
try {
   te.userSet("account_id","distinct_id",userProperties);
} catch (Exception e) {
  System.out.println("except:"+e);
}
 
Map<String,Object> newUserProperties = new HashMap<String,Object>();
newUserProperties.put("user_name", "TE");
try {
   te.userSet("account_id","distinct_id",newUserProperties);
} catch (Exception e) {
  System.out.println("except:"+e);
}
```

### 3.3 Reported data
With `TDLogConsumer`, the captured events are encoded as json strings and then added to the cache. Data is written to disk only when the string length in the cache exceeds the set length. The default maximum length is 8192 bytes.
You can call the `flush()` api to report data to the TE  immediately under certain service scenarios. However, frequent calls to `flush()` can result in degraded service performance.
```java
te.flush();
```

### 3.4 Close  SDK
```java
try{
   te.close();
} catch (Exception e) {
    System.out.println("except:"+e);
}
```

<quote-container>
Close and exit the SDK. Please call this api before closing the server to avoid data loss in the cache
</quote-container>

## **Best Practice**
The following sample code covers all the above-mentioned operations. It is recommended that the codes be used in the following steps:
```java
TDAnalytics te = new TDAnalytics(new TDLoggerConsumer("LOG_DIRECTORY"), false);

HashMap<String,Object> properties = new HashMap<>();
properties.put("#ip", "192.168.1.1");
properties.put("channel","te");
properties.put("age",1);
properties.put("isSuccess",true);
properties.put("birthday",new Date());

HashMap<String,Object>  object = new HashMap<>();
object.put("key", "value");
properties.put("object",object);

HashMap<String,Object> object1 = new HashMap<>();
object1.put("key", "value");

ArrayList<Object> arr = new ArrayList<>();
arr.add(object1);
properties.put("object_arr",arr);

ArrayList<String> arr1 = new ArrayList<>();
arr1.add("value");
properties.put("arr",arr1);

try {
    te.track("account_id","distinct_id","payment",properties);
} catch (Exception e) {
    System.out.println("except:"+e);
}

Map<String,Object> userProperties = new HashMap<String,Object>();
userProperties.put("user_name", "TE");
try {
   te.userSet("account_id","distinct_id",userProperties);
} catch (Exception e) {
  System.out.println("except:"+e);
}

te.flush();
```
