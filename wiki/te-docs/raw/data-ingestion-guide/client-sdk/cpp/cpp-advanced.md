---
code: c++_sdk_advanced
name: "Cpp-Advanced"
wikiToken: TBTtw1Tr4iCeZhk24otcOIK6nVf
parentWikiToken: COFfwkFwFiK0qMkfjJNc7DcMnLc
updateTime: 1774251998000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=c%2B%2B_sdk_advanced
---

## 1**. Managing User Identity**
SDK instances would use random UUID as the default distinct ID of each user by default, which would be used as the identity identification ID of users under an unlogged-in state. It should be noted that the distinct ID would change after the user reinstalled the APP or use the APP with a new device.
### **1.1. Identify**
::: tip
Generally speaking, you do not need to customize a distinct ID. Please ensure that you understand [<text underline="true">User Identification Rules</text>](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc)<text color="purple" underline="true"> </text>before setting a distinct ID. 
If you need to change the distinct ID, please call the API immediately after SDK is initialized. To avoid the generation of useless accounts, please do not call such a process multiple times.
:::
If your APP has its own distinct ID management system for each user, you can call `Identify` to set the distinct ID:
```cpp
// set distinct ID as Thinker
ThinkingAnalyticsAPI::Identify("Thinker");
```

If you need to get the current distinct ID, please call `DistinctID()`:
```cpp
// Return distinct ID
ThinkingAnalyticsAPI::DistinctID().c_str()
```

### **1.2 Login**
When the users  log in, `Login` could be called to set the account ID of the user. TE  would use the account ID as the identity identification ID, and the account ID that has been set would be saved before `LogOut` is called. The previous account ID would be replaced if `Login` has been called multiple times. 
```cpp
// The login unique identifier of the user, corresponding to the #account_id in data tracking. #Account_id now is TE
ThinkingAnalyticsAPI::Login("TE");
```

<quote-container>
**Login events wouldn't be uploaded in this method.**
</quote-container>

### **1.3 Removing Account ID**
After the user logs out, `LogOut` could be called to remove the account ID. The distinct ID would be used as the identity identification ID before the next time `Login` is called. 
```cpp
ThinkingAnalyticsAPI::LogOut();
```

It is recommended that you call logout upon explicit logout event. For example, call `logout` when the user commits the behavior of canceling an account; do not call such a process when the APP is closed.
<quote-container>
**Logout events wouldn't be uploaded in this method.**
</quote-container>

## **Sending Events**
After SDK is initialized, you can track user behaviour data. In general, ordinary events could meet business requirements. You can also use the First/Updatable Event based on your own business requirements.
### **2.1 Ordinary Events**
 You can call `Track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```cpp
TDJSONObject event_properties;
event_properties.SetString("product_name", "product name");
ThinkingAnalyticsAPI::Track("product_buy", event_properties);
```

###  **2.2 First Events**
The First Events refers to events that would only be recorded once for the ID of a certain device or other dimensions. For example, under certain scenarios, you may want to record the activation event on a certain device. In this case, you can perform data tracking with the First Event.
```cpp
TDJSONObject jsonObject1;
jsonObject1.SetString("test","test");
TDFirstEvent *firstEvent = new TDFirstEvent("device_activation",jsonObject1);
ThinkingAnalyticsAPI::Track(firstEvent);
```

If you want to judge whether an event is the First Event from other dimensions, you can define a first_check_id for the First Event:
```cpp
//set the user ID as the first_check_id of the first event to track the first initialization event of the user.
TDJSONObject jsonObject1;
jsonObject1.SetString("test","test");
TDFirstEvent *firstEvent = new TDFirstEvent("account_activation",jsonObject1);
firstEvent->setFirstCheckId("TE");
ThinkingAnalyticsAPI::Track(firstEvent);
```

<quote-container>
Note: Since the server has to check whether the event is the First Event, First Event event will be put in storage one hour later by default.
</quote-container>

### **2.3 Updatable Events**
You can meet the requirements for event data modification under specific scenarios through Updatable Events. The ID of Updatable Events should be specified and uploaded when the objects of Updatable Events are created. TE would determine the data to be updated according to the event name and event ID.
```cpp
 //The event property status is 3 after reporting, with the price being 100
