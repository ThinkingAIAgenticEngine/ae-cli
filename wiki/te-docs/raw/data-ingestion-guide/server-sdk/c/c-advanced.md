---
code: c_sdk_advanced
name: "C-Advanced"
wikiToken: IvaxwsdOwi8b3Ck84AzcXobtnDb
parentWikiToken: Er3owqC0UiRR21kCDgZcY4qJn3e
updateTime: 1774249245000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=c_sdk_advanced
---

## **Sending  Events**
After SDK is initialized, you can track user behaviour data. In general, ordinary events could meet business requirements. You can also use the First/Updatable Event based on your own business requirements.
### 1.1 **Ordinary Events**
 You can call `td_track` to upload events. It is suggested that you set event properties  based on the document about data tracking drafted previously. Procurement of a commodity by a user is taken as the example here:
```c
TDProperties *properties = td_init_properties();
TD_ASSERT(TD_OK == td_add_string("product_name", "goods_name", strlen("goods_name"), properties));

TD_ASSERT(TD_OK == td_track("account_id", "distinct_id", "product_buy", properties, ta));
td_free_properties(properties);
```

### 1.2 **First Events**
The First Events refers to events that would only be recorded once for the ID of a certain device or other dimensions. For example, under certain scenarios, you may want to record the activation event on a certain device. In this case, you can perform data tracking with the First Event.
If you want to judge whether an event is the First Event from other dimensions, you can define a first_check_id for the First Event:
```c
TD_ASSERT(TD_OK == td_track_first_event("account_id", "distinct_id", "device_activation", "first_id", properties, ta));
```

<quote-container>
Note: Since the server has to check whether the event is the First Event, the First Event will be put in storage one hour later by default.
</quote-container>

### 1.3 ** Updatable Events**
You can meet the requirements for event data modification under specific scenarios through Updatable Event. The TE would determine the data to be updated according to the event name and event ID.
```c
TDProperties *properties = td_init_properties();
TD_ASSERT(TD_OK == td_add_int("price",100,properties));
TD_ASSERT(TD_OK == td_add_int("status",3,properties));
TD_ASSERT(TD_OK == td_track_update("account_id", "distinct_id", "UPDATABLE_EVENT", "event_id",properties, ta));
td_free_properties(properties);

TDProperties *new_properties = td_init_properties();
TD_ASSERT(TD_OK == td_add_int("status",5,new_properties));
TD_ASSERT(TD_OK == td_track_update("account_id", "distinct_id", "UPDATABLE_EVENT", "event_id",new_properties, ta));
td_free_properties(new_properties);
```

### 1.4 **Overwritable Event****s**
Despite the similarity with Updatable Event, Overwritable Event would cover all historical data with the latest data. Looking from the perspective of effect, such a process is equivalent to the behavior of deleting the previous data while putting the latest data in storage. The TE would determine the data to be updated according to the event name and event ID.
```c
TDProperties *properties = td_init_properties();
TD_ASSERT(TD_OK == td_add_int("price",100,properties));
TD_ASSERT(TD_OK == td_add_int("status",3,properties));
TD_ASSERT(TD_OK == td_track_overwrite("account_id", "distinct_id", "OVERWRITE_EVENT", "event_id",properties, ta));
td_free_properties(properties);

TDProperties *new_properties = td_init_properties();
TD_ASSERT(TD_OK == td_add_int("status",5,new_properties));
TD_ASSERT(TD_OK == td_track_overwrite("account_id", "distinct_id", "OVERWRITE_EVENT", "event_id",new_properties, ta));
td_free_properties(new_properties);
```

## **User Properties**
User property setting API supported by the TE  include: `td_user_set`, `td_user_setOnce`, `td_user_add`, `td_user_append`, `td_user_uniq_append`, `td_user_unset`, `td_user_delete`.
### 2.1 td_user_set
You can call `td_user_set` to set general user properties. The original properties would be replaced if the properties uploaded via the API again. If  user properties are not set before, user properties will be created. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here:
```c
TDProperties *user_properties = td_init_properties();
TD_ASSERT(TD_OK == td_add_string("user_name", "TA", strlen("TA"), user_properties));
TD_ASSERT(TD_OK == td_user_set("account_id", "distinct_id", user_properties,ta));
td_free_properties(user_properties);

TDProperties *user_properties2 = td_init_properties();
TD_ASSERT(TD_OK == td_add_string("user_name", "TE", strlen("TE"), user_properties2));
TD_ASSERT(TD_OK == td_user_set("account_id", "distinct_id", user_properties2,ta));
td_free_properties(user_properties2);
```

### 2.2 td_user_setOnce
If the user property you want to upload only needs to be set once, you can call `td_user_setOnce` to set the property. If such property had been set before, this message would be ignored. Let's take the setting of the first payment time as an example:
```c
TDProperties *user_properties = td_init_properties();
TD_ASSERT(TD_OK == td_add_string("first_payment_time", "2018-01-01 01:23:45.678", strlen("2018-01-01 01:23:45.678"), user_properties));
TD_ASSERT(TD_OK == td_user_setOnce("account_id", "distinct_id", user_properties,ta));
td_free_properties(user_properties);

TDProperties *user_properties2 = td_init_properties();
TD_ASSERT(TD_OK == td_add_string("first_payment_time", "2018-12-31 01:23:45.678", strlen("2018-12-31 01:23:45.678"), user_properties2));
TD_ASSERT(TD_OK == td_user_setOnce("account_id", "distinct_id", user_properties2,ta));
td_free_properties(user_properties2);
```

