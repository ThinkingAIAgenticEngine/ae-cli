---
code: ruby_sdk_installation
name: "Ruby"
wikiToken: S8vpwcvIxiPflykjVPScH7dTnyd
parentWikiToken: IKVPwn4NfiIhijk5EcAcMf6pn7e
updateTime: 1780898277000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=ruby_sdk_installation
---
::: tip
Before you begin, please read [<text color="purple" underline="true">Preparation before Data Ingestion</text>](https://thinkingdata.feishu.cn/wiki/OhD8we9iai6Xk5kM1QNc8ITRnQe).
 :::
**Latest version**: v2.0.2
**Update time**: 2026-06-05
**Resource download**: [Source Code](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Fruby-sdk)
::: warning Notice 
Current documentation applies to v3.0.0 and later. For historical versions, see [Data Ingestion Guide - Ruby (V1)](https%3A%2F%2Fdocs.thinkingdata.cn%2Fta-manual%2Fv4.1%2Fen%2Finstallation%2Finstallation_menu%2Fserver_sdk%2Fruby_sdk_installation%2Fruby_sdk_installation.html) 
:::
## **SDK**** Integration**
1.1 Please use `gem` command to get the SDK package.
```shell
# install SDK
gem install thinkingdata-ruby
```

1.2 Logbus Integration
We recommend using SDK+LogBus to track and report data on server. You can refer to the following documents to complete the installation of LogBus:[ LogBus User Guide](https://thinkingdata.feishu.cn/wiki/SlE6wOEK3isQvukzEbnc5V0inNa)
## **Initialization**
The following is the sample code for SDK initialization:
```ruby
require 'thinkingdata-ruby'

consumer = ThinkingData::TDLoggerConsumer.new("LOG_DIRECTORY")
ta = ThinkingData::TDAnalytics.new(consumer)
```

`LOG_DIRECTORY` is the local folder path.
## **Common Features**
In order to ensure that the distinct ID and account ID can be bound smoothly, if your game uses the distinct ID and account ID, we strongly recommend that you upload these two IDs at the same time, otherwise the account will not match, causing users to double count. For specific ID binding rules, please refer to the chapter on [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc).
### 3.1 **Sending Events**
 You can call `track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```ruby
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

- Key is the name of the property and refers to the string type. It must start with a character, and contain numbers, characters (insensitive to case, and upper cases would be transformed into lower cases by TE) and underscores "_", with a maximum length of 50 characters. 
- Value, the value of the property, supports string, numbers, Boolean, time, object, array object, and array
<quote-container>
**The requirements for event properties and user properties are the same as that for super properties**
</quote-container>

### 3.2** User Properties**
You can set general user properties by calling `user_set` API. The original properties would be replaced by the properties uploaded via this API. If no user properties are set before, user properties will be newly created. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here: 
```ruby
DEMO_ACCOUNT_ID = '123'
DEMO_DISTINCT_ID = 'aaa'

user_data = {
  array: ["str1", 11, 22.22],
  prop_date: Time.now,
  prop_double: 134.12,
  prop_string: 'hello',
  prop_int: 666,
}
ta.user_set(distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties: user_data)
```

### 3.3 Reported data
When `TDLoggingConsumer` is used, the SDK will write the collected data to disk in real time.
### 3.4 Close  SDK
```ruby
ta.close
```

<quote-container>
Close and exit the SDK. Please call this api before closing the server to avoid data loss in the cache
</quote-container>

## **Best Practice**
The following sample code covers all the above-mentioned operations. It is recommended that the codes be used in the following steps:
```ruby
require 'thinkingdata-ruby'

ThinkingData::set_stringent(false)
ThinkingData::set_enable_log(false)

consumer = ThinkingData::TDLoggerConsumer.new( 'LOG_DIRECTORY', 'hourly')
ta = ThinkingData::TDAnalytics.new(consumer, my_error_handler, uuid: true)

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

user_data = {
  array: ["str1", 11, 22.22],
  prop_date: Time.now,
  prop_double: 134.12,
  prop_string: 'hello',
  prop_int: 666,
}
ta.user_set(distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties: user_data)

user_append_data = {
  array: %w[33 44]
}
ta.user_append(distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties: user_append_data)

user_uniq_append_data = {
  array: %w[44 55]
}
ta.user_uniq_append(distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties: user_uniq_append_data)

user_set_once_data = {
  prop_int_new: 888,
}
ta.user_set_once(distinct_id: DEMO_DISTINCT_ID, account_id: DEMO_ACCOUNT_ID, properties: user_set_once_data)

ta.user_add(distinct_id: DEMO_DISTINCT_ID, properties: {prop_int: 10, prop_double: 15.88})

ta.user_unset(distinct_id: DEMO_DISTINCT_ID, property: [:prop_string, :prop_int])

ta.user_del(distinct_id: DEMO_DISTINCT_ID)
```
