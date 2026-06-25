---
code: golang_sdk_advanced
name: "Golang-Advanced"
wikiToken: G24JwGkPPiJTQFkvq0XcU3finKf
parentWikiToken: GVHiwdEmWixRWrk0ZdKcT2twnSn
updateTime: 1774249256000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=golang_sdk_advanced
---

## **Sending Events**
After SDK is initialized, you can track user behaviour data. In general, ordinary events could meet business requirements. You can also use the First/Updatable Event based on your own business requirements.
### 1.1 **Ordinary Events**
 You can call `track` to upload events. It is suggested that you set event properties  based on the document about data tracking drafted previously. Procurement of a commodity by a user is taken as the example here:
```go
properties := map[string]interface{}{
    "product_name": "goods_name",
}
te.Track("account_id", "distinct_id", "product_buy", properties)
```

### 1.2 **First Events**
The First Events refers to events that would only be recorded once for the ID of a certain device or other dimensions.   For example, under certain scenarios, you may want to record the activation event on a certain device.   In this case, you can perform data tracking with the First Event.
If you want to judge whether an event is the First Event from other dimensions, you can define a first_check_id for the First Event:
```go
properties := map[string]interface{}{
    "prop_string": "value",
}
err := te.TrackFirst("account_id", "distinct_id", "device_activation", "first_event_flag", properties)
```

<quote-container>
Note: Since the server has to check whether the event is the First Event, the First Event will be put in storage one hour later by default.
</quote-container>

### 1.3 ** Updatable Events**
You can meet the requirements for event data modification under specific scenarios through Updatable Event. The TE would determine the data to be updated according to the event name and event ID.
```go
properties := make(map[string]interface{})
properties["status"] = 3
properties["price"] = 100
err := te.TrackUpdate("account_id", "distinct_id", "UPDATABLE_EVENT", "test_event_id", properties)

propertiesNew := make(map[string]interface{})
propertiesNew["status"] = 5
err = te.TrackUpdate("account_id", "distinct_id", "UPDATABLE_EVENT", "test_event_id", propertiesNew)
```

### 1.4 **Overwritable Event****s**
Despite the similarity with Updatable Event, Overwritable Event would cover all historical data with the latest data. Looking from the perspective of effect, such a process is equivalent to the behavior of deleting the previous data while putting the latest data in storage. The TE would determine the data to be updated according to the event name and event ID.
```go
properties := make(map[string]interface{})
properties["status"] = 3
properties["price"] = 100
err := te.TrackOverwrite("account_id", "distinct_id", "OVERWRITE_EVENT", "test_event_id", properties)

propertiesNew := make(map[string]interface{})
propertiesNew["status"] = 5
err = te.TrackOverwrite("account_id", "distinct_id", "OVERWRITE_EVENT", "test_event_id", propertiesNew)
```

## **User Properties**
User property setting APIs supported by the TE  include: `UserSet`, `UserSetOnce`, `UserAdd`, `UserAppend`, `UserUniqAppend`, `UserUnset`, `UserDelete`.
### 2.1 UserSet
You can call `UserSet` to set general user properties. The original properties would be replaced if the properties uploaded via the API are used. If  user properties are not set before, user properties will be created. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here:
```go
err := te.UserSet("account_id", "distinct_id", map[string]interface{}{
    "user_name": "TA",
})

err = te.UserSet("account_id", "distinct_id", map[string]interface{}{
    "user_name": "TE",
})
```

### 2.2 UserSetOnce
If the user property you want to upload only needs to be set once, you can call `UserSetOnce` to set the property. If such property had been set before, this message would be ignored. Let's take the setting of the first payment time as an example:：
```go
err := te.UserSetOnce("account_id", "distinct_id", map[string]interface{}{
    "first_payment_time":"2018-01-01 01:23:45.678",
})

err = te.UserSetOnce("account_id", "distinct_id", map[string]interface{}{
    "first_payment_time":"2018-12-31 01:23:45.678",
})
```

### 2.3 UserAdd
When you want to upload numeric property for cumulative operation, you can call `UserAdd`.
If the property has not been set, it would be given a value of 0 before computing. A negative value could be uploaded, which is equivalent to subtraction operation. Let's take the accumulative payment amount as an example:
```go
err := te.UserAdd("account_id", "distinct_id", map[string]interface{}{
    "total_revenue":30,
})

err = te.UserAdd("account_id", "distinct_id", map[string]interface{}{
    "total_revenue":648,
})
```

<quote-container>
The property key is a string, and the value is only allowed to be a numeric value.
</quote-container>

### 2.4 UserAppend
You can call `UserAppend` to add user properties of array type.
```go
err := te.UserAppend("account_id", "distinct_id", map[string]interface{}{
    "user_list":   []string{"apple", "ball"},
})
```

### 2.5 UserUniqAppend
You can delete duplicated user property by calling `UserUniqAppend` API. If you call `UserAppend` API, duplicated user property might not be deleted.
```go
//in this case, the property value of user_list is ["apple"，"ball"]
err := te.UserAppend("account_id", "distinct_id", map[string]interface{}{
    "user_list":   []string{"apple", "ball"},
})
//in this case, the property value of user_list is ["apple","apple","ball","cube"]
err = te.UserAppend("account_id", "distinct_id", map[string]interface{}{
    "user_list":   []string{"apple", "cube"},
})
//in this case, the property value of user_list is ["apple"，"ball","cube"]
err = te.UserUniqAppend("account_id", "distinct_id", map[string]interface{}{
    "user_list":   []string{"apple", "cube"},
})
```

### 2.6 UserUnset
When you need to clear the user properties of users, you can call `UserUnset` to clear specific properties.  `UserUnset` would not create properties that have not been created in the cluster.
```go
err := te.UserUnset("account_id"," distinct_id", property_name)
```

### 2.7 UserDelete
You can call `UserDelete` to delete a user. After deleting the user, you would no longer be able to inquire about its user property, but could still query the events triggered by the user.
```go
err := te.UserDelete("account_id", "distinct_id")
```

## **Other**
### 3.1 BatchConsumer
::: warning Notice
When the amount of data is too large or the network is abnormal, there is a risk of data loss. And it is not recommended to use it in a production environment
:::
Batches transmit data to the TE in real time, without the need for a transmission tool. 
```go
consumer, err := thinkingdata.NewBatchConsumer("SERVER_URL", "APP_ID")
te := thinkingdata.New(consumer)
```

Instruction on parameters:
- `APPID`: The APPID of your project, which can be found on the project management page of  TE.
- `SERVER_URL`: 
  - If you are using a SaaS version, please check the receiver URL on this page

- If you use the private deployment version, you can customize the data tracking URL .
