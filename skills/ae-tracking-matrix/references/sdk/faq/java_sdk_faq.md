# Environment Configuration

Current documentation is written based on Java SDK v3.x new API, examples are oriented to technical developers, can be directly used as integration template reference. Deprecated: `cn.thinkingdata.tga.javasdk` package, `ThinkingDataAnalytics` / `LoggerConsumer` / `BatchConsumer` / `DebugConsumer` classes, and `user_set`, `user_add`, `track_first`, `track_update`, `track_overwrite` etc. snake_case methods. According to reference documentation changelog, as of 2026-01-07 latest release version is v3.0.4-beta.1; among them fastjson1, lzo, lz4 are no longer supported. For production environment please prioritize using verified fixed version, and complete regression verification before upgrading according to changelog.

Java SDK minimum compatible with JDK 8. Common Java IDEs include **IntelliJ IDEA**, **Eclipse**, **NetBeans** etc., examples in this document use **IntelliJ IDEA**. To integrate SDK using Maven, add dependency in `pom.xml`. For latest version, please refer to official documentation or changelog:

```xml
<dependencies>
    <!-- others... -->
    <dependency>
        <groupId>cn.thinkingdata</groupId>
        <artifactId>thinkingdatasdk</artifactId>
        <version>3.0.2</version>
    </dependency>
</dependencies>
```

#### TDLoggerConsumer Example Code

```java
import cn.thinkingdata.analytics.TDAnalytics;
import cn.thinkingdata.analytics.TDLoggerConsumer;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class LoggerExample {
    public static void main(String[] args) {
        TDAnalytics ta = null;
        try {
            // Initialize SDK, LOG_DIRECTORY is local log directory
            ta = new TDAnalytics(new TDLoggerConsumer("LOG_DIRECTORY"), true);

            Map<String, Object> properties = new HashMap<>();
            properties.put("#ip", "192.168.1.1");
            properties.put("channel", "te");
            properties.put("age", 1);
            properties.put("is_success", true);
            properties.put("birthday", new Date());

            Map<String, Object> object = new HashMap<>();
            object.put("key", "value");
            properties.put("object", object);

            List<Map<String, Object>> objectArray = new ArrayList<>();
            objectArray.add(object);
            properties.put("object_arr", objectArray);

            List<String> tags = new ArrayList<>();
            tags.add("value");
            properties.put("arr_string", tags);

            ta.track("account_id", "distinct_id", "payment", properties);

            Map<String, Object> userProperties = new HashMap<>();
            userProperties.put("user_name", "TE");
            ta.userSet("account_id", "distinct_id", userProperties);

            // Only call when immediate flush is needed, avoid high frequency flush causing extra IO overhead
            ta.flush();
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (ta != null) {
                try {
                    ta.close();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
    }
}
```

#### TDBatchConsumer Example Code

```java
import cn.thinkingdata.analytics.TDAnalytics;
import cn.thinkingdata.analytics.TDBatchConsumer;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

public class BatchExample {
    public static void main(String[] args) {
        TDAnalytics ta = null;
        try {
            ta = new TDAnalytics(new TDBatchConsumer("SERVER_URL", "APP_ID"));

            String distinctId = "ABCDEFG123456789";
            String accountId = "TA_10001";

            Map<String, Object> properties = new HashMap<>();
            properties.put("#time", new Date());
            properties.put("#ip", "192.168.1.1");
            properties.put("product_name", "Product A");
            properties.put("price", 30);
            properties.put("order_id", "abc_123");

            ta.track(accountId, distinctId, "payment", properties);

            // Batch mode usually relies on batch threshold or timing mechanism to trigger sending
            ta.flush();
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (ta != null) {
                try {
                    ta.close();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
    }
}
```

#### TDDebugConsumer Example Code

