---
code: erlang_sdk_installation
name: "Erlang"
wikiToken: HCbFw6wKsiAj0Qkst6cctv3AnIf
parentWikiToken: IKVPwn4NfiIhijk5EcAcMf6pn7e
updateTime: 1774252021000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=erlang_sdk_installation
---

::: tip
Before you begin, please read [<text color="purple" underline="true">Preparation before Data Ingestion</text>](https://thinkingdata.feishu.cn/wiki/OhD8we9iai6Xk5kM1QNc8ITRnQe).
 :::
**Latest version**: v2.0.0
**Update time**: 2023-10-08
**Resource download**: [Source Code](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Ferlang-sdk)
::: warning Notice 
Current documentation applies to v2.0.0 and later. For historical versions, see [Data Ingestion Guide - Erlang (V1)](https%3A%2F%2Fdocs.thinkingdata.cn%2Fta-manual%2Fv4.1%2Fen%2Finstallation%2Finstallation_menu%2Fserver_sdk%2Ferlang_sdk_installation%2Ferlang_sdk_installation.html) 
:::
## **SDK**** Integration**
1. rebar3 is installed.
2. modify `rebar.config` file, add dependency of SDK.
```erlang
{erl_opts, [debug_info, 
    {parse_transform, lager_transform},
    {lager_extra_sinks, [ta_logger]}
]}.

{deps, [ 
    {thinkingdata_analytics, {git, "https://github.com/ThinkingDataAnalytics/erlang-sdk.git", {tag, "v2.0.0"}}}
]}.

{shell, [ 
    {config, "config/example_sys.config"},
    {apps, [app_name]}
]}.
```

<quote-container>
There is an example in the SDK directory: `example_sys.config`
</quote-container>

1. Execute command：
```shell
rebar3 compile
```

1. Modify the configuration file of your project (e.g. example_sys.config)，add a `sink` that belongs to SDK.
```erlang
[
  {lager, [
    {colored, true},
    {log_root, "./log"},
    {extra_sinks,
      [
        {ta_logger_lager_event,
          [{handlers, [
            {lager_file_backend, [
              {file, "LOG_DIRECTORY"},
              {level, info},
              {formatter, lager_default_formatter},
              {formatter_config, [message, "\n"]},
              {size, 10485760},
              {rotator, td_lager_rotator}
            ]}]},
            {async_threshold, 500},
            {async_threshold_window, 50}
          ]
        }]
    }
  ]
  }
].
```

`LOG_DIRECTORY` is the local folder path.
1. modify the configuration of your app. Add launch items of SDK in  `xxxx.app.src`.
```erlang
{application, your_name,
 [{description, "An OTP application"},
  {vsn, "0.1.0"},
  {registered, []},
  {mod, {app_name_app, []}},
  {applications,
   [kernel,
    stdlib,
    jsone,
    lager
   ]},
  {env,[]},
  {modules, []},

  {licenses, ["Apache-2.0"]},
  {links, []}
 ]}.
```

<callout emoji="bulb" background-color="light-orange" border-color="light-orange">
**Notice of Windows platform: **You need to run the app with administrator rights. Otherwise, data writing errors may occur
</callout>

5. Logbus Integration
We recommend using SDK+LogBus to track and report data on server. You can refer to the following documents to complete the installation of Logbus:[ LogBus User Guide](https://thinkingdata.feishu.cn/wiki/SlE6wOEK3isQvukzEbnc5V0inNa)
## **Initialization**
The following is the sample code for SDK initialization:
```erlang
%% A lager sink is provided by default: 'ta_logger'. You could add your own sink
Consumer = td_log_consumer:init_with_logger(fun(E) -> ta_logger:info(E) end),
%% init SDK with consumer
TE_SDK = td_analytics:init_with_consumer(Consumer),
```

## **Common Features**
In order to ensure that the distinct ID and account ID can be bound smoothly, if your game uses the distinct ID and account ID, we strongly recommend that you upload these two IDs at the same time, otherwise the account will not match, causing users to double count. For specific ID binding rules, please refer to the chapter on [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc).
### 3.1 **Sending Events**
 You can call `track_instance` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```erlang
td_analytics:track_instance(TE_SDK, "account_id_Erlang", "distinct_logbus", "ViewProduct", #{"key_1" => "🚓🦽🦼🚲🚜🚜🦽", "key_2" => 2.2, "key_array" => ["🚌", "🏍", "😚😊"]}),
```

- Key is the name of the property and refers to the string type. It must start with a character, and contain numbers, characters (insensitive to case, and upper cases would be transformed into lower cases by TE) and underscores "_", with a maximum length of 50 characters. 
- Value, the value of the property, supports string, numbers, Boolean, time, object, array object, and array
<quote-container>
**The requirements for event properties and user properties are the same as that for super properties**
</quote-container>

### 3.2 **User Properties**
You can set general user properties by calling `user_set_instance` API. The original properties would be replaced by the properties uploaded via this API. If no user properties are set before, user properties will be newly created. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here: 
```erlang
td_analytics:user_set_instance(TE_SDK, "account_id_Erlang", "distinct_id", #{"id" => 12, "key_1" => [1,1,1,1], "key_2" => ["a", "b"], "key_3" => ["中", "文"], "key_4" => ["中文", "list"], "key_5" => "中文字符串", "amount" => 7.123}),
```

### 3.3 Reported data
When `td_analytics:consumer_type_log()` is used, the SDK will write the collected data to disk in real time.
### 3.4 Close  SDK
```erlang
td_analytics:close_instance(TE_SDK),
```

<quote-container>
Close and exit the SDK. Please call this api before closing the server to avoid data loss in the cache
</quote-container>

## **Best Practice**
The following sample code covers all the above-mentioned operations. It is recommended that the codes be used in the following steps:
```erlang
%% A lager sink is provided by default: 'ta_logger'. You could add your own sink
Consumer = td_log_consumer:init_with_logger(fun(E) -> ta_logger:info(E) end),
%% init SDK with consumer
TE_SDK = td_analytics:init_with_consumer(Consumer),

%% ordinary event
td_analytics:track_instance(TE_SDK, "account_id_Erlang", "distinct_logbus", "ViewProduct", #{"key_1" => "🚓🦽🦼🚲🚜🚜🦽", "key_2" => 2.2, "key_array" => ["🚌", "🏍", "😚😊"]}),

td_analytics:close_instance(TE_SDK),
```