TDJSONObject jsonObject;
jsonObject.SetNumber("status", 3);
jsonObject.SetNumber("price", 100);
TDUpdatableEvent *updatableEvent = new TDUpdatableEvent("UPDATABLE_EVENT",jsonObject,"test_event_id");
ThinkingAnalyticsAPI::Track(updatableEvent);

//The event property status is 5 after reporting, with the price remaining the same
TDJSONObject jsonObject1;
jsonObject1.SetNumber("status", 5);
TDUpdatableEvent *updatableEvent1 = new TDUpdatableEvent("UPDATABLE_EVENT",jsonObject1,"test_event_id");
ThinkingAnalyticsAPI::Track(updatableEvent1);
```

### **2.4 Overwritable Events**
Despite the similarity with Updatable Events, Overwritable Events would replace all historical data with the latest data. Looking from the perspective of effect, such a process is equivalent to the behavior of deleting the previous data while putting the latest data in storage. TE would determine the data to be updated according to the event name and event ID.
```cpp
// Instance: Assume the event name is OVERWRITE_EVENT when reporting an overwritable event
//The event property status is 3 after reporting, with the price being 100
TDJSONObject jsonObject;
jsonObject.SetNumber("status", 3);
jsonObject.SetNumber("price", 100);
TDOverWritableEvent *event = new TDOverWritableEvent("OVERWRITE_EVENT",jsonObject,"test_event_id");
ThinkingAnalyticsAPI::Track(event);

//The event property status is 5 after reporting, with the price deleted
TDJSONObject jsonObject1;
jsonObject1.SetNumber("status", 5);
TDOverWritableEvent *event1 = new TDOverWritableEvent("OVERWRITE_EVENT",jsonObject1,"test_event_id");
ThinkingAnalyticsAPI::Track(event1);
```

## **3. User Properties**
User property setting APIs supported by TE  include: `UserSet`,`UserSetOnce`,`UserAdd`,`UserUnset`,`UserDelete`,`UserAppend`.
### 3.1 UserSet
You can call `UserSet` to set general user properties. The original properties would be replaced if the properties uploaded via the API are used. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here:
```cpp
TDJSONObject userProperties;
//the username now is TA
userProperties.SetString("username", "TA");
ThinkingAnalyticsAPI::UserSet(userProperties);
//the userName now is TE
TDJSONObject userProperties1;
userProperties1.SetString("username", "TE");
ThinkingAnalyticsAPI::UserSet(userProperties1)
```

### 3.2 UserSetOnce
If the user property you want to upload only needs to be set once, you can call `UserSetOnce` to set the property. If such property had been set before, this message would be ignored. Let's take the setting of the first payment time as an example:
```cpp
//first_payment_time is 2018-01-01 01:23:45.678
TDJSONObject userProperties;
userProperties.SetString("first_payment_time","2018-01-01 01:23:45.678");
ThinkingAnalyticsAPI::UserSetOnce(userProperties);