```java
import cn.thinkingdata.analytics.TDAnalytics;
import cn.thinkingdata.analytics.TDDebugConsumer;

import java.util.HashMap;
import java.util.Map;

public class DebugExample {
    public static void main(String[] args) {
        TDAnalytics ta = null;
        try {
            TDAnalytics.enableLog(true);
            ta = new TDAnalytics(new TDDebugConsumer("SERVER_URL", "APP_ID", "DEBUG_DEVICE_ID"));

            Map<String, Object> properties = new HashMap<>();
            properties.put("product_name", "shoes");
            properties.put("price", 199);

            ta.track("account_id", "distinct_id", "payment", properties);
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (ta != null) {
                try {
                    ta.close();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
    }
}
```

> Enabling Debug mode requires two steps:
>
> 1. Use `TDDebugConsumer` in code and pass `DEBUG_DEVICE_ID`.
> 2. Configure the same Debug device ID in TE backend "Data > Tracking Management > Debug Data". Only configured devices can truly enable Debug mode.

# Working Principles

#### **What working modes does Java SDK support? What scenarios are they suitable for?**

Java SDK v3.x common three working modes:

1. **TDLoggerConsumer**: Writes data in batches to local logs, then transmitted by LogBus. Suitable for production environment, scenarios requiring higher recoverability and more secure data loss control, also officially recommended server-side integration solution.
2. **TDBatchConsumer**: Directly sends data in batches to TA server, simple integration, but cache is only stored in memory. Suitable for medium-small traffic, stable network quality, scenarios accepting certain retry and cache limit constraints.
3. **TDDebugConsumer**: Sends one by one with strict validation, convenient for integration verification and real-time debugging. Only recommended for development debugging phase, strictly forbidden for production environment.

#### **How to get upload address and APP_ID?**

Project manager can select specific project on ThinkingData Web interface, then enter "Project Management > Project Configuration > Integration Configuration" to get APP_ID and data upload address. Upload address is usually divided into public network address and private network address:

- Public network address: Suitable for client upload, and server-side integration in public network environment.
- Private network address: Suitable for data integration and testing in internal network environment. If using private deployment, recommended to bind domain for data integration address and configure HTTPS certificate; if using cloud service, please directly use platform provided integration address.

#### **What is LoggerConsumer's working principle? What configuration parameters does it have?**

v3.x implementation is `TDLoggerConsumer`. Events first write to memory cache, flush to local log file after reaching threshold; if auto-flush is enabled, also flush at fixed time interval. This mode is thread-safe, but single instance call defaults to synchronous; if multiple threads frequently compete for same instance, throughput improvement is usually limited. In production environment recommended to use with LogBus, decoupling "flush to disk" and "upload".

`TDLoggerConsumer.Config` common parameters:

| Parameter        | Description                  | Default | Value Range       | Note                                                  |
| ---------------- | ---------------------------- | ------- | ----------------- | ----------------------------------------------------- |
| `logDirectory`   | Log file write directory     | None    | String            | Multi-level directories auto-created                  |
| `rotateMode`     | Log rotation mode            | `DAILY` | `HOURLY`, `DAILY` | By hour or by day                                     |
| `lockFileName`   | File lock name               | None    | String            | Not recommended to enable without clear need          |
| `filenamePrefix` | Log filename prefix          | None    | String            | For multi-instance or multi-business file distinction |
| `interval`       | Auto flush interval          | `3`     | Integer           | Used with `autoFlush`, unit seconds                   |
| `fileSize`       | File size rotation threshold | `0`     | Integer           | Unit MB, `0` means no size rotation                   |
| `bufferSize`     | Memory buffer size           | `8192`  | Integer           | Unit bytes                                            |
| `autoFlush`      | Whether auto flush           | `false` | Boolean           | Only enable when real-time requirement exists         |

#### **What is BatchConsumer's working principle? What configuration parameters does it have?**

v3.x implementation is `TDBatchConsumer`. Events first write to memory queue, send to server when batch threshold met or `flush()` triggered; failed network sends enter retry and cache logic. Its advantage is simple integration, no LogBus dependency; disadvantage is cache only exists in memory, service abnormal exit or long network issues may cause data loss, therefore not recommended as first choice for high reliability production solution.

