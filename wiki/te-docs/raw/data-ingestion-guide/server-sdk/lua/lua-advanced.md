---
code: lua_sdk_advanced
name: "Lua-Advanced"
wikiToken: Kyrww4y2piF8Jok2abwc5ctondg
parentWikiToken: CLL4wjPKtiEhkjkmbIqcrn3CnXd
updateTime: 1774249316000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=lua_sdk_advanced
---

## **Sending Events**
After SDK is initialized, you can track user behaviour data. In general, ordinary events could meet business requirements. You can also use the First/Updatable Event based on your own business requirements.
### 1.1 **Ordinary Events**
 You can call `track` to upload events. It is suggested that you set event properties  based on the document about data tracking drafted previously. Procurement of a commodity by a user is taken as the example here:
```lua
local properties = {}
properties["#time"] = os.date("%Y-%m-%d %H:%M:%S")
properties["#ip"] = "192.168.1.1"
properties["Product_Name"] = "card"
properties["Price"] = 30
properties["OrderId"] = "abc_123"

sdk:track("accountId", "distinctId", "payment", properties)
```

### 1.2 **First Events**
The First Events refers to events that would only be recorded once for the ID of a certain device or other dimensions.   For example, under certain scenarios, you may want to record the activation event on a certain device.   In this case, you can perform data tracking with the First Event.
If you want to judge whether an event is the First Event from other dimensions, you can define a first_check_id for the First Event:
```lua
local properties = {}
sdk:trackFirst("accountId", "distinctId", "device_activation", "first_check_id", properties)
```

<quote-container>
Note: Since the server has to check whether the event is the First Event, the First Event will be put in storage one hour later by default.
</quote-container>

### 1.3 ** Updatable Events**
You can meet the requirements for event data modification under specific scenarios through Updatable Event. The TE would determine the data to be updated according to the event name and event ID.
```lua
-- "price" is 80, "count" is 3
local properties = {}
properties["price"] = 80
properties["count"] = 3
sdk:trackUpdate("accountId", "distinctId", "eventName", "eventId", properties)

-- The "price" is still 80, The "count" has changed to 5
local newProperties = {}
newProperties["count"] = 5
sdk:trackUpdate("accountId", "distinctId", "eventName", "eventId", newProperties)
```

### 1.4 **Overwritable Event****s**
Despite the similarity with Updatable Event, Overwritable Event would cover all historical data with the latest data. Looking from the perspective of effect, such a process is equivalent to the behavior of deleting the previous data while putting the latest data in storage. The TE would determine the data to be updated according to the event name and event ID.
```lua
-- "price" is 80, "count" is 3
local properties = {}
properties["price"] = 80
properties["count"] = 3
sdk:trackOverwrite("accountId", "distinctId", "eventName", "eventId", properties)

-- The "count" has changed to 5，The "price" will be deleted
local newProperties = {}
newProperties["count"] = 5
sdk:trackOverwrite("accountId", "distinctId", "eventName", "eventId", newProperties)
```

## **User Properties**
User property setting APIs supported by the TE  include: `userSet`, `userSetOnce`, `userAdd`, `userAppend`, `userUniqueAppend`, `userUnset`, `userDel`.
### 2.1 userSet
You can call `userSet` to set general user properties. The original properties would be replaced if the properties uploaded via the API are used. If  user properties are not set before, user properties will be created. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here:
```lua
local userSetProperties = {}
userSetProperties["user_name"] = "ABC"
userSetProperties["#time"] = os.date("%Y-%m-%d %H:%M:%S")
sdk:userSet("accountId", "distinctId", userSetProperties)

userSetProperties = {}
userSetProperties["user_name"] = "abc"
userSetProperties["#time"] = os.date("%Y-%m-%d %H:%M:%S")
sdk:userSet("accountId", "distinctId", userSetProperties)
```