//first_payment_time is still 2018-01-01 01:23:45.678
TDJSONObject userProperties1;
userProperties1.SetString("first_pay_time","2018-12-31 01:23:45.678");
ThinkingAnalyticsAPI::UserSetOnce(userProperties1);
```

###  3.3 UserAdd
When you want to upload numeric property for cumulative operation, you can call `UserAdd`.
If the property has not been set, it would be given a value of 0 before computing. A negative value could be uploaded, which is equivalent to subtraction operation. Let's take the accumulative payment amount as an example:
```cpp
//in this case, the total_revenue is 30
TDJSONObject userProperties;
userProperties.SetNumber("total_revenue",30;
ThinkingAnalyticsAPI::UserAdd(userProperties);
//in this case, the total_revenue is 678
TDJSONObject userProperties1;
userProperties1.SetNumber("total_revenue",648);
ThinkingAnalyticsAPI::UserAdd(userProperties1);
```

<quote-container>
The set property key is a string, and the value is only allowed to be a numeric value.
</quote-container>

### 3.4 UserUnset
When you need to clear the user properties of users, you can call `UserUnset` to clear specific properties.  `UserUnset` would not create properties that have not been created in the cluster.
```cpp
ThinkingAnalyticsAPI::UserUnset("userUnset_key");
```

### 3.5 UserDelete
You can call `UserDelete` to delete a user. After deleting the user, you would no longer be able to inquire about its user property, but could still query the events data triggered by the user.
```cpp
ThinkingAnalyticsAPI::UserDelete();
```

### 3.6 UserAppend
You can call `U``ser``A``ppend` to add user properties of array type.
```cpp
TDJSONObject userProperties;
vector<string> listValue;
listValue.push_back("apple");
listValue.push_back("ball");
userProperties.SetList("user_list",listValue);
ThinkingAnalyticsAPI::UserAppend(userProperties);
```

### 3.7 UserUniAppend
You can call UserUniqAppend to append user attributes of array type. Calling the UserUniqAppend interface will deduplicate the appended user attributes. The UserAppend interface does not deduplicate, and user attributes may be duplicated.
```cpp
//user_list value is ["apple"，"ball"]
TDJSONObject userProperties1;
vector<string> listValue1;
listValue1.push_back("apple");
listValue1.push_back("ball");
userProperties1.SetList("user_list",listValue1);
ThinkingAnalyticsAPI::UserAppend(userProperties1);

//user_list value is ["apple","apple","ball","cube"]
TDJSONObject userProperties2;
vector<string> listValue1;
listValue2.push_back("apple");
listValue2.push_back("cube");
userProperties2.SetList("user_list",listValue2);
ThinkingAnalyticsAPI::UserAppend(userProperties2);

//user_list value is ["apple"，"ball","cube"]
ThinkingAnalyticsAPI::UserUniqAppend(userProperties2);

```

## Others
### **4.1 Printing Log**
During the process of SDK integration, you can perform real-time debugging by checking SDK's logs in the IDE console or using the Debug feature of TE.
```cpp
ThinkingAnalyticsAPI::EnableLog(true);
```

### **4.2** **Preset Properties of All Events**

<lark-table rows="10" cols="4" column-widths="169,152,140,259">

  <lark-tr>
    <lark-td>
      ** Property name **
    </lark-td>
    <lark-td>
      **Display name **
    </lark-td>
    <lark-td>
      ** Property type **
    </lark-td>
    <lark-td>
      ** Instruction **
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #ip
    </lark-td>
    <lark-td>
      IP address
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      IP address of the user, based on which TE would get the geographical location of the user
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #country
    </lark-td>
    <lark-td>
      Country
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The country where the user is located; generated based on the IP address
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #country_code
    </lark-td>
    <lark-td>
      Country code
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The code of the country where the user is located (ISO 3166-1 alpha-2, two English characters in upper case); generated based on the IP address
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #province
    </lark-td>
    <lark-td>
      Province
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The province or state where the user is located; generated based on the IP address
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #city
    </lark-td>
    <lark-td>
      City
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The city where the user is located; generated based on the IP address
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #os
    </lark-td>
    <lark-td>
      OS
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      E.g., Android, iOS, Mac OS, etc.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #device_id
    </lark-td>
    <lark-td>
      Device ID
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The ID of the user device; IDFV or UUID of the user for iOS; androidID for Android
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #lib
    </lark-td>
    <lark-td>
      SDK type
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The type of the SDK to which you integrate, e.g., Android，iOS, etc.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      #lib_version
    </lark-td>
    <lark-td>
      SDK version
    </lark-td>
    <lark-td>
      Text
    </lark-td>
    <lark-td>
      The version of the SDK to which you integrate
    </lark-td>
  </lark-tr>
</lark-table>

### 
