---
code: java_sdk_advanced
name: "Java-Advanced"
wikiToken: T4JmwitDgi3rCQkygsNcysKRn2e
parentWikiToken: BuVmwRcFsi4Oq5knoDDcgJ3fnSN
updateTime: 1774249235000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=java_sdk_advanced
---

## **Sending Events**
After SDK is initialized, you can track user behaviour data. In general, ordinary events could meet business requirements. You can also use the First/Updatable Event based on your own business requirements.
### 1.1 **Ordinary Events**
 You can call `track` to upload events. It is suggested that you set event properties  based on the document about data tracking drafted previously. Procurement of a commodity by a user is taken as the example here:
```java
Map<String,Object> properties = new HashMap<String,Object>();
properties.put("product_name","goodsName");
try {
     te.track("account_id","distinct_id","product_buy",properties);
} catch (Exception e) {
     System.out.println("except:"+e);
}
```

### 1.2 **First Events**
The First Events refers to events that would only be recorded once for the ID of a certain device or other dimensions.   For example, under certain scenarios, you may want to record the activation event on a certain device.   In this case, you can perform data tracking with the First Event.
If you want to judge whether an event is the First Event from other dimensions, you can define a "#first_check_id" for the First Event:
```java
Map<String, Object> properties = new HashMap<>();
properties.put("price",100);
properties.put("status",3);
properties.put("#first_check_id","device_id");
te.trackFirst("account_id", "distinct_id", "device_activation", properties);
```

<quote-container>
Note: Since the server has to check whether the event is the First Event, the First Event will be put in storage one hour later by default.
</quote-container>

### 1.3 ** ****Updatable Event****s**
You can meet the requirements for event data modification under specific scenarios through Updatable Event. The TE would determine the data to be updated according to the event name and event ID.
```java
Map<String, Object> properties = new HashMap<>();
properties.put("price",100);
properties.put("status",3);
te.trackUpdate("account_id","distinct_id","UPDATABLE_EVENT","test_event_id",properties);

Map<String, Object> protertiesNew = new HashMap<>();
protertiesNew.put("status",5);
te.trackUpdate("account_id", "distinct_id", "UPDATABLE_EVENT", "test_event_id", protertiesNew);
```

### 1.4 **Overwritable Events**
Despite the similarity with Updatable Event, Overwritable Event would cover all historical data with the latest data. Looking from the perspective of effect, such a process is equivalent to the behavior of deleting the previous data while putting the latest data in storage. The TE would determine the data to be updated according to the event name and event ID.
```java
Map<String, Object> properties = new HashMap<>();
properties.put("price",100);
properties.put("status",3);
te.trackOverwrite("account_id","distinct_id", "OVERWRITE_EVENT","test_event_id", properties);

Map<String, Object> protertiesNew = new HashMap<>();
protertiesNew.put("status",5);
te.trackOverwrite("account_id", "distinct_id", "OVERWRITE_EVENT", "test_event_id", protertiesNew);
```

## **User Properties**
User property setting APIs supported by the TE  include: `userSet`, `userSetOnce`, `userAdd`, `userAppend`, `userUniqAppend`, `userUnset`, `userDelete`.
### 2.1 userSet
You can call `userSet` to set general user properties. The original properties would be replaced if the properties uploaded via the API are used. If  user properties are not set before, user properties will be created. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here:
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

### 2.2 userSetOnce
If the user property you want to upload only needs to be set once, you can call `userSetOnce` to set the property. If such property had been set before, this message would be ignored. Let's take the setting of the first payment time as an example:
```java
Map<String,Object> userProperties = new HashMap<String,Object>();
userProperties.put("first_payment_time","2018-01-01 01:23:45.678");
try {
     te.userSetOnce("account_id","distinct_id",userProperties);
} catch (Exception e) {
     System.out.println("except:"+e);
}
 
Map<String,Object> newUserProperties = new HashMap<String,Object>();
newUserProperties.put("first_payment_time","2018-12-31 01:23:45.678");
try {
     te.userSetOnce("account_id","distinct_id",newUserProperties);
} catch (Exception e) {
     System.out.println("except:"+e);
}
```