### 2.2 userSetOnce
If the user property you want to upload only needs to be set once, you can call `userSetOnce` to set the property. If such property had been set before, this message would be ignored. Let's take the setting of the first payment time as an example:
```lua
local userSetOnceProperties = {}
userSetOnceProperties["user_name"] = "ABC"
userSetOnceProperties["#time"] = os.date("%Y-%m-%d %H:%M:%S")
sdk:userSetOnce("accountId", "distinctId", userSetOnceProperties)

userSetOnceProperties = {}
userSetOnceProperties["user_name"] = "abc"
userSetOnceProperties["user_age"] = 18
userSetOnceProperties["#time"] = os.date("%Y-%m-%d %H:%M:%S")
sdk:userSetOnce("accountId", "distinctId", userSetOnceProperties)
```

### 2.3 userAdd
When you want to upload numeric property for cumulative operation, you can call `userAdd`.
If the property has not been set, it would be given a value of 0 before computing. A negative value could be uploaded, which is equivalent to subtraction operation. Let's take the accumulative payment amount as an example:
```lua
local userAddProperties = {}
userAddProperties["total_revenue"] = 30
userAddProperties["#time"] = os.date("%Y-%m-%d %H:%M:%S")
sdk:userAdd("accountId", "distinctId", userAddProperties)

userAddProperties = {}
userAddProperties["total_revenue"] = 60
userAddProperties["#time"] = os.date("%Y-%m-%d %H:%M:%S")
sdk:userAdd("accountId", "distinctId", userAddProperties)
```

<quote-container>
The property key is a string, and the value is only allowed to be a numeric value.
</quote-container>

### 2.4 userAppend
You can call `userAppend` to add user properties of array type.
```lua
local equips = {}
equips[1] = "weapon"
equips[2] = "hat"
local userAppendProperties = {}
userAppendProperties["equips"] = equips
userAppendProperties["#time"] = os.date("%Y-%m-%d %H:%M:%S")
sdk:userAppend("accountId", "distinctId", userAppendProperties)

equips = {}
equips[1] = "clothes"
userAppendProperties = {}
userAppendProperties["equips"] = equips
userAppendProperties["#time"] = os.date("%Y-%m-%d %H:%M:%S")
sdk:userAppend("accountId", "distinctId", userAppendProperties)
```

### 2.5 userUniqueAppend
You can delete duplicated user property by calling `userUniqueAppend` API. If you call `userAppend` API, duplicated user property might not be deleted.
```lua
local profiles_append = {}
profiles_append["append"] = { "test_append" }
sdk:userAppend("accountId", "distinctId", profiles_append)

local profiles_uniq_append = {}
profiles_uniq_append["append"] = {"test_append", "test_append1"}
sdk:userUniqueAppend("accountId", "distinctId", profiles_uniq_append)
```

### 2.6 userUnset
When you need to clear the user properties of users, you can call `userUnset` to clear specific properties. `userUnset` would not create properties that have not been created in the cluster.
```lua
local userUnsetProperties = {}
userUnsetProperties[1] = "total_revenue"
userUnsetProperties[2] = "equips"
sdk:userUnset("accountId", "distinctId", userUnsetProperties)
```

### 2.7 userDel
You can call `userDel` to delete a user. After deleting the user, you would no longer be able to inquire about its user property, but could still query the events triggered by the user.
```lua
sdk:userDel("accountId", "distinctId")
```


## **Other**
### 3.1 BatchConsumer
::: warning Notice
When the amount of data is too large or the network is abnormal, there is a risk of data loss. And it is not recommended to use it in a production environment
:::
Batches transmit data to the TE in real time, without the need for a transmission tool. 
```lua
local tdAnalytics = require "ThinkingDataSdk"
local consumer = tdAnalytics.TDBatchConsumer("SERVER_URL", "APP_ID")
local sdk = tdAnalytics(consumer)
```

Instruction on parameters:
- `APPID`: The APPID of your project, which can be found on the project management page of  TE.
- `SERVER_URL`: 
  - If you are using a SaaS version, please check the receiver URL on this page
<image token="SRnqbFUV7oXEGExbPWOcLjdNnlh" width="1674" height="1318" align="center"/>

- If you use the private deployment version, you can customize the data tracking URL .
