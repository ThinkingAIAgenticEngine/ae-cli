# I. Environment Configuration

```shell
# Download
pip(3) install ThinkingDataSdk
# Update
pip(3) install --upgrade ThinkingDataSdk
```

Python SDK minimum compatible with Python 2.7.5, recommended to use version 2.7.9 or above. The following is based on SDK version 2.1.3.

#### demo

```python
from tgasdk.sdk import *

# Runtime log switch, default False
TGAnalytics.enableLog(True)
# Initialize
consumer = LoggingConsumer(log_directory="/Users/blank/Downloads/pytest")
# consumer = BatchConsumer(server_uri="Upload Address", appid="Project appid")
# consumer = AsyncBatchConsumer(server_uri="Upload Address", appid="Project appid")
# consumer = DebugConsumer(server_uri="Upload Address", appid="Project appid", device_id="123456789")
te = TGAnalytics(consumer)
# Data upload
account_id = "11111"  # Account id
distinct_id = "ABD"  # Visitor id
testProperties = {
    "#time": datetime.datetime.now(),  # Set event time, defaults to current time if not filled
    "#ip": "123.123.123.123",  # Set ip, default not uploaded
    "#zone_offset": 8,  # Set timezone
    "a": "123",  # Text
    "b": 123,  # Number
    "c": False,  # Boolean
    "e": datetime.datetime.now(),  # Time
    "f": ["123", "123"],  # List
    "g": {  # Object
        "g1": "123",  # Object only recognizes normal properties, if nested object/object group corresponding property ends up stored as text
    },
    "h": [  # Object Group
        {
            "h1": "123",  # Each object in object group only recognizes normal properties, if nested object/object group corresponding property ends up stored as text
        },
        {
            "h1": "321",
        }
    ],
}

try:
    # Upload user properties
    te.user_set(account_id=account_id, distinct_id=distinct_id, properties=testProperties)
    # Upload event named test
    te.track(account_id=account_id, distinct_id=distinct_id, event_name="test", properties=testProperties)
except Exception as e:
    raise TGAIllegalDataException(e)

te.flush()
# te.close()  # Automatically calls flush() before closing sdk
```

# II. Working Principles

#### **What working modes does Python SDK support? What scenarios are they suitable for?**

Python SDK supports the following four working modes:

1. **LoggingConsumer** Batch writes data to local files in real-time, files can be split by day, hour or specified file size, needs to be combined with LogBus for data upload. Advantage is data storage and upload are decoupled, data is persistently stored and not easily lost; disadvantage is need to additionally deploy LogBus for upload, LogBus will occupy some system resources.
2. **BatchConsumer** Batch uploads data to TA server in real-time, doesn't need to be combined with upload tool. Advantage is simple use without upload tool; disadvantage is data not persistently stored, only cached in memory, if network unstable and cached data exceeds cache limit will lose data.
3. **AsyncBatchConsumer** Asynchronously batch uploads data to TA server in real-time, same as BatchConsumer otherwise
4. **DebugConsumer** Sends data one by one, server performs strict validation on data, when some property doesn't comply with specification whole record won't be stored, when data format error will print detailed error message. DebugConsumer recommended for development debugging phase, forbidden for production environment.

#### **How to get upload address and APP_ID?**

Project manager can on ThinkingData WEB interface, after selecting specific project, enter Project Management - Project Configuration - Integration Configuration interface to get project appid. Upload address is divided into public network address and private network address, among which public network address suitable for client data upload, and server-side data integration in public network environment; if upload domain is configured in public network, consult the operations engineer who did that configuration; private network address suitable for data integration and testing in internal network environment, internal network upload address is port 8991 of each cluster node.

#### **What is LoggingConsumer's working principle? What configuration parameters does it have?**

Principle: Upload operation first writes to cache, writes to disk when exceeding buffer_size (default 5 records), if not meeting write condition and want to write data to file need to call flush method yourself. Can be executed in multi-threading but itself is synchronous method, multi-threading also has to wait for lock executionwhich instead wastes performance. When writing to file will add file lock so cannot have multiple processes write same file.

LoggingConsumer common configuration parameters:

