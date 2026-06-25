---
code: corona_sdk_advanced
name: "Corona-Advanced"
wikiToken: VgpBwhQ5aiThtUklu2Gc60vnngg
parentWikiToken: QjOXwKuZFiw4JLk477Fcuzmnnnb
updateTime: 1774251985000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=corona_sdk_advanced
---

## **1. Managing User Identity**
SDK instances would use random UUID as the default distinct ID of each user by default, which would be used as the identity identification ID of users under an unlogged-in state. It should be noted that the distinct ID would change after the user reinstalled the App or use the APP with a new device.
### **1.1. Identify**
::: tip
Generally speaking, you do not need to customize a distinct ID. Please ensure that you understand [<text underline="true">User Identification Rules</text>](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc)<text color="purple" underline="true"> </text>before setting a distinct ID. 
If you need to change the distinct ID, please call the api immediately after SDK is initialized. To avoid the generation of useless accounts, please do not call such a process multiple times.
:::
If your App has its own distinct ID management system for each user, you can call `setDistinctId` to set the distinct ID:
```lua
-- set distinct ID as Thinker
TDAnalytics.setDistinctId("Thinker");
```

If you need to obtain the current distinct ID, please call `getDistinctId`:
```lua
-- returns distinct ID
TDAnalytics.getDistinctId( function (ret)
    print( "distinctId = " .. ret )
end )
```

### **1.2 Login**
When the users  log in, `login` could be called to set the account ID of the user. TE  would use the account ID as the identity identification ID, and the account ID that has been set would be saved before `logout` is called. The previous account ID would be replaced if `login` has been called multiple times.
```lua
-- The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TE
TDAnalytics.login("TE");
```

<quote-container>
Note: Login events wouldn't be uploaded in this method.
</quote-container>

### **1.3 Removing Account ID**
After the user logs out, `logout` could be called to remove the account ID. The distinct ID would be used as the identity identification ID before the next time `login` is called. 
```lua
TDAnalytics.logout();
```

It is recommended that you call logout upon explicit logout event. For example, call `logout` when the user commits the behavior of canceling an account; do not call such a process when the App is closed.
<quote-container>
**Logout events wouldn't be uploaded in this method.**
</quote-container>

## **2. Sending Events**
After SDK is initialized, you can track users behaviour data. In general, ordinary events could meet business requirements. You can also use the First/Updatable Event based on your own service scenario.
### **2.1 Ordinary Events**
 You can call `track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```lua
local properties = { product_name="product name"}
TDAnalytics.track("product_buy", properties)
```

### **2.2 First Events**
The First Events refers to events that would only be recorded once for the ID of a certain device or other dimensions. For example, under certain scenarios, you may want to record the activation event on a certain device. In this case, you can perform data tracking with the First Event.
```lua
TDAnalytics.trackFirst("device_activation", {test_string="first_string"})
```

If you want to judge whether an event is the First Event from other dimensions, you can define a first_check_id for the First Event:
```lua
-- set the user ID as the first_check_id of the first event to track the first initialization event of the user.
TDAnalytics.trackFirst("account_activation", {test_string="first_string"} , "TA")
```

<quote-container>
Note: Since the server has to check whether the event is the First Event, the First Event will be put in storage one hour later by default.
</quote-container>

### **2.3 Updatable Events**
You can meet the requirements for event data modification under specific scenarios through Updatable Events. The ID of Updatable Events should be specified and uploaded when the objects of Updatable Events are created. TE would determine the data to be updated according to the event name and event ID.
```lua
-- The event property status is 3 after reporting, with the price being 100
TDAnalytics.trackUpdate("UPDATABLE_EVENT", {
    status = 3,
    price = 100
}, "Update_EventId")

-- The event property status is 5 after reporting, with the price remaining the same
TDAnalytics.trackUpdate("UPDATABLE_EVENT", {
    status = 5
}, "Update_EventId")
```

### **2.4 Overwritable Events**
Despite the similarity with Updatable Events, Overwritable Events would replace all historical data with the latest data. Looking from the perspective of effect, such a process is equivalent to the behavior of deleting the previous data while putting the latest data in storage. TE would determine the data to be updated according to the event name and event ID.
```lua
-- The event property status is 3 after reporting, with the price being 100
TDAnalytics.trackOverwrite("OVERWRITABLE_EVENT", {
    status = 3,
    price = 100
}, "Overwrite_EventId")

