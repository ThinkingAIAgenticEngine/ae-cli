---
code: nodejs_sdk_debug
name: "Debugging and Logging"
wikiToken: L75awACCVi9kCDksvh7clOMUnxe
parentWikiToken: TZi3wWAOjiiSVckre7pcfTeknbg
updateTime: 1774249268000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=nodejs_sdk_debug
---
::: warning Notice
The SDK Debug mode is used only for access debugging. Do not apply it to the production environment.
:::
During the process of SDK Integration, you can perform real-time debugging by checking SDK logs in the IDE console or using the Debug function of TE.
## Logging
```javascript
ThinkingData.enableLog(true);
```

## Debugging
You need to follow the following two steps to enable the Debug mode:
#### 2.1 Use DebugConsumer
The sample code for enabling the Debug mode on the client side is as follows:
```javascript
// DebugConsumer: Data is reported one by one. When a problem occurs, the user will be prompted with logs and exceptions;
// it is not recommended to use it in an online environment
// The third parameter identifies whether to enter the warehouse, true indicates the warehouse, and false indicates not to enter the warehouse
let teSDK = ThinkingData.initWithDebugMode('appId', 'serverUrl', {
    dryRun: false, // report data to TE or not
    deviceId: "123456789"
});

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

#### 2.2 Add Device
To avoid launching the Debug mode in the production environment, it is required that only specified device can enable Debug mode.  The Debug mode can only be enabled for devices whose ID has been configured in the "Debug data" sector on the "tracking management" page of the TE.

<quote-container>
It can only be used for data verification at the integration stage, and should not be used in the online environment.
</quote-container>
