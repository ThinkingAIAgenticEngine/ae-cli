---
code: php_sdk_debug
name: "Debugging and Logging"
wikiToken: AwNYwWUD6i1vIxk2yvccxLNbn9U
parentWikiToken: G4igw6q4gieQcgkEQxRcPW5XnVb
updateTime: 1774249308000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=php_sdk_debug
---

::: warning Notice
The SDK Debug mode is used only for access debugging. Do not apply it to the production environment.
:::
During the process of SDK Integration, you can perform real-time debugging by checking SDK logs in the IDE console or using the Debug function of TE.
## Logging
```php
TDLog::$enable = true;
```

## Debugging
You need to follow the following two steps to enable the Debug mode:
#### 2.1 Use DebugConsumer
The sample code for enabling the Debug mode on the client side is as follows:
```php
try {
    $deviceId = "123";
    $debugConsumer = new TDDebugConsumer("SERVER_URL", "APP_ID", 1000, $deviceId);
    $debugConsumer->setDebugOnly(false);
    $te = new TDAnalytics($debugConsumer);
} catch (Exception $e) {
    echo $e;
}
```

#### 2.2 Add Device
To avoid launching the Debug mode in the production environment, it is required that only specified device can enable Debug mode.  The Debug mode can only be enabled for devices whose ID has been configured in the "Debug data" sector on the "tracking management" page of the TE.

<image token="TOXubQvsSoZLfoxhvIScdmMvn2g" width="1280" height="590" align="center"/>

<quote-container>
It can only be used for data verification at the integration stage, and should not be used in the online environment.
</quote-container>