| Parameter     | Description         | Default | Parameter Type | Required | Note                                                                        |
| ------------- | ------------------- | ------- | -------------- | -------- | --------------------------------------------------------------------------- |
| log_directory | Log file path       | -       | String         | Yes      | Multi-level directory auto-created                                          |
| rotate_mode   | Log split by time   | DAILY   | Enum           | No       | Enum('ROTATE_MODE', ('DAILY', 'HOURLY'))                                    |
| file_prefix   | Log filename prefix | Empty   | String         | No       | Fill when multiple instances to prevent multi-process write same file error |
| log_size      | Log split by size   | 0       | Integer        | No       | Unit is MB, value 0 means no split, not recommended to use                  |
| buffer_size   | Cache size          | 5       | Integer        | No       | Unit is records, writes to log from memory when exceeding                   |

#### **What is BatchConsumer's working principle? What configuration parameters does it have?**

Principle: Upload operation writes to cache, when upload data count exceeds batch (default 20) or due to network communication failure etc. causing unuploaded data making cache_buffer not empty, calls flush, if not meeting condition need to call flush method yourself. If communication failure will store in cache_buffer, long communication failure causing unsent total count / batch greater than max_cache_size will discard earliest batch records.

BatchConsumer common configuration parameters:

| Parameter      | Description                                              | Default | Parameter Type | Required | Note              |
| -------------- | -------------------------------------------------------- | ------- | -------------- | -------- | ----------------- |
| server_uri     | Upload address                                           | -       | String         | Yes      |                   |
| appid          | Project appid                                            | -       | String         | Yes      |                   |
| batch          | Batch size, triggers data upload when reaching threshold | 20      | Integer        | No       | Max 200           |
| timeout        | HTTP request timeout                                     | 30000   | Integer        | No       | Unit milliseconds |
| compress       | Whether compress data                                    | True    | Boolean        | No       |                   |
| max_cache_size | Memory retained data batch count                         | 50      | Integer        | No       |                   |

#### **What is AsyncBatchConsumer's working principle? What configuration parameters does it have?**

Principle: Upload operation writes to cache, calls flush when upload data count exceeds flush_size or every interval seconds. If communication failure during flush will retry 3 times, still fails will put back to queue waiting for next upload, long communication failure causing exceeding queue_size will discard earliest flush_size records.

AsyncBatchConsumer common configuration parameters:

| Parameter  | Description                                              | Default | Parameter Type | Required | Note         |
| ---------- | -------------------------------------------------------- | ------- | -------------- | -------- | ------------ |
| server_uri | Upload address                                           | -       | String         | Yes      |              |
| appid      | Project appid                                            | -       | String         | Yes      |              |
| interval   | Data upload interval                                     | 3       | Integer        | No       | Unit seconds |
| flush_size | Batch size, triggers data upload when reaching threshold | 20      | Integer        | No       |              |
| queue_size | Send thread queue size                                   | 100000  | Integer        | No       | Unit records |

#### **What is DebugConsumer's working principle? What configuration parameters does it have?**

Principle: Each record directly goes HTTP request to upload data, doesn't need to call flush. Data format will be strictly validated.

DebugConsumer common configuration parameters:

| Parameter  | Description                        | Default | Parameter Type | Required | Note    |
| ---------- | ---------------------------------- | ------- | -------------- | -------- | ------- |
| server_uri | Upload address                     | -       | String         | Yes      |         |
| appid      | Project appid                      | -       | String         | Yes      |         |
| timeout    | HTTP request timeout               | 30000   | Integer        | No       | Unit ms |
| write_data | Whether data is stored in database | True    | Boolean        | No       |         |
| device_id  | Device ID                          | Empty   | String         | No       |         |

# III. Common Issues

#### **What are the precautions for using LoggingConsumer?**

- **Combine with LogBus upload**
  - LoggingConsumer + LogBus is ThinkingData standard data upload solution, LoggingConsumer makes data persistent, data gets loss-free guarantee; LogBus provides data transmission guarantee, also decouples data persistence and upload.
- **File write permission**
  - Writing to log directory needs write and read permission, usually Windows environment has write permission issues.
- **Disk space**
  - Ensure disk space is sufficient, and can reasonably configure deletion strategy in LogBus.
- **Disk performance NFS situation**
- **UUID**
  - Recommended to add UUID, prevent data duplication from network jitter and extreme cases, but will slightly consume efficiency, can also enable on LogBus side.