`TDBatchConsumer.Config` common parameters:

| Parameter          | Description                             | Default | Value Range    | Note                                                            |
| ------------------ | --------------------------------------- | ------- | -------------- | --------------------------------------------------------------- |
| `batchSize`        | Single batch send count threshold       | `20`    | Integer        | Triggers send after reaching threshold                          |
| `interval`         | Auto send interval                      | `3`     | Integer        | Used with `autoFlush`, unit seconds                             |
| `compress`         | Data compression format                 | `gzip`  | `gzip`, `none` | `lzo`, `lz4` no longer supported in new version                 |
| `timeout`          | Network request timeout                 | `30000` | Integer        | Unit milliseconds                                               |
| `autoFlush`        | Whether auto send                       | `false` | Boolean        | Enable based on business real-time requirement                  |
| `maxCacheSize`     | Failed batch cache limit                | `50`    | Integer        | Default max cache `20 * 50` records                             |
| `isThrowException` | Whether throw exception on send failure | `true`  | Boolean        | Recommended to keep default, for business side to perceive risk |

#### **What is DebugConsumer's working principle? What configuration parameters does it have?**

Old `DebugConsumer` is deprecated, v3.x implementation is `TDDebugConsumer`. This mode sends data one by one via HTTP request, and performs strict validation on server; suitable for integration phase quick identification of field format, event naming and data validity issues.

`TDDebugConsumer` common parameters:

| Parameter   | Description              | Default | Value Range | Note                                         |
| ----------- | ------------------------ | ------- | ----------- | -------------------------------------------- |
| `serverUrl` | Data integration address | None    | String      | Must match project configuration             |
| `appId`     | Project APP_ID           | None    | String      | Can get from project configuration page      |
| `deviceId`  | Debug device ID          | None    | String      | Must configure as Debug device in TE backend |

Recommended to enable SDK log during debugging:

```java
TDAnalytics.enableLog(true);
```

# Common Issues

#### **What are the precautions for using LoggerConsumer?**

- **Use with LogBus Upload**
  - `TDLoggerConsumer + LogBus` is the more recommended server-side integration combination, ensures local persistence, also reduces application process directly bearing transmission pressure.
- **File Write Permission**
  - Log directory needs stable read-write permission, Windows or container environment especially needs advance verification of directory permission and mount strategy.
- **Disk Space**
  - Production environment needs continuous monitoring of log directory remaining capacity, configure retention and deletion rules in LogBus or external cleanup strategy.
- **Disk Performance and NFS**
  - If log directory is on NFS etc. network file system, need to evaluate write latency, throughput and network jitter impact.
- **Deduplication Identifier**
  - Recommended to add idempotent control field, reduce duplicate data risk in extreme network scenarios.
- **Multi-process Write Strategy**
  - Can have multiple processes write different files or directories, but don't let multiple processes write same log file.
- **Container Environment**
  - Recommended to map log directory to container external persistent storage, avoid data loss after container destruction.

#### **Does LoggerConsumer support multi-threading? Does it support multi-process?**

Supports multi-threading. SDK's related write and flush logic has thread-safe guarantee, but single instance defaults to synchronous call model, multi-threading sharing same instance may not significantly improve throughput. Does not support multiple processes writing same file. If multiple processes simultaneously write same log file, may trigger `OverlappingFileLockException`. Correct approach is to have different processes write different files or directories.

#### **What are LoggerConsumer performance metrics?**

For specific performance test report please see Server-Java-sdk Performance Test Report.

#### **Does LoggerConsumer have data loss risk? How to avoid?**

If disk is full, host machine abnormal shutdown, log not timely flushed, or log directory unavailable, data loss risk still exists. Recommendations:

1. Regularly check log directory disk capacity and inode usage.
2. Reasonably adjust `bufferSize` and `autoFlush` based on business real-time requirement, don't blindly pursue large cache.
3. Ensure call `close()` before program exit, give SDK time to flush to disk.
4. In container or elastic environment, put log directory to persistent storage.

#### **Why does BatchConsumer have data loss risk? How to avoid?**

`TDBatchConsumer` maintains pending send queue and failed retry cache based on memory. As long as data hasn't successfully sent to server, risk of loss from process exit, memory overflow, long network abnormality or cache limit being filled still exists. Recommendations:

1. Production environment prioritize using `TDLoggerConsumer + LogBus`.
2. Reasonably increase `maxCacheSize` based on network quality and traffic scale, but also evaluate memory usage.
3. Don't set `batchSize` too large, to avoid single batch send time too long, retry cost too high.
4. Enable `autoFlush` when needing to reduce memory residence time.
5. Handle `NeedRetryException` at business level, rather than simply swallowing exception.

#### **What are BatchConsumer performance metrics? What scenarios is it suitable for?**

For specific performance test report please see Server-Java-sdk Performance Test Report. `TDBatchConsumer` is more suitable for medium-small data volume, stable network, simple integration priority scenarios accepting memory cache limitations; if you need higher reliability, still recommend prioritizing evaluation of `TDLoggerConsumer + LogBus`.

#### **Why is DebugConsumer forbidden in production environment?**

Because Debug mode sends one by one with strict validation, each request adds extra network and validation overhead, throughput and stability are not suitable as production pipeline.

#### **When to call `close()` method?**

Call when application is preparing normal exit. `close()` will attempt to continue flushing cached data or sending, is necessary step to avoid tail data loss. Recommended to execute uniformly in application lifecycle shutdown hook.

#### **Called `track()` or `userSet()` method in program, why no data visible in TE backend?**

Please check the following situations in order:

- **Check upload address and APP_ID**
  - `curl https://push_url/health-check`, return `ok` means integration address reachable.
  - `curl https://push_url/check_appid?appid=targetAPPID`, return `{"code":0}` means integration address and APP_ID match.
- **Too few data, not triggered write or send**
  - `TDLoggerConsumer` and `TDBatchConsumer` both depend on cache threshold, auto-flush or manual `flush()` to actually flush to disk/upload.
  - `flush()` can be used for troubleshooting, but not recommended for high frequency call in production code.
- **Error Data**
  - Can view error data reason in Web interface.
- **Data Time**
  - Server data receive time range upper limit is from 3 years before server time to 3 days after.
  - Client data receive time range upper limit is from 10 days before server time to 3 days after.
- **Historical Channel**
  - If project enabled historical channel, when uploading historical data 10 days ago, need to confirm if correctly entered historical channel pipeline.
- **Tracking Plan**
  - If project enabled tracking plan, and set "Events not in tracking plan: not allowed to store", events not in plan will be directly blocked.
- **Whitelist**
  - If project configured IP whitelist, need to confirm current upload source IP is in whitelist; whitelist effect usually has brief delay.

#### **Why is #ip missing in uploaded data?**

Please prioritize checking the following:

- Whether `#ip` is explicitly written into event properties.
- Whether `#ip` value is valid IP.
- Whether currently mistakenly using old version custom wrapper from historical code. For v3.x SDK, recommended to directly write `#ip` into event properties `Map<String, Object>` per official example, don't continue using old version manual assembly message approach.

# Preset Properties, Special Type Upload

#### **How to upload Object and Object Group types with Java SDK?**

Java SDK 1.9.0 and above support Object and Object Group types. In v3.x can continue using Object and `List<Map<String, Object>>` way to organize properties, complex type examples can refer to Server SDK Complex Type Upload.

#### **If a property is first uploaded as null value, how to upload?**

Object Group:

```java
Map<String, Object> properties = new HashMap<>();

List<Map<String, Object>> arrayRowTest = new ArrayList<>();
// Put at least one empty object, avoid being recognized as normal list type
arrayRowTest.add(new HashMap<>());

properties.put("array_row_test", arrayRowTest);
// Upload logic...
```

