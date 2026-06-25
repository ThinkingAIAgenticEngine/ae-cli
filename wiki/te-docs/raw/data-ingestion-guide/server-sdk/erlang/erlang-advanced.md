---
code: erlang_sdk_advanced
name: "Erlang-Advanced"
wikiToken: PnlawuZLdi5AtakVJFEcXnohnGc
parentWikiToken: HCbFw6wKsiAj0Qkst6cctv3AnIf
updateTime: 1774249336000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=erlang_sdk_advanced
---

## **Sending Events**
After SDK is initialized, you can track user behaviour data. In general, ordinary events could meet business requirements. You can also use the First/Updatable Event based on your own business requirements.
### 1.1 **Ordinary Events**
 You can call `track_instance` to upload events. It is suggested that you set event properties  based on the document about data tracking drafted previously. Procurement of a commodity by a user is taken as the example here:
```erlang
td_analytics:track_instance(TE_SDK, "account_id_Erlang", "distinct_logbus", "ViewProduct", #{"key_1" => "🚓🦽🦼🚲🚜🚜🦽", "key_2" => 2.2, "key_array" => ["🚌", "🏍", "😚😊"]}),
```

### 1.2 **First Events**
The First Events refers to events that would only be recorded once for the ID of a certain device or other dimensions.   For example, under certain scenarios, you may want to record the activation event on a certain device.   In this case, you can perform data tracking with the First Event.
If you want to judge whether an event is the First Event from other dimensions, you can define a first_check_id for the First Event:
```erlang
FirstCheckId = "first_check_id",
td_analytics:track_first_instance(TE_SDK, "account_id_Erlang", "distinct_id", "first_login", FirstCheckId, #{"key1" => "value1", "key2" => "value2"}),
```

<quote-container>
Note: Since the server has to check whether the event is the First Event, the First Event will be put in storage one hour later by default.
</quote-container>

### 1.3 ** Updatable Events**
You can meet the requirements for event data modification under specific scenarios through Updatable Event. The TE would determine the data to be updated according to the event name and event ID.
```erlang
EventName = "event_name",
EventId = "event_id",
td_analytics:track_update_instance(TE_SDK, "account_id_Erlang", "distinct_id", EventName, EventId, #{"price" => 100, "status" => 3}),
td_analytics:track_update_instance(TE_SDK, "account_id_Erlang", "distinct_id", EventName, EventId, #{"status" => 5}),
```

### 1.4 **Overwritable Event****s**
Despite the similarity with Updatable Event, Overwritable Event would cover all historical data with the latest data. Looking from the perspective of effect, such a process is equivalent to the behavior of deleting the previous data while putting the latest data in storage. The TE would determine the data to be updated according to the event name and event ID.
```erlang
EventName = "overWrite_event",
EventId = "event_id",
%% 上报后，事件属性 price 为 100, status 为 5
td_analytics:track_overwrite_instance(TE_SDK, "account_id_Erlang", "distinct_id", EventName, EventId, #{"price" => 100, "status" => 5}),

%% 上报后，事件属性 price 为 20, status 属性被删除
td_analytics:track_overwrite_instance(TE_SDK, "account_id_Erlang", "distinct_id", EventName, EventId, #{"price" => 20}),
```

## **User Properties**
User property setting APIs supported by the TE  include: `user_set`, `user_setOnce`, `user_add`, `user_append`, `user_uniqAppend`, `user_unset`, `user_delete`.
### 2.1 user_set_instance
You can call `user_set_instance` to set general user properties. The original properties would be replaced if the properties uploaded via the API are used. If  user properties are not set before, user properties will be created. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here:
```erlang
%% "name" is "A"
td_analytics:user_set_instance(TE_SDK, "account_id", "distinct_id", #{"name" => "A", "abc" => ["a", "b", "c"]}),
%% "name" is "B"
td_analytics:user_set_instance(TE_SDK, "account_id", "distinct_id", #{"name" => "B", "abc" => ["a", "b", "c"]}),
```

### 2.2 user_set_once_instance
If the user property you want to upload only needs to be set once, you can call `user_set_once_instance` to set the property. If such property had been set before, this message would be ignored. Let's take the setting of the first payment time as an example:
```erlang
%% "name" is "A"
td_analytics:user_set_once_instance(TE_SDK, "account_id", "distinct_id", #{"name" => "A"}),
%% "name" is still "A"
td_analytics:user_set_once_instance(TE_SDK, "account_id", "distinct_id", #{"name" => "B"}),
```

### 2.3 user_add_instance
When you want to upload numeric property for cumulative operation, you can call `user_add_instance`.
If the property has not been set, it would be given a value of 0 before computing. A negative value could be uploaded, which is equivalent to subtraction operation. Let's take the accumulative payment amount as an example:
```erlang
%% "amount" is 30
td_analytics:user_add_instance(TE_SDK, "account_id", "distinct_id", #{"amount" => 30}),
%% "amount" is 90
td_analytics:user_add_instance(TE_SDK, "account_id", "distinct_id", #{"amount" => 60}),
```

<quote-container>
The property key is a string, and the value is only allowed to be a numeric value.
</quote-container>

### 2.4 user_append_instance
You can call `user_append_instance` to add user properties of array type.
```erlang
%% "array" is ["arr1", "arr3"]
td_analytics:user_append_instance(TE_SDK, "account_id", "distinct_id", #{"array" => ["arr1", "arr3"]}),
%% "array" is ["arr1", "arr3", "arr2", "arr3"]
td_analytics:user_append_instance(TE_SDK, "account_id", "distinct_id", #{"array" => ["arr2", "arr3"]}),
```

### 2.5 user_unique_append_instance
You can delete duplicated user property by calling `user_unique_append_instance` API. If you call `user_append_instance` API, duplicated user property might not be deleted.
```erlang
%% "array" is ["arr1", "arr3"]
td_analytics:user_unique_append_instance(TE_SDK, "account_id", "distinct_id", #{"array" => ["arr1", "arr3"]}),
%% "array" is ["arr1", "arr3", "arr2"]
td_analytics:user_unique_append_instance(TE_SDK, "account_id", "distinct_id", #{"array" => ["arr2", "arr3"]}),
```

### 2.6 user_unset_instance
When you need to clear the user properties of users, you can call `user_unset_instance` to clear specific properties. `user_unset_instance` would not create properties that have not been created in the cluster.
```erlang
td_analytics:user_unset_instance(TE_SDK, "account_id", "distinct_id", ["age", "abc"]),
```

### 2.7 user_del_instance
You can call `user_del_instance` to delete a user. After deleting the user, you would no longer be able to inquire about its user property, but could still query the events triggered by the user.
```erlang
td_analytics:user_del_instance(TE_SDK, "account_id", "distinct_id"),
```