### 2.3 userAdd
When you want to upload numeric property for cumulative operation, you can call `userAdd`.
If the property has not been set, it would be given a value of 0 before computing. A negative value could be uploaded, which is equivalent to subtraction operation. Let's take the accumulative payment amount as an example:
```java
Map<String,Object> userProperties = new HashMap<String,Object>();
userProperties.put("total_revenue",30);
try {
     te.userAdd("account_id","distinct_id",userProperties);
} catch (Exception e) {
     System.out.println("except:"+e);
}

Map<String,Object> newUserProperties = new HashMap<String,Object>();
newUserProperties.put("total_revenue",648);
try {
    te.userAdd("account_id","distinct_id",newUserProperties);
} catch (Exception e) {
    System.out.println("except:"+e);
}
```

<quote-container>
The property key is a string, and the value is only allowed to be a numeric value.
</quote-container>

### 2.4 userAppend
You can call `userAppend` to add user properties of array type.
```java
Map<String,Object> properties = new HashMap<String,Object>();
List<String> list = new ArrayList<>();
list.add("apple");
list.add("ball");
properties.put("user_list",list);
 try{
    te.userAppend("account_id", "distinct_id", properties);
 } catch (Exception e) {
    System.out.println("except:"+e);
 }
```

### 2.5 userUniqAppend
You can delete duplicated user property by calling `userUniqAppend` API. If you call `userAppend` API, duplicated user property might not be deleted.
```java
Map<String,Object> properties = new HashMap<String,Object>();
List<String> list = new ArrayList<>();
list.add("apple");
list.add("ball");
properties.put("user_list",list);
 
Map<String,Object> newProperties = new HashMap<String,Object>();
List<String> newList = new ArrayList<>();
newList.add("apple");
newList.add("cube");
newProperties.put("user_list", newList);
try{
   te.userAppend("account_id", "distinct_id", properties);
   te.userAppend("account_id", "distinct_id",newProperties);
   te.userUniqAppend("account_id", "distinct_id",newProperties);
} catch (Exception e) {
    System.out.println("except:"+e);
}
```

### 2.6 userUnset
When you need to clear the user properties of users, you can call `userUnset` to clear specific properties.  `userUnset` would not create properties that have not been created in the cluster.
```java
try {
    te.userUnset("account_id", "distinct_id", "key1", "key2", "key3");
} catch (Exception e) {
    System.out.println("except:"+e);
}
```

### 2.7 userDelete
You can call `userDelete` to delete a user. After deleting the user, you would no longer be able to inquire about its user property, but could still query the events triggered by the user.
```java
try{
   te.userDelete("account_id","distinct_id");
} catch (Exception e) {
   System.out.println("except:"+e);
}
```


## **Other**
### 3.1 BatchConsumer
::: warning Notice
When the amount of data is too large or the network is abnormal, there is a risk of data loss. And it is not recommended to use it in a production environment
:::
Batches transmit data to the TE in real time, without the need for a transmission tool. When the transmission fails due to network problems, it will retry 3 times. If it still fails, the data will be stored in the cache area. The size of the cache area can be set. The default is 50, that is, the cache area The maximum total number of reserved data is 50*20 (20 is the batch value for each upload, which can be set). 
```java
TDAnalytics te = null;
try {
    te = new TDAnalytics(new TDBatchConsumer("SERVER_URL", "APPID"));
} catch (Exception ignored){

}
```

Instruction on parameters:
- `APPID`: The APPID of your project, which can be found on the project management page of  TE.
- `SERVER_URL`: 
  - If you are using a SaaS version, please check the receiver URL on this page
<image token="DXcVbpVlgoMpTpxfItYcWRRnnbe" width="1674" height="1318" align="center"/>

- If you use the private deployment version, you can customize the data tracking URL .
### 3.2 Timed refresh
By default, the SDK will only automatically report data based on the current data size. The SDK supports the scheduled refresh function, and you can configure the interval and autoFlush parameters in Config to enable the function of regularly reporting data.
```java
TDAnalytics te = null;
try {
    TDBatchConsumer.Config config = new TDBatchConsumer.Config();
    config.setAutoFlush(true);
    config.setInterval(10);
    te = new TDAnalytics(new TDBatchConsumer("url", "appId", config));
} catch (Exception ignored){}
```
