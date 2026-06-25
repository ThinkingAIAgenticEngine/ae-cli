---
code: nodejs_sdk_installation
name: "Node.js"
wikiToken: OoIKwLEiNiPgzhksi3xcUBEknbb
parentWikiToken: IKVPwn4NfiIhijk5EcAcMf6pn7e
updateTime: 1774252010000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=nodejs_sdk_installation
---

::: tip
Before you begin, please read [<text color="purple" underline="true">Preparation before Data Ingestion</text>](https://thinkingdata.feishu.cn/wiki/OhD8we9iai6Xk5kM1QNc8ITRnQe).
 :::
**Latest version: **1.5.0
**Update time:** 2024-03-26
**Resource download: **[**Source Code**](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Fnode-sdk)
## **SDK**** Integration**
1.1 Please use `npm` to get the Node.js SDK:
```shell
# install SDK
npm install thinkingdata-node --save

# update SDK
npm i thinkingdata-node@{version}
```

1.2 Logbus Integration
We recommend using SDK+LogBus to track and report data on server. You can refer to the following documents to complete the installation of Logbus:[ LogBus User Guide](https://thinkingdata.feishu.cn/wiki/SlE6wOEK3isQvukzEbnc5V0inNa)
## **Initialization**
The following is the sample code for SDK initialization:
```javascript
const ThinkingData = require('thinkingdata-node');

let teSDK = ThinkingData.initWithLoggingMode('LOG_DIRECTORY', {
    filePrefix: 'test',
    rotateHourly: true
});
```

`LOG_DIRECTORY` is the local folder path.
## **Common Features**
In order to ensure that the distinct ID and account ID can be bound smoothly, if your game uses the distinct ID and account ID, we strongly recommend that you upload these two IDs at the same time, otherwise the account will not match, causing users to double count. For specific ID binding rules, please refer to the chapter on [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc).
### 3.1 **Sending Events**
 You can call `track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
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

- Key is the name of the property and refers to the string type. It must start with a character, and contain numbers, characters (insensitive to case, and upper cases would be transformed into lower cases by TE) and underscores "_", with a maximum length of 50 characters. 
- Value, the value of the property, supports string, numbers, Boolean, time, object, array object, and array
<quote-container>
**The requirements for event properties and user properties are the same as that for super properties**
</quote-container>

### 3.2** User Properties**
You can set general user properties by calling `userSet` API. The original properties would be replaced by the properties uploaded via this API. If no user properties are set before, user properties will be newly created. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here: 
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

### 3.3 Reported data
When `TDLoggingConsumer` is used, the SDK will write the collected data to disk in real time.
### 3.4 Close  SDK
```javascript
teSDK.Close()
```

<quote-container>
Close and exit the SDK. Please call this api before closing the server to avoid data loss in the cache
</quote-container>

## **Best Practice**
The following sample code covers all the above-mentioned operations. It is recommended that the codes be used in the following steps:
```javascript
var teSDK = ThinkingData.initWithLoggingMode('LOG_DIRECTORY');
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
