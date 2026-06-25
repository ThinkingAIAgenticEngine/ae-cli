---
code: python_sdk_debug
name: "Debugging and Logging"
wikiToken: A9VMwEVbTita7OkZ5TYczfF4nvh
parentWikiToken: XX8ZwpG3ziIdr2kuJ3Vcx7m7n7b
updateTime: 1774249278000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=python_sdk_debug
---
::: warning Notice
The SDK Debug mode is used only for access debugging. Do not apply it to the production environment.
:::
During the process of SDK Integration, you can perform real-time debugging by checking SDK logs in the IDE console or using the Debug function of TE.
## Logging
```python
TDAnalytics.enableLog(isPrint=True)
```

## Debugging
You need to follow the following two steps to enable the Debug mode:
#### 2.1 Use DebugConsumer
The sample code for enabling the Debug mode on the client side is as follows:
```python
te = TDAnalytics(TDDebugConsumer("https://receiver-ta-demo.thinkingdata.cn", "appId", device_id="123456789"))
distinct_id = "ABD"
account_id = "11111"
try:
    te.track(account_id=account_id, event_name='event_name', properties={'level': 0})
except Exception as e:
    print(e)
```

#### 2.2 Add Device
To avoid launching the Debug mode in the production environment, it is required that only specified device can enable Debug mode.  The Debug mode can only be enabled for devices whose ID has been configured in the "Debug data" sector on the "tracking management" page of the TE.
<image token="Drhnbw8E4ohg5uxXU1JcrdBlnHf" width="1280" height="590" align="center"/>

<quote-container>
It can only be used for data verification at the integration stage, and should not be used in the online environment.
</quote-container>


