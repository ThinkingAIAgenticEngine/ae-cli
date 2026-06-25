---
code: nodejs_sdk_advanced
name: "Node.js-Advanced"
wikiToken: TZi3wWAOjiiSVckre7pcfTeknbg
parentWikiToken: OoIKwLEiNiPgzhksi3xcUBEknbb
updateTime: 1774249266000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=nodejs_sdk_advanced
---

## **Sending Events**
After SDK is initialized, you can track user behaviour data. In general, ordinary events could meet business requirements. You can also use the First/Updatable Event based on your own business requirements.
### 1.1 **Ordinary Events**
 You can call `track` to upload events. It is suggested that you set event properties  based on the document about data tracking drafted previously. Procurement of a commodity by a user is taken as the example here:
```javascript
let trackEvent = {
    accountId: '2222',
    distinctId: '1111',
    event: 'test_event',
    time: new Date(),
    ip: '202.38.64.1',
    properties: {
        prop_double: 134.1,
    },
    callback(e) {
        if (e) {
            console.log(e);
        }
    }
};

teSDK.track(trackEvent)
```

### 1.2 **First Events**
The First Events refers to events that would only be recorded once for the ID of a certain device or other dimensions.   For example, under certain scenarios, you may want to record the activation event on a certain device.   In this case, you can perform data tracking with the First Event.
If you want to judge whether an event is the First Event from other dimensions, you can define a first_check_id for the First Event:
```javascript
let trackFirstEvent = {
    accountId: '2222',
    distinctId: '1111',
    event: 'test_event',
    firstCheckId: 'first_check_id',
    time: new Date(),
    properties: {
        prop_date: new Date(),
        prop_double: 134.1,
        prop_string: 'hello world',
        prop_int: 67,
    },
    callback(e) {
        if (e) {
            console.log(e);
        }
    }
};

teSDK.trackFirst(trackFirstEvent);
```

<quote-container>
Note: Since the server has to check whether the event is the First Event, the First Event will be put in storage one hour later by default.
</quote-container>

### 1.3 ** Updatable Events**
You can meet the requirements for event data modification under specific scenarios through Updatable Event. The TE would determine the data to be updated according to the event name and event ID.
```javascript
let trackUpdateEvent = {
    accountId: '2222',
    distinctId: '1111',
    event: 'test_event',
    eventId: 'event_id',
    time: new Date(),
    properties: {
        prop_date: new Date(),
        prop_double: 134.1,
        prop_string: 'hello world',
        prop_int: 67,
    },
    callback(e) {
        if (e) {
            console.log(e);
        }
    }
};

teSDK.trackUpdate(trackUpdateEvent);
```

### 1.4 **Overwritable Event****s**
Despite the similarity with Updatable Event, Overwritable Event would cover all historical data with the latest data. Looking from the perspective of effect, such a process is equivalent to the behavior of deleting the previous data while putting the latest data in storage. The TE would determine the data to be updated according to the event name and event ID.
```javascript
let trackOverwriteEvent = {
    accountId: '2222',
    distinctId: '1111',
    event: 'test_event',
    eventId: 'event_id',
    time: new Date(),
    properties: {
        prop_date: new Date(),
        prop_double: 134.1,
        prop_string: 'hello world',
        prop_int: 67,
    },
    callback(e) {
        if (e) {
            console.log(e);
        }
    }
};

teSDK.trackOverWrite(trackOverwriteEvent);
```

## **User Properties**
User property setting APIs supported by the TE  include: `userSet`, `userSetOnce`, `userAdd`, `userAppend`, `userUniqAppend`, `userUnset`, `userDel`.
### 2.1 userSet
You can call `userSet` to set general user properties. The original properties would be replaced if the properties uploaded via the API are used. If  user properties are not set before, user properties will be created. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here:
```javascript
let userSetData = {
    accountId: 'node_test',
    properties: {
        prop_date: new Date(),
        prop_double: 134.12,
        prop_string: 'hello',
        prop_int: 666,
        prop_array: ['str1', 'str2'],
    },
    callback(e) {
        if (e) {
            console.log(e);
        }
    }
};

teSDK.userSet(userSetData);
```

### 2.2 userSetOnce
If the user property you want to upload only needs to be set once, you can call `userSetOnce` to set the property. If such property had been set before, this message would be ignored. Let's take the setting of the first payment time as an example:：
```javascript
teSDK.userSetOnce({
    accountId: 'node_test',
    properties: {
        setOnceProperty: "set_once",
    }
});
```

### 2.3 userAdd
When you want to upload numeric property for cumulative operation, you can call `userAdd`.
If the property has not been set, it would be given a value of 0 before computing. A negative value could be uploaded, which is equivalent to subtraction operation. Let's take the accumulative payment amount as an example:
```javascript
teSDK.userAdd({
    accountId: 'node_test',
    properties: {
        prop_double: 0.6,
        prop_int: 222,
    }
});
```

<quote-container>
The property key is a string, and the value is only allowed to be a numeric value.
</quote-container>

### 2.4 userAppend
You can call `userAppend` to add user properties of array type.
```javascript
teSDK.userAppend({
    accountId: 'node_test',
    properties: {
        prop_array: ['str3', 'str4']
    }
});
```

### 2.5 userUniqAppend
You can delete duplicated user property by calling `userUniqAppend` API. If you call `userAppend` API, duplicated user property might not be deleted.
```javascript
teSDK.userUniqAppend({
    accountId: 'node_test',
    properties: {
        prop_array: ['str3', 'str4']
    }
});
```

### 2.6 userUnset
When you need to clear the user properties of users, you can call `userUnset` to clear specific properties. `userUnset` would not create properties that have not been created in the cluster.
```javascript
teSDK.userUnset({
    accountId: 'node_test',
    property: 'set_once_property'
});
```

### 2.7 userDel
You can call `userDel` to delete a user. After deleting the user, you would no longer be able to inquire about its user property, but could still query the events triggered by the user.
```javascript
teSDK.userDel({
  accountId: "node_test",
  distinctId: "node_distinct_id"
});
```

## **Other**
### 3.1 BatchConsumer
::: warning Notice
When the amount of data is too large or the network is abnormal, there is a risk of data loss. And it is not recommended to use it in a production environment
:::
Batches transmit data to the TE in real time, without the need for a transmission tool. 
```javascript
let teSDK = ThinkingData.initWithBatchMode('APP_ID', 'SERVER_URL', {
    batchSize: 2,
    compress: false // enable compress or not, default true
});
```

Instruction on parameters:
- `APPID`: The APPID of your project, which can be found on the project management page of  TE.
- `SERVER_URL`: 
  - If you are using a SaaS version, please check the receiver URL on this page
<image token="LgHWb0IVPoYRwXxhux6ci6tLnTb" width="1674" height="1318" align="center"/>

- If you use the private deployment version, you can customize the data tracking URL .
