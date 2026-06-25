---
code: golang_sdk_installation
name: "Golang"
wikiToken: GVHiwdEmWixRWrk0ZdKcT2twnSn
parentWikiToken: IKVPwn4NfiIhijk5EcAcMf6pn7e
updateTime: 1774252008000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=golang_sdk_installation
---

::: tip 
Before you begin, please read [<text color="purple" underline="true">Preparation before Data Ingestion</text>](https://thinkingdata.feishu.cn/wiki/OhD8we9iai6Xk5kM1QNc8ITRnQe).
 :::
**Latest version: **2.3.0
**Update time: **2026-03-17
**Resource download: **[**Source Code**](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Fgo-sdk)
::: warning Notice 
Current documentation applies to v2.0.0 and later. For historical versions, see [Data Ingestion Guide - Golang (V1)](https%3A%2F%2Fdocs.thinkingdata.cn%2Fta-manual%2Fv4.1%2Fen%2Finstallation%2Finstallation_menu%2Fserver_sdk%2Fgolang_sdk_installation%2Fgolang_sdk_installation.html) 
:::
## **SDK**** Integration**
1.1 Execute the following command to get the latest version of Golang SDK:
```shell
# install SDK
go get github.com/ThinkingDataAnalytics/go-sdk/v2

# update SDK
go get -u github.com/ThinkingDataAnalytics/go-sdk/v2
```

1.2 used Module
```go
//Introduce thinkingdata at the beginning of the code file
import "github.com/ThinkingDataAnalytics/go-sdk/v2/src/thinkingdata"

# Pull out the latest SDK module
go mod tidy
```

1.3 Logbus Integration
We recommend using SDK+LogBus to track and report data on server. You can refer to the following documents to complete the installation of Logbus:[ LogBus User Guide](https://thinkingdata.feishu.cn/wiki/SlE6wOEK3isQvukzEbnc5V0inNa)
## **Initialization**
The following is the sample code for SDK initialization:
```go
config := thinkingdata.TDLogConsumerConfig {
    Directory: "LOG_DIRECTORY",
}
consumer, _ := thinkingdata.NewLogConsumerWithConfig(config)
te := thinkingdata.New(consumer)
```

`LOG_DIRECTORY` is the local folder path.
## **Common Features**
In order to ensure that the distinct ID and account ID can be bound smoothly, if your game uses the distinct ID and account ID, we strongly recommend that you upload these two IDs at the same time, otherwise the account will not match, causing users to double count. For specific ID binding rules, please refer to the chapter on [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc).
### 3.1 **Sending Events**
 You can call `track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```go
accountId := "te_account_id"
distinctId := "te_distinct_id"
properties := map[string]interface{}{
   "channel": "te",      
   "age": 1,        
   "is_success": true,     
   "birthday": time.Now(),
   "object": map[string]interface{}{
      "key": "value",
   }, 
   "objectArr": []interface{}{
      map[string]interface{}{
         "key": "value",
      },
   },
   "arr": []string{"value"},
}

err := te.Track(accountId, distinctId, "payment", properties)
```

- Key is the name of the property and refers to the string type. It must start with a character, and contain numbers, characters (insensitive to case, and upper cases would be transformed into lower cases by TE) and underscores "_", with a maximum length of 50 characters. 
- Value, the value of the property, supports string, numbers, Boolean, time, object, array object, and array
<quote-container>
**The requirements for event properties and user properties are the same as that for super properties**
</quote-container>

### 3.2** User Properties**
You can set general user properties by calling `UserSet` API. The original properties would be replaced by the properties uploaded via this API. If no user properties are set before, user properties will be newly created. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here: 
```go
err := te.UserSet("accountId", "distinctId", map[string]interface{}{
   "user_name": "TA",
})
err = te.UserSet("accountId", "distinctId", map[string]interface{}{
   "user_name": "TE",
})
```

### 3.3 Reported data
When `TDLogConsumer` is used, the SDK writes the collected data to the disk in real time.
Internally, the `Flush()` method of the `TDAnalytics` object synchronizes the default memory cache in the file system to disk in real time. You generally do not need to call the `Flush()` method manually.
### 3.4 Close  SDK
```go
te.Close()
```

<quote-container>
Close and exit the SDK. Please call this api before closing the server to avoid data loss in the cache
</quote-container>

## **Best Practice**
The following sample code covers all the above-mentioned operations. It is recommended that the codes be used in the following steps:
```go
config := thinkingdata.TDLogConsumerConfig {
    Directory: "./log_directory",
}
consumer, _ := thinkingdata.NewLogConsumerWithConfig(config)
te := thinkingdata.New(consumer)

accountId := "te_account_id"
distinctId := "te_distinct_id"
properties := map[string]interface{}{
    "channel":   "te",     
    "age":       1,         
    "isSuccess": true,       
    "birthday":  time.Now(), 
    "object": map[string]interface{}{
       "key": "value",
    },
    "objectArr": []interface{}{
       map[string]interface{}{
          "key": "value",
       },
    },
    "arr":     []string{"value"},
}

err := te.Track(accountId, distinctId, "payment", properties)
if err != nil {
    fmt.Println(err)
}

err = te.UserSet("accountId", "distinctId", map[string]interface{}{
    "user_name": "TE",
})
if err != nil {
    fmt.Println(err)
}

//Calling the flush API will immediately write the data to the file. 
//In the production environment, pay attention to avoid IO or network overhead caused by frequent calls to flush
te.Flush()
```
