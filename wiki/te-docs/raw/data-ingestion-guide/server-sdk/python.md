---
code: python_sdk_installation
name: "Python"
wikiToken: YoPdwzGBMiRyS7kTY5pcmWHpnjf
parentWikiToken: IKVPwn4NfiIhijk5EcAcMf6pn7e
updateTime: 1774252012000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=python_sdk_installation
---

::: tip
Before you begin, please read [<text color="purple" underline="true">Preparation before Data Ingestion</text>](https://thinkingdata.feishu.cn/wiki/OhD8we9iai6Xk5kM1QNc8ITRnQe).
 :::
**Latest version: **v3.0.0
**Update time: **2023-10-07
**Resource download: **[Source Code](https%3A%2F%2Fgithub.com%2FThinkingDataAnalytics%2Fpython-sdk)
::: warning Notice 
Current documentation applies to v3.0.0 and later. For historical versions, see [Data Ingestion Guide - Python (V2)](https%3A%2F%2Fdocs.thinkingdata.cn%2Fta-manual%2Fv4.1%2Fen%2Finstallation%2Finstallation_menu%2Fserver_sdk%2Fpython_sdk_installation%2Fpython_sdk_installation.html) 
:::
## **SDK**** Integration**
1.1 Get Python SDK through `pip`
```shell
# install SDK
pip install ThinkingDataSdk

# update SDK
pip install --upgrade ThinkingDataSdk
```

1.2 Logbus Integration
We recommend using SDK+LogBus to track and report data on server. You can refer to the following documents to complete the installation of Logbus:[ LogBus User Guide](https://thinkingdata.feishu.cn/wiki/SlE6wOEK3isQvukzEbnc5V0inNa)
## **Initialization**
The following is the sample code for SDK initialization:
```python
from tgasdk.sdk import *
te = TDAnalytics(TDLogConsumer("LOG_DIRECTORY"))
```

`LOG_DIRECTORY` is the path of the folder written to the local directory. You need to set the `LogBus` listening folder address to this address in order to use `LogBus` for data listening upload.
`LOG_FILE_PREFIX` Indicates the prefix of the log file name.
## **Common Features**
In order to ensure that the distinct ID and account ID can be bound smoothly, if your game uses the distinct ID and account ID, we strongly recommend that you upload these two IDs at the same time, otherwise the account will not match, causing users to double count. For specific ID binding rules, please refer to the chapter on [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc).
### 3.1 **Sending Events**
 You can call `track` to upload events. It is suggested that you set event properties based on the data tracking plan drafted previously. Here is an example of a user buying an item:
```python
distinct_id = "ABCDEF123456"
account_id = "TE10001"
properties = {
    "#time": datetime.datetime.now(),
    "#ip": "192.168.1.1",
    "Product_Name": "商品名",
    "Price": 30,
    "OrderId": "订单号abc_123"
}
try:
    te.track(distinct_id, account_id, "Payment", properties)
except Exception as e:
    print(e)
```

- Key is the name of the property and refers to the string type. It must start with a character, and contain numbers, characters (insensitive to case, and upper cases would be transformed into lower cases by TE) and underscores "_", with a maximum length of 50 characters. 
- Value, the value of the property, supports string, numbers, Boolean, time, object, array object, and array
<quote-container>
**The requirements for event properties and user properties are the same as that for super properties**
</quote-container>

### 3.2** User Properties**
You can set general user properties by calling `user_set` API. The original properties would be replaced by the properties uploaded via this API. If no user properties are set before, user properties will be newly created. The type of newly-created user properties must conform to that of the uploaded properties. User name setting is taken as the example here: 
```python
properties = {"user_name": "ABC"}
try:
    te.user_set(account_id="account_id", distinct_id="distinct_id", properties=properties)
except Exception as e:
    print(e)
```

### 3.3 Reported data
When using `TDLogConsumer`, the captured events are converted to json strings and then added to the cache array. Data is written to disk only when the number of array elements exceeds the set capacity. The default capacity is 5. You can set the size of `buffer_size` in the `TDLogConsumer` constructor.
You can call the `flush()` api to report data to the TE  immediately under certain service scenarios. However, frequent calls to `flush()` can result in degraded service performance.
```python
te.flush();
```

### 3.4 Close  SDK
```python
te.close()
```

<quote-container>
Close and exit the SDK. Please call this api before closing the server to avoid data loss in the cache
</quote-container>

## **Best Practice**
The following sample code covers all the above-mentioned operations. It is recommended that the codes be used in the following steps:
```python
from tgasdk.sdk import *

te = TDAnalytics(TDLogConsumer("LOG_DIRECTORY"))

properties = {
    "#time": datetime.datetime.now(),  
    "#ip": "192.168.1.1", 
    "Product_Name": "goods_name"
}
try:
    te.track("distinct_id", "account_id", "Payment", properties)
except Exception as e:
    print(e)

user_properties = {"user_name": "ABC"}
try:
    te.user_set(account_id="account_id", distinct_id="distinct_id", properties=user_properties)
except Exception as e:
    print(e)

te.flush()
```