List:

```java
Map<String, Object> properties = new HashMap<>();

List<String> arrayTest = new ArrayList<>();
properties.put("array_test", arrayTest);
// Upload logic...
```

Object, Number, Text, Time, Boolean type properties don't support directly uploading `null`. If field currently has no value, don't pass that property, let result remain empty in data table.

#### **Common Properties**

Server-side common properties cannot be precise to user level. In multi-threading or concurrent request scenarios, if putting user-level fields into common properties,is prone to user dimension mismatch. Recommended to only put stable and globally consistent fields in common properties, such as server ID, deployment environment, service node identifier etc.; user-level, request-level, event-level fields should be directly put in current event properties.

#### **Timezone**

If event time is not UTC+8, and want to preserve original timezone offset information, can add `#zone_offset` field in normal properties. For example event time is UTC+0, can set `#zone_offset` to numeric value `0`.

#### **Updatable Events**

In cluster environment, if updatable events have millisecond-level concurrent updates, may appear out-of-order consumption, causing final result not matching expectation. When encountering such scenarios, recommended to add a sorting normal property in event properties, such as `order`, and set transaction property in event, let server decide whether to overwrite in order. Example:

```java
Map<String, Object> properties = new HashMap<>();
properties.put("status", 2);
properties.put("order", 1);
properties.put("#transaction_property", "order");

ta.trackUpdate("account_id", "distinct_id", "order_status_changed", "event_id_1", properties);
```

# Exception Errors

#### **Multi-process file write OverlappingFileLockException exception, how to handle?**

`TDLoggerConsumer` doesn't support multiple processes writing same file. When this exception occurs, should adjust to "multi-process write different files" or "multi-process write different directories", don't hard retry.

#### **track() throws exception "exception : cn.thinkingdata.tga.javasdk.exception.InvalidArgumentException: The supported data type including: Number, String, Date, Boolean,List. Invalid property: xxx", how to handle?**

If exception class name still comes from `cn.thinkingdata.tga.javasdk.exception`, means current project still using old SDK or old API. Recommended to directly upgrade to v3.x, and uniformly replace with new package name `cn.thinkingdata.analytics` and camelCase methods. Also check property value typewhether it meets requirements. Supported common types include String, Number, Boolean, Time, Object, Object Group and Array; unsupported types should be converted at business side before uploading.

#### **How to handle NeedRetryException?**

When SDK continuously retry fails when sending data, may throw `NeedRetryException`. This usually means network pipeline, server reachability or integration configuration has issues. Recommendations:

1. Record exception and print key information, don't directly swallow.
2. Combine monitoring to judge if brief network jitter or continuous failure.
3. During continuous exception, prioritize pausing high frequency upload or switching to more secure pipeline, avoid cache continuously filling.
4. After failure recovery, gradually resume business traffic.

#### **Can BatchConsumer get failed uploaded data?**

SDK itself won't directly expose a "failed data list" for business side to read. Failed batches are usually handled by internal cache and retry mechanism, after exceeding cache limit will be discarded. Therefore if you have high requirement for failure traceability, should prioritize using flush to disk solution, rather than relying on memory cache.

#### **Using thread pool for upload found thread queue accumulation, thread pool blocked, what reason? How to handle?**

If multiple threads frequently share same `TDAnalytics` instance for upload, internal synchronization control will keep send order consistent with call order, but also bring blocking and accumulation. Handling methods usually have two:

1. If different threads have no strict order dependency, can split multiple SDK instances by thread or by shard.
2. If scenario focuses more on stability and peak shaving capability, can switch to `TDLoggerConsumer + LogBus`.

#### **NullPointerException when calling data upload interface (track, userSet, etc.)**

Please carefully check passed property `Map` whether contains `null` key or `null` value. Business code should filter null values before assembling properties; for fields "without value", directly don't pass, don't explicitly put `null`.