- **Multi-process write different files**
  - Supports multi-process write different files, but need to ensure different processes' processing logic has no dependency relationship (e.g. user behavior from different servers written to different logs)
- **Container environment**
  - Map data write path to external disk, prevent data file loss when container closes

#### **Does LoggingConsumer support multi-threading? Does it support multi-process?**

Supports multi-threading, doesn't support multi-process writing same file.

#### **What are LoggingConsumer performance metrics?**

20k/s under 4C16G, varies up and down on different platforms and Python versions

#### **Does LoggingConsumer have data loss risk? How to avoid?**

If disk is full or server crash may cause data loss, recommendations:

1. Regularly check log write path disk remaining capacity
2. Lower buffer_size parameter value, increase memory flush frequency, but will cause frequent IO, need to comprehensively consider based on specific scenario

#### **Why does BatchConsumer have data loss risk? How to avoid?**

`BatchConsumer` maintains two queues in memory, one batch size queue responsible for storing single batch data, one batch\*max_cache_size size queue responsible for storing batch data queue failed to send due to network reasons. Because `BatchConsumer` is based on memory storage, when memory overflow or server crash happens, unsent data in memory will all be lost, recommendations:

1. Use LoggingConsumer + LogBus combination for data upload
2. Increase max_cache_size parameter value, when network abnormality causing data send failure, can store more data in memory, but will cause server memory usage increase, need to comprehensively consider based on specific scenario
3. Batch parameter should not be set too large, may cause single send time increase, increase probability of network error

#### **What are BatchConsumer performance metrics? What scenarios is it suitable for?**

Suitable for use in internal network environment with low concurrent data volume, guaranteed network (e.g. connected with TE cluster internal network).

#### **Why is DebugConsumer forbidden in production environment?**

DebugConsumer when uploading data, each record will be POST sent, production environment use will frequently create connections affecting efficiency.

#### **When to call `close()` method?**

Call when program needs normal end, close() method will write data in memory to file or send.

#### **Called `track()` or `user_set()` method in program, why no data visible in TE backend?**

Please check the following situations in order:

- Check upload address and appid
- Too few data, not triggered upload
- Error data
- Data time
- Historical channel
- Tracking plan

#### **Why is "#ip" missing in uploaded data?**

Server-side #ip needs separate upload, level same as #distinct_id, #event_name, #time, properties.

# IV. Preset Properties, Special Type Upload

#### **How to upload Object and Object Group types with Python SDK?**

Python SDK 1.7.0 and above support uploading Object and Object Group types, code example please refer to Server SDK Complex Type Upload.

#### **Common Properties**

Server-side common properties cannot be precise to user level, in multi-threading situation uploading user-level property data may cause user data mismatch. Only recommended to put server ID etc. fields that won't have large changes in common properties, rest put in normal properties.

#### **Timezone**

Default timezone follows ThinkingData server, if want to achieve timezone offset need to upload #zone_offset field. Suppose filled 0 and event time is 2023-04-17 01:02:03, offset to East 8 zone will analyze with event time 2023-04-17 09:02:03.

# V. Exception Errors

1. **Pip install Python SDK failed, error: "ERROR: Could not find a version that satisfies the requirement ThinkingDataSdk (from version: none) ERROR: No matching distribution found for ThinkingDataSdk"**

This is common pip install issue, usually can be solved by upgrading pip version or changing pip source.

2. **Calling user_set() error: "error = year=1899 is before 1900; the datetime strftime() methods require year >= 1900"**

Python SDK uses strftime() function for time conversion, doesn't support time before 1900.

3. **Calling track() error: "gevent.Hub.LoopExit: This operation would block forever"**

This is customer using Python third-party library gevent error, many related materials and solutions online, can assist customer analysis, not Python SDK exception.

4. **BatchConsumer upload error: "Data transmission failed due to ConnectionError(ProtocolError('Connection aborted.', BadStatusLine('No status line received - the server has closed the connection',)),)"**

This error comes from Python SDK's internal class \_HttpServices send() function, usually caused by network jitter. BatchConsumer's \_\_cache_buffer cache area won't remove failed upload data, will continue uploading next time, so network jitter won't cause data loss.
