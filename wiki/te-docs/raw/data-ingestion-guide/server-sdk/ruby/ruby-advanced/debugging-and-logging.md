---
code: ruby_sdk_debug
name: "Debugging and Logging"
wikiToken: VpzSwR4BZiAigmkidffcx4n0nHc
parentWikiToken: CKuawiPqPi1o3pkdExtc3VB7nsn
updateTime: 1774249288000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=ruby_sdk_debug
---

::: warning Notice
The SDK Debug mode is used only for access debugging. Do not apply it to the production environment.
:::
During the process of SDK Integration, you can perform real-time debugging by checking SDK logs in the IDE console or using the Debug function of TE.
## Logging
```python
ThinkingData::set_enable_log(true)
```

## Debugging
You need to follow the following two steps to enable the Debug mode:
#### 2.1 Use DebugConsumer
The sample code for enabling the Debug mode on the client side is as follows:
```python
consumer = ThinkingData::TDDebugConsumer.new('SERVER_URL', 'APPID', device_id: "123456789")
te = ThinkingData::TDAnalytics.new(consumer)

DEMO_ACCOUNT_ID = '123'
DEMO_DISTINCT_ID = 'aaa'

properties = {
  array: ["str1", "11", Time.now, "2020-02-11 17:02:52.415"],
  prop_date: Time.now,
  prop_double: 134.1,
  prop_string: 'hello world',
  prop_bool: true,
}

ta.track(event_name: 'test_event', distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties: properties)
```

#### 2.2 Add Device
To avoid launching the Debug mode in the production environment, it is required that only specified device can enable Debug mode.  The Debug mode can only be enabled for devices whose ID has been configured in the "Debug data" sector on the "tracking management" page of the TE.
<image token="WsAdb3pD5ohbjIxmizDcJO5onIg" width="1280" height="590" align="center"/>

<quote-container>
It can only be used for data verification at the integration stage, and should not be used in the online environment.
</quote-container>
