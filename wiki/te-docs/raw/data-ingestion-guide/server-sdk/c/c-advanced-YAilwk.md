---
code: cpp_server_sdk_advanced
name: "C++-Advanced"
wikiToken: YAilwkzevi8lHekvnQ9cqPnrnzh
parentWikiToken: Zf9Jwl81biGtrbkmBhackD1Fn3c
updateTime: 1774249326000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=cpp_server_sdk_advanced
---

## **Sending Events**
After SDK is initialized, you can track user behaviour data. In general, ordinary events could meet business requirements. You can also use the First/Updatable Event based on your own business requirements.
### 1.1 **Ordinary Events**
 You can call `track` to upload events. It is suggested that you set event properties  based on the document about data tracking drafted previously. Procurement of a commodity by a user is taken as the example here:
```cpp
TDPropertiesNode event_properties;
event_properties.SetString("name1", "XZ_debug");
event_properties.SetString("name2", "logbugs");
event_properties.SetString("name3", "name3");
event_properties.SetString("#uuid", "1234567890");
event_properties.SetNumber("test_number_int", 3);
event_properties.SetNumber("test_number_double", 3.14);
event_properties.SetBool("test_bool", true);
std::string test_string = "test_string";
event_properties.SetString("test_stl_string1", test_string);
event_properties.SetDateTime("test_time1", time(nullptr), 0);
timeb t = {};
ftime(&t);
event_properties.SetDateTime("#time", t.time, t.millitm);
std::vector<std::string> test_list;
test_list.push_back("item11");
test_list.push_back("item21");
event_properties.SetList("test_list1", test_list);

// track event
te.track("accountId", "distinctId", "eventName", event_properties);
```

### 1.2 **First Events**
The First Events refers to events that would only be recorded once for the ID of a certain device or other dimensions.   For example, under certain scenarios, you may want to record the activation event on a certain device.   In this case, you can perform data tracking with the First Event.
If you want to judge whether an event is the First Event from other dimensions, you can define a first_check_id for the First Event:
```cpp
TDPropertiesNode event_properties;
// first event
event_properties.SetString("#first_check_id", "first_event");
te.track_first("accountId", "distinctId", "eventName", event_properties);
```

<quote-container>
Note: Since the server has to check whether the event is the First Event, the First Event will be put in storage one hour later by default.
</quote-container>

### 1.3 ** Updatable Events**
You can meet the requirements for event data modification under specific scenarios through Updatable Event. The TE would determine the data to be updated according to the event name and event ID.
```cpp
// updatable event
std::string updateEventId = "update_001";
TDPropertiesNode update_event_properties;
update_event_properties.SetString("price", "100");
update_event_properties.SetString("status", "3");
// the value of "status" is 3, the value of "price" is 100
te.track_update("accountId", "distinctId", "eventName", updateEventId, update_event_properties);

TDPropertiesNode update_event_new_properties;
update_event_new_properties.SetString("status", "5");
// the value of "status" become 5, the value of "price" is still 100
te.track_update("accountId", "distinctId", "eventName", updateEventId, update_event_new_properties);
```

### 1.4 **Overwritable Event****s**
Despite the similarity with Updatable Event, Overwritable Event would cover all historical data with the latest data. Looking from the perspective of effect, such a process is equivalent to the behavior of deleting the previous data while putting the latest data in storage. The TE would determine the data to be updated according to the event name and event ID.
```cpp
// overwrite event
std::string overWriteEventId = "overWrite_001";
TDPropertiesNode overWrite_event_properties;
overWrite_event_properties.SetString("money", "99");
overWrite_event_properties.SetString("code", "10");
// the value of "code" is 10, the value of "money" is 99
te.track_overwrite("accountId", "distinctId", "eventName", overWriteEventId, overWrite_event_properties);

TDPropertiesNode overWrite_event_new_properties;
overWrite_event_new_properties.SetString("money", "66");
// The "money" has changed to 66，The "code" will be deleted
te.track_overwrite("accountId", "distinctId", "eventName", overWriteEventId, overWrite_event_new_properties);
```

## **User Properties**
User property setting APIs supported by the TE  include: `user_set`, `user_setOnce`, `user_add`, `user_append`, `user_uniqAppend`, `user_unset`, `user_delete`.
### 2.1 user_set
You can call `user_set` to set general user properties. The original properties would be replaced if the properties uploaded via the API are used. If  user properties are not set before, user properties will be created. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here:
```cpp
TDPropertiesNode userSet_properties;
userSet_properties.SetString("userName", "A");
// set user properties. the value of "userName" is "A"
te.user_set("accountId", "distinctId", userSet_properties);

userSet_properties.SetString("userName", "B");
// set user properties again，the value of "userName" will change to "B"
te.user_set("accountId", "distinctId", userSet_properties);
```