-- The event property status is 5 after reporting, with the price deleted
TDAnalytics.trackOverwrite("OVERWRITABLE_EVENT", {
    status = 5
}, "Overwrite_EventId")
```

### **2.5 Super Properties**
Super properties refer to properties that would be uploaded by each event. Super properties could be divided into `static super properties` and `dynamic super properties`based on the update frequency. You can select different methods for super property setting according to business requirements; we recommend that you set super properties first before sending events. In the same event, when the keys of super properties, self-defined event properties, and preset properties are the same, we would assign value according to the following priority:  `self-defined properties>static super properties>preset properties`.
#### **2.5.1 Static Super Properties**
Static super properties are properties that all events might have and would change with a low frequency, for example, the user membership class. After setting static super properties through `setSuperProperties`, SDK would use the preset super properties as the event properties when tracking events.
```lua
-- set super properties
TDAnalytics.setSuperProperties({vip_level = 2})
```

Static super properties would be saved in local storage, and should not be called every time the App is closed. If such properties already exist, the reset properties would replace the original properties. If such properties do not exist, properties would be newly created. In addition to property setting, we also provide other APIs to set and manage static super properties and meet general business requirements.
```lua
-- clear a super property named 'Channel'
TDAnalytics.unsetSuperProperties("Channel")
-- clear all super properties
TDAnalytics.clearSuperProperties()
-- get all super properties
TDAnalytics.getSuperProperties( function (ret)
    local superProperties = ret
    print( "current superProperties = " .. superProperties )
end )
```

### **2.6 Timing Events**
If you need to record the duration of a certain event, you can call `timeEvent` . Configure the name of the event you want to record. When you upload the event, `#duration` would be added to your event property automatically to record the duration of the event (unit: second). It should be noted that only one task can be timed with the same event name.
```lua
-- The following instance has recorded the time the user spent on a certain product page
-- The user enters the product page and starts the timing
TDAnalytics.timeEvent("stay_shop")
-- do some thing...
-- the timing would end when the user leaves the product page. "stay_shop" event would carry#duration, a property representing event duration. 
TDAnalytics.track("stay_shop", {})
```

## **3. User Properties**
User property setting APIs supported by TE  include: `userSet`,  `userSetOnce`, `userAdd`, `userUnset`, `userDelete`, `userAppend` .
### **3.1 UserSet**
You can call `userSet` to set general user properties. The original properties would be replaced if the properties uploaded via the API are used. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here:
```lua
-- current username is TA
TDAnalytics.userSet({user_name = "TA"})
-- current username is TE
TDAnalytics.userSet({user_name = "TE"})
```

### **3.2 UserSetOnce**
If the user property you want to upload only needs to be set once, you can call `userSetOnce` to set the property. If such property had been set before, this message would be neglected. Let's take the setting of the first payment time as an example:
```lua
--first_payment_time is '2018-01-01 01:23:45.678'
TDAnalytics.userSetOnce({first_payment_time = "2018-01-01 01:23:45.678"})
-- first_payment_time is '2018-01-01 01:23:45.678' as before
TDAnalytics.userSetOnce({first_payment_time = "2018-12-31 01:23:45.678"})
```

### **3.3 UserAdd**
When you want to upload numeric attributes for cumulative operation, you can call `userAdd`.
If the property has not been set, it would be given a value of 0 before computing. A negative value could be uploaded, which is equivalent to subtraction operation. Let's take the accumulative payment amount as an example:
```lua
-- current total_revenue is 30
TDAnalytics.userAdd({total_revenue = 30})
-- current total_revenue is 678
TDAnalytics.userAdd({total_revenue = 648})
```

<quote-container>
The property key is a string, and the Value is only allowed to be a numeric value.
</quote-container>

### **3.4 UserUnset**
When you need to clear the user properties of users, you can call `userUnset` to clear specific properties.  `userUnset` would not create properties that have not been created in the cluster.
```lua
-- remove a user property named 'age'
TDAnalytics.userUnset("age")
```

### **3.5 UserDelete**
You can call `userDelete` to delete a user. After deleting the user, you would no longer be able to inquire about its user property, but could still query the events data triggered by the user.
```lua
-- remove all user properties
TDAnalytics.userDelete()
```

### **3.6 UserAppend**
You can call `userAppend` to add user properties of array type.
```lua
-- append user properties with array
TDAnalytics.userAppend({user_list = {"apple", "ball"}})
```

## **4. Other**
### **4.1  ****Device ID**
You can call `getDeviceId` to obtain the device ID:
```lua
-- get device ID
TDAnalytics.getDeviceId( function (ret)
    print( "deviceId = " .. ret )
end )
```
