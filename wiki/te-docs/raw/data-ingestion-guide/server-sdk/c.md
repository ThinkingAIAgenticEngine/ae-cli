---
code: c_sdk_installation
name: "C "
wikiToken: Er3owqC0UiRR21kCDgZcY4qJn3e
parentWikiToken: IKVPwn4NfiIhijk5EcAcMf6pn7e
updateTime: 1774252007000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=c_sdk_installation
---
::: tip 
Before you begin, please read [<text color="purple" underline="true">Preparation before Data Ingestion</text>](https://thinkingdata.feishu.cn/wiki/OhD8we9iai6Xk5kM1QNc8ITRnQe).
 :::
**Latest version: **v2.0.0
**Update time: **2023-11-30
**Resource download: **[Source Code](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Fc-sdk)
::: warning Notice 
Current documentation applies to v2.0.0 and later. For historical versions, see [Data Ingestion Guide - C (V1)](https%3A%2F%2Fdocs.thinkingdata.cn%2Fta-manual%2Fv4.1%2Fen%2Finstallation%2Finstallation_menu%2Fserver_sdk%2Fc_sdk_installation%2Fc_sdk_installation.html) 
:::
## **SDK Integration**
1.1 Download the source code,  modify the `CMakeLists.txt` file. 
e.g. Use logconsumer mode:
```bash
cmake_minimum_required(VERSION 3.12)
project(thinking_data_c)
message(STATUS "[ThinkingData] CMAKE_HOST_SYSTEM: ${CMAKE_HOST_SYSTEM} ")

include_directories(include)

#################################################################

# Product Library: logging consumer
if(WIN32)
    add_compile_definitions(USE_WIN)
    set(CMAKE_C_FLAGS "-std=c89 -pedantic-errors -m64")
else()
    add_compile_definitions(USE_POSIX)
    set(CMAKE_C_FLAGS "-std=c89")
endif()
SET(TE_LIB_NAME thinkingdata)
add_library(${TE_LIB_NAME} src/thinkingdata.c src/td_json.c src/td_list.c src/td_util.c src/td_logger_consumer.c)
if(WIN32)
    include_directories(thirdparty/pcre/include)
    link_directories(thirdparty/pcre/lib)
    target_link_libraries(${TE_LIB_NAME} pcre_x64)
endif()
```

1.2 Logbus Integration
We recommend using SDK+LogBus to track and report data on server. You can refer to the following documents to complete the installation of Logbus:[ LogBus User Guide](https://thinkingdata.feishu.cn/wiki/SlE6wOEK3isQvukzEbnc5V0inNa)
## **Initialization**
The following is the sample code for SDK initialization:
```c
struct TDAnalytics* ta = NULL;
struct TDConsumer* consumer = NULL;

TDConfig* config = td_init_config();
char* logPath = "LOG_DIRECTORY";
TD_ASSERT(TD_OK == td_add_string("file_path", logPath, strlen(logPath), config));

if (TD_OK != td_init_consumer(&consumer, config)) {
    fprintf(stderr, "Failed to initialize the consumer.");
}
td_free_properties(config);

if (TD_OK != td_init(consumer, &ta)) {
    fprintf(stderr, "Failed to initialize the SDK.");
    return 1;
}
```

`LOG_DIRECTORY` is the local folder path.
## **Common Features**
In order to ensure that the distinct ID and account ID can be bound smoothly, if your game uses the distinct ID and account ID, we strongly recommend that you upload these two IDs at the same time, otherwise the account will not match, causing users to double count. For specific ID binding rules, please refer to the chapter on [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc).
### **3.1 Sending Events**
You can call `td_track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```c
TDProperties *properties = td_init_properties();

TD_ASSERT(TD_OK == td_add_string("#ip", "192.168.1.1", strlen("192.168.1.1"), properties));

TD_ASSERT(TD_OK == td_add_string("channel", "ta", strlen("ta"), properties));
TD_ASSERT(TD_OK == td_add_int("age", 1, properties));
TD_ASSERT(TD_OK == td_add_bool("is_success", TD_TRUE, properties));
TD_ASSERT(TD_OK == td_add_date("birthday", time(NULL), 0, properties));

TD_ASSERT(TD_OK == td_append_array("arr", "value", strlen("value"), properties));
TD_ASSERT(TD_OK == td_append_array("arr", "value1", strlen("value1"), properties));

TDProperties *object = td_init_custom_properties("object");
TD_ASSERT(TD_OK == td_add_string("key", "value", strlen("value"), object));
TD_ASSERT(TD_OK == td_add_property(object, properties));

TDProperties *object1 = td_init_custom_properties("object1");
TD_ASSERT(TD_OK == td_add_string("key", "value", strlen("value"), object1));
TD_ASSERT(TD_OK == td_append_properties("object_arr", object1, properties));

TD_ASSERT(TD_OK == td_track("account_id", "distinct_id", "payment", properties, ta));
td_free_properties(properties);
```

- Key is the name of the property and refers to the string type. It must start with a character, and contain numbers, characters (insensitive to case, and upper cases would be transformed into lower cases by TE) and underscores "_", with a maximum length of 50 characters. 
- Value, the value of the property, supports string, numbers, Boolean, time, object, array object, and array
<quote-container>
**The requirements for event properties and user properties are the same as that for super properties**
</quote-container>

### 3.2** **User Properties**
You can set general user properties by calling `td_user_set` API. The original properties would be replaced by the properties uploaded via this API. If no user properties are set before, user properties will be newly created. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here: 
```c
TDProperties *user_properties = td_init_properties();
TD_ASSERT(TD_OK == td_add_string("user_name", "TA", strlen("TA"), user_properties));
TD_ASSERT(TD_OK == td_user_set(account_id, distinct_id, user_properties,ta));
td_free_properties(user_properties);

TDProperties *user_properties2 = td_init_properties();
TD_ASSERT(TD_OK == td_add_string("user_name", "TE", strlen("TE"), user_properties2));
TD_ASSERT(TD_OK == td_user_set(account_id, distinct_id, user_properties2,ta));
td_free_properties(user_properties2);
```

### 3.3 Reported data
Use `td_init_consumer()` to initialize the SDK. The SDK will write the collected data to the disk in real time.
Internally, the `td_flush()` function synchronizes the default memory cache in the file system to disk in real time. No manual call is usually required.
```c
td_flush(ta);
```

### 3.4 Close SDK
```c
td_free(ta);
td_consumer_free(consumer);
```

<quote-container>
Close and exit the SDK. Please call this API before closing the server to avoid data loss in the cache
</quote-container>

## **Best Practice**
The following sample code covers all the above-mentioned operations. It is recommended that the codes be used in the following steps:
```c
struct TDAnalytics* ta = NULL;
struct TDConsumer* consumer = NULL;

TDConfig* config = td_init_config();
char* logPath = "LOG_DIRECTORY";
TD_ASSERT(TD_OK == td_add_string("file_path", logPath, strlen(logPath), config));

if (TD_OK != td_init_consumer(&consumer, config)) {
    fprintf(stderr, "Failed to initialize the consumer.");
}
td_free_properties(config);

if (TD_OK != td_init(consumer, &ta)) {
    fprintf(stderr, "Failed to initialize the SDK.");
    return 1;
}

TDProperties *properties = td_init_properties();

TD_ASSERT(TD_OK == td_add_string("#ip", "192.168.1.1", strlen("192.168.1.1"), properties));

TD_ASSERT(TD_OK == td_add_string("channel", "ta", strlen("ta"), properties));
TD_ASSERT(TD_OK == td_add_int("age", 1, properties)); 
TD_ASSERT(TD_OK == td_add_bool("is_success", TD_TRUE, properties));
TD_ASSERT(TD_OK == td_add_date("birthday", time(NULL), 0, properties));

TD_ASSERT(TD_OK == td_append_array("arr", "value", strlen("value"), properties));
TD_ASSERT(TD_OK == td_append_array("arr", "value1", strlen("value1"), properties));

TDProperties *object = td_init_custom_properties("object");
TD_ASSERT(TD_OK == td_add_string("key", "value", strlen("value"), object));
TD_ASSERT(TD_OK == td_add_property(object, properties));

TDProperties *object1 = td_init_custom_properties("object1");
TD_ASSERT(TD_OK == td_add_string("key", "value", strlen("value"), object1));
TD_ASSERT(TD_OK == td_append_properties("object_arr", object1, properties));

TD_ASSERT(TD_OK == td_track("account_id", "distinct_id", "payment", properties, ta));
td_free_properties(properties);

TDProperties *user_properties = td_init_properties();
TD_ASSERT(TD_OK == td_add_string("user_name", "TA", strlen("TA"), user_properties));
TD_ASSERT(TD_OK == td_user_set("account_id", "distinct_id", user_properties,ta));
td_free_properties(user_properties);

TDProperties *user_properties2 = td_init_properties();
TD_ASSERT(TD_OK == td_add_string("user_name", "TE", strlen("TE"), user_properties2));
TD_ASSERT(TD_OK == td_user_set("account_id", "distinct_id", user_properties2,ta));
td_free_properties(user_properties2);
```