### 2.2 user_setOnce
If the user property you want to upload only needs to be set once, you can call `user_setOnce` to set the property. If such property had been set before, this message would be ignored. Let's take the setting of the first payment time as an example:
```cpp
// user_setOnce
TDPropertiesNode userSetOnce_properties;
userSetOnce_properties.SetString("user_one_name", "A");
// create "user_one_name" property, and the value is "A"
te.user_setOnce("accountId", "distinctId", userSetOnce_properties);

userSetOnce_properties.SetString("user_one_name", "B");
// the value of "user_one_name" is still "A"
te.user_setOnce("accountId", "distinctId", userSetOnce_properties);
```

### 2.3 user_add
When you want to upload numeric property for cumulative operation, you can call `user_add`.
If the property has not been set, it would be given a value of 0 before computing. A negative value could be uploaded, which is equivalent to subtraction operation. Let's take the accumulative payment amount as an example:
```cpp
// user_add
TDPropertiesNode userAdd_properties;
userAdd_properties.SetNumber("cash", 30);
// the value of "cash" is 30
te.user_add("accountId", "distinctId", userAdd_properties);

userAdd_properties.SetNumber("cash", 60);
// set user properties again，the value of "cash" is 90 now
te.user_add("accountId", "distinctId", userAdd_properties);
```

<quote-container>
The property key is a string, and the value is only allowed to be a numeric value.
</quote-container>

### 2.4 user_append
You can call `user_append` to add user properties of array type.
```cpp
// user_append
TDPropertiesNode userAppend_properties;
std::vector<std::string> userAppendListValue;
userAppendListValue.push_back("11");
userAppendListValue.push_back("33");
userAppend_properties.SetList("arr1", userAppendListValue);
// the value of "arr1" is ["11", "33"]
te.user_append("accountId", "distinctId", userAppend_properties);

TDPropertiesNode userAppend_properties_new;
std::vector<std::string> userAppendListValueNew;
userAppendListValueNew.push_back("22");
userAppendListValueNew.push_back("33");
userAppend_properties_new.SetList("arr1", userAppendListValueNew);
// the value of "arr1" is ["11", "33", "22", "33"]
te.user_append("accountId", "distinctId", userAppend_properties_new);
```

### 2.5 user_uniqAppend
You can delete duplicated user property by calling `user_uniqAppend` API. If you call `user_append` API, duplicated user property might not be deleted.
```cpp
// user_uniqAppend
TDPropertiesNode userAppend_properties;
std::vector<std::string> userAppendListValue;
userAppendListValue.push_back("11");
userAppendListValue.push_back("33");
userAppend_properties.SetList("arr1", userAppendListValue);
// the value of "arr1" is ["11", "33"]
te.user_uniqAppend("accountId", "distinctId", userAppend_properties);

TDPropertiesNode userAppend_properties_new;
std::vector<std::string> userAppendListValueNew;
userAppendListValueNew.push_back("22");
userAppendListValueNew.push_back("33");
userAppend_properties_new.SetList("arr1", userAppendListValueNew);
// the value of "arr1" is ["11", "33", "22"]
te.user_uniqAppend("accountId", "distinctId", userAppend_properties_new);
```

### 2.6 user_unset
When you need to clear the user properties of users, you can call `user_unset` to clear specific properties.  `user_unset` would not create properties that have not been created in the cluster.
```cpp
// user_unset
TDPropertiesNode userUnset_properties;
userUnset_properties.SetNumber("userName", 0);
// the value of "userName" will be reset after executed "user_unset"
te.user_unset("accountId", "distinctId", userUnset_properties);
```

### 2.7 user_del
You can call `user_del` to delete a user. After deleting the user, you would no longer be able to inquire about its user property, but could still query the events triggered by the user.
```cpp
te.user_del("accountId", "distinctId");
```


## **Other**
### 3.1 BatchConsumer
::: warning Notice
When the amount of data is too large or the network is abnormal, there is a risk of data loss. And it is not recommended to use it in a production environment
:::
Batches transmit data to the TE in real time, without the need for a transmission tool.
```cpp
TDBatchConsumer batchConsumer("APPID","SERVER_URL", 10);
TDAnalytics te(batchConsumer, true);
```

Instruction on parameters:
- `APPID`: The APPID of your project, which can be found on the project management page of  TE.
- `SERVER_URL`: 
  - If you are using a SaaS version, please check the receiver URL on this page
<image token="UKc5bUYQ5oKVk9xjgW6cS6DHn0c" width="1674" height="1318" align="center"/>

- If you use the private deployment version, you can customize the data tracking URL .
