---
code: c_sdk_debug
name: "Debugging and Logging"
wikiToken: OCeRwB7Hdi9Fy7kEdtlcgo7fnDh
parentWikiToken: IvaxwsdOwi8b3Ck84AzcXobtnDb
updateTime: 1774249247000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=c_sdk_debug
---

::: warning Notice
The SDK Debug mode is used only for access debugging. Do not apply it to the production environment.
:::
During the process of SDK Integration, you can perform real-time debugging by checking SDK logs in the IDE console or using the Debug function of TE.
## Logging
```c
td_enableLog(1);
```

<quote-container>
After enabling the log, you can observe the data tracking of SDK in IDE.
</quote-container>

## Debugging
You need to follow the following two steps to enable the Debug mode:
#### 2.1 Use DebugConsumer
Build .a files with debug consumer.
e.g. Modify the `CMakeLists.txt` file: 
```bash
# Debug Library: debug consumer
if(WIN32)
    add_compile_definitions(USE_WIN)
    set(CMAKE_C_FLAGS "-std=c99 -pedantic-errors -m64")
else()
    add_compile_definitions(USE_POSIX)
    set(CMAKE_C_FLAGS "-std=c99")
endif()
SET(TE_LIB_NAME thinkingDataDebug)
add_library(${TE_LIB_NAME} src/thinkingdata.c src/td_json.c src/td_list.c src/td_util.c src/td_debug_consumer.c src/td_http_client.c)
if(WIN32)
    add_compile_definitions(BUILDING_LIBCURL)
    include_directories(thirdparty/pcre/include thirdparty/curl/include)
    link_directories(thirdparty/pcre/lib thirdparty/curl/lib)
    target_link_libraries(${TE_LIB_NAME} pcre_x64 libcurl)
else()
    target_link_libraries(${TE_LIB_NAME} curl)
endif()
```

Use debug consumer:
```c
struct TDAnalytics* ta = NULL;
struct TDConsumer* consumer = NULL;

TDConfig *config = td_init_config();

TD_ASSERT(TD_OK == td_add_int("debug_mode", 0, config));

TD_ASSERT(TD_OK == td_add_string("device_id", "123456789", strlen("123456789"), config));

char* appid = "APPID";
char* serverURL = "SERVER_URL";
TD_ASSERT(TD_OK == td_add_string("push_url", serverURL, strlen(serverURL), config));
TD_ASSERT(TD_OK == td_add_string("appid", appid, strlen(appid), config));

if (TD_OK != td_init_consumer(&consumer, config)) {
    fprintf(stderr, "Failed to initialize the consumer.");
    return 1;
}
td_free_properties(config);
if (TD_OK != td_init(consumer, &ta)) {
    fprintf(stderr, "Failed to initialize the SDK.");
    return 1;
}

TDProperties *properties = td_init_properties();

TD_ASSERT(TD_OK == td_add_string("#device_id", "td_device_id", strlen("td_device_id"), properties));

TD_ASSERT(TD_OK == td_track("account_id", "distinct_id", "test", properties, ta));
td_free_properties(properties);
```

#### 2.2 Add Device
To avoid launching the Debug mode in the production environment, it is required that only specified device can enable Debug mode.  The Debug mode can only be enabled for devices whose ID has been configured in the "Debug data" sector on the "tracking management" page of the TE.
<image token="XRxabisN3oG9zoxiIPuc0XdHnWb" width="1280" height="590" align="center"/>

<quote-container>
It can only be used for data verification at the integration stage, and should not be used in the online environment.
</quote-container>