### 2.3 td_user_add
When you want to upload numeric property for cumulative operation, you can call `td_user_add`.
If the property has not been set, it would be given a value of 0 before computing. A negative value could be uploaded, which is equivalent to subtraction operation. Let's take the accumulative payment amount as an example:
```c
TDProperties *user_properties = td_init_properties();
TD_ASSERT(TD_OK == td_add_int("total_revenue", 30, user_properties));
TD_ASSERT(TD_OK == td_user_add("account_id", "distinct_id", user_properties, ta));
td_free_properties(user_properties);

TDProperties *new_user_properties = td_init_properties();
TD_ASSERT(TD_OK == td_add_int("total_revenue",648 , new_user_properties));
TD_ASSERT(TD_OK == td_user_add("account_id", "distinct_id", new_user_properties, ta));
td_free_properties(new_user_properties);
```

<quote-container>
The property key is a string, and the value is only allowed to be a numeric value.
</quote-container>

### 2.4 td_user_append
You can call `td_user_append` to add user properties of array type.
```c
TDProperties *array_properties = td_init_properties();
TD_ASSERT(TD_OK == td_append_array("user_list", "apple", strlen("apple"), array_properties));
TD_ASSERT(TD_OK == td_append_array("user_list", "ball", strlen("ball"), array_properties));
TD_ASSERT(TD_OK == td_user_append("account_id", "distinct_id", array_properties, ta));
td_free_properties(array_properties);

TDProperties *new_array_properties = td_init_properties();
TD_ASSERT(TD_OK == td_append_array("user_list", "apple", strlen("apple"), new_array_properties));
TD_ASSERT(TD_OK == td_append_array("user_list", "cube", strlen("cube"), new_array_properties));
TD_ASSERT(TD_OK == td_user_append("account_id", "distinct_id", new_array_properties, ta));
```

### 2.5 td_user_uniq_append
You can delete duplicated user property by calling `td_user_uniq_append` API. If you call `td_user_uniq_append` API, duplicated user property will be merged.
```c
TDProperties *array_properties = td_init_properties();
TD_ASSERT(TD_OK == td_append_array("user_list", "apple", strlen("apple"), array_properties));
TD_ASSERT(TD_OK == td_append_array("user_list", "ball", strlen("ball"), array_properties));
TD_ASSERT(TD_OK == td_user_append("account_id", "distinct_id", array_properties, ta));
td_free_properties(array_properties);

TDProperties *new_array_properties = td_init_properties();
TD_ASSERT(TD_OK == td_append_array("user_list", "apple", strlen("apple"), new_array_properties));
TD_ASSERT(TD_OK == td_append_array("user_list", "cube", strlen("cube"), new_array_properties));
TD_ASSERT(TD_OK == td_user_uniq_append("account_id","distinct_id", new_array_properties, ta));
td_free_properties(new_array_properties);
```

### 2.6 td_user_unset
When you need to clear the user properties of users, you can call `td_user_unset` to clear specific properties. `td_user_unset` would not create properties that have not been created in the cluster.
```c
TD_ASSERT(TD_OK == td_user_unset("account_id", "distinct_id", "test", ta));
```

### 2.7 td_user_delete
You can call `td_user_delete` to delete a user. After deleting the user, you would no longer be able to inquire about its user property, but could still query the events triggered by the user.
```c
TD_ASSERT(TD_OK == td_user_delete("account_id", "distinct_id", ta));
```

## **Other**
### 3.1 BatchConsumer
::: warning Notice
When the amount of data is too large or the network is abnormal, there is a risk of data loss. And it is not recommended to use it in a production environment
:::
Batches transmit data to the TE in real time, without the need for a transmission tool. 
e.g. Modify the `CMakeLists.txt` file:
```bash
# Product Library: batch consumer
if(WIN32)
    add_compile_definitions(USE_WIN)
    set(CMAKE_C_FLAGS "-std=c99 -pedantic-errors -m64")
else()
    add_compile_definitions(USE_POSIX)
    set(CMAKE_C_FLAGS "-std=c99")
endif()
     SET(TE_LIB_NAME thinkingDataBatch)
     add_library(${TE_LIB_NAME} src/thinkingdata.c src/td_json.c src/td_list.c src/td_util.c src/td_batch_consumer.c src/td_http_client.c)
if(WIN32)
      add_compile_definitions(BUILDING_LIBCURL)
      include_directories(thirdparty/pcre/include thirdparty/curl/include)
      link_directories(thirdparty/pcre/lib thirdparty/curl/lib)
      target_link_libraries(${TE_LIB_NAME} pcre_x64 libcurl)
else()
      target_link_libraries(${TE_LIB_NAME} curl)
endif()
```

```c
struct TDAnalytics* ta = NULL;
struct TDConsumer* consumer = NULL;

TDConfig *config = td_init_config();

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
```

Instruction on parameters:
- `APPID`: The APPID of your project, which can be found on the project management page of  TE.
- `SERVER_URL`: 
  - If you are using a SaaS version, please check the receiver URL on this page
<image token="Eg1QbzIeHoAQpOxlbJ6cRMydnYc" width="1674" height="1318" align="center"/>

- If you use the private deployment version, you can customize the data tracking URL .
