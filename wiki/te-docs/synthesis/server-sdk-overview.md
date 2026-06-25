---
topic: Server SDK Overview
sources:
  - raw/data-ingestion-guide/server-sdk.md
  - raw/data-ingestion-guide/server-sdk/java.md
  - raw/data-ingestion-guide/server-sdk/python.md
  - raw/data-ingestion-guide/server-sdk/golang.md
  - raw/data-ingestion-guide/server-sdk/nodejs.md
  - raw/data-ingestion-guide/server-sdk/php.md
generated: 2026-06-16
---

# Server SDK Overview

The ThinkingData server SDK family provides language-specific libraries for ingesting event data and user properties from server-side applications into the ThinkingData analytics platform. All server SDKs share a common architecture: they accumulate data locally (typically writing JSON log files to disk) and rely on LogBus to pick up files and upload them to the TA backend. This document covers six languages -- Java, Python, Golang, Node.js, PHP -- with cross-language comparisons for initialization, event tracking, user properties, buffering, teardown, and major differences.

## Architecture Summary

Every server SDK follows the same three-layer model:

1. **Consumer** -- accumulates events in memory, serializes them to JSON, and writes batch files to a local directory.
2. **SDK client (TDAnalytics or equivalent)** -- exposes the track/user-set/flush/close API and delegates to the consumer.
3. **LogBus** -- a separate daemon that watches the consumer's output directory, tails the log files, and uploads data to ThinkingData. LogBus is the recommended production transport.

The architecture is deliberately decoupled so the SDK never blocks on network I/O; data is always persisted to disk first.

```
Application code
    |
    v
TDAnalytics client  --track/userSet/flush/close-->  Consumer  --writes-->  Local log files
                                                                                |
                                                                                v
                                                                             LogBus  --uploads-->  ThinkingData servers
```

## Supported Languages at a Glance

| Language | Package/Module | Version (latest documented) | Minimum Runtime |
|---|---|---|---|
| Java | `cn.thinkingdata:thinkingdatasdk` (Maven) | v3.0.4-beta.1 (2026-01) | JDK 8 |
| Python | `ThinkingDataSdk` (pip) | v3.0.0 (2023-10) | (not specified) |
| Golang | `github.com/ThinkingDataAnalytics/go-sdk/v2` | v2.3.0 (2026-03) | (not specified) |
| Node.js | `thinkingdata-node` (npm) | v1.5.0 (2024-03) | (not specified) |
| PHP | `thinkinggame/ta-php-sdk` (Composer) | v3.1.1 (2024-07) | PHP 5.5+ |

Other languages with server SDKs (not covered in detail here): C, Ruby, C#, Lua, C++, ErLang.

---

## Consumer Type and Naming

Each language has its own consumer class name, though the role is identical across languages:

| Language | Consumer Class | Buffer Trigger |
|---|---|---|
| Java | `TDLoggerConsumer` | Byte threshold (default 8192 bytes) |
| Python | `TDLogConsumer` | Count threshold (default 5 events; configurable `buffer_size`) |
| Golang | `TDLogConsumer` (via `NewLogConsumerWithConfig`) | Real-time write; `Flush()` syncs memory cache |
| Node.js | `TDLoggingConsumer` (internal, created by `initWithLoggingMode`) | Real-time write to disk |
| PHP | `TDFileConsumer` | Count threshold (default 100 events; configurable in constructor) |

The critical difference: **Java** flushes when the accumulated JSON string length exceeds a byte threshold (8192 by default), while **Python** and **PHP** flush when the in-memory event count hits a threshold. **Golang** and **Node.js** write to disk in real time per event and use `flush` only to sync the filesystem cache or the OS buffer.

---

## Initialization

All SDKs require a log directory path where the consumer will write files. Some offer additional configuration via a config object.

### Java

```java
// Simple initialization
TDAnalytics te = new TDAnalytics(new TDLoggerConsumer("LOG_DIRECTORY"), false);

// Full initialization with configurable prefix
TDLoggerConsumer.Config config = new TDLoggerConsumer.Config("LOG_DIRECTORY");
config.setFilenamePrefix("unique_name");
TDAnalytics te = new TDAnalytics(new TDLoggerConsumer(config), false);
```

The second argument (`false`) controls debug mode. The SDK is thread-safe and uses synchronous calls; the documentation recommends invoking API calls in a child thread to avoid blocking business threads.

### Python

```python
from tgasdk.sdk import *

# Simple
te = TDAnalytics(TDLogConsumer("LOG_DIRECTORY"))

# With buffer size control
te = TDAnalytics(TDLogConsumer("LOG_DIRECTORY", buffer_size=20))
```

The `LOG_DIRECTORY` must match the LogBus listening folder.

### Golang

```go
import "github.com/ThinkingDataAnalytics/go-sdk/v2/src/thinkingdata"

config := thinkingdata.TDLogConsumerConfig{
    Directory: "LOG_DIRECTORY",
}
consumer, _ := thinkingdata.NewLogConsumerWithConfig(config)
te := thinkingdata.New(consumer)
```

### Node.js

```javascript
const ThinkingData = require('thinkingdata-node');

// Simple
let teSDK = ThinkingData.initWithLoggingMode('LOG_DIRECTORY');

// With options
let teSDK = ThinkingData.initWithLoggingMode('LOG_DIRECTORY', {
    filePrefix: 'test',
    rotateHourly: true
});
```

Note that Node.js uses a factory function (`initWithLoggingMode`) rather than a constructor. Options include `filePrefix` and `rotateHourly`.

### PHP

```php
require_once "vendor/autoload.php";
use ThinkingData\TDLog;
use ThinkingData\TDAnalytics;
use ThinkingData\TDFileConsumer;

TDLog::$enable = true;

$consumer = new TDFileConsumer("LOG_DIRECTORY", 200, true, "LOG_FILE_PREFIX");
$teSDK = new TDAnalytics($consumer, true);
```

The `TDFileConsumer` constructor accepts `(directory, bufferSize, autoFlush, filePrefix)`. Setting `TDLog::$enable = true` enables debug logging.

### Initialization Comparison

| Aspect | Java | Python | Golang | Node.js | PHP |
|---|---|---|---|---|---|
| Create style | Constructor | Constructor | Config + Constructor | Factory function | Constructor |
| Consumer injection | First arg | First arg | First arg (via New) | Implicit in factory | First arg |
| Debug/verbose flag | Second arg (boolean) | Not in init | Not in init | Not in init | Second arg (boolean) |
| File prefix config | `setFilenamePrefix` | Not documented separately | In `TDLogConsumerConfig` | `filePrefix` option | Fourth constructor arg |
| Log rotation | Not in init | Not in init | Not in init | `rotateHourly` option | Not in init |

---

## Sending Events -- `track`

All languages provide a `track` (or `Track`) method. The event name and properties must follow the same rules across languages: property keys are strings (max 50 chars, must start with a letter, containing alphanumerics and underscores; case-insensitive with uppercase converted to lowercase). Values support string, number, boolean, Date/time, object (map/dict), array of objects, and array of primitives.

### Parameter Order Differences (Critical)

This is the single most important cross-language difference. The order of `account_id` and `distinct_id` varies:

| Language | API Signature | Order |
|---|---|---|
| Java | `te.track(account_id, distinct_id, event, properties)` | account_id first |
| Python | `te.track(distinct_id, account_id, event, properties)` | distinct_id first |
| Golang | `te.Track(accountId, distinctId, event, properties)` | accountId first |
| Node.js | `teSDK.track({accountId, distinctId, event, properties})` | Object (named keys) |
| PHP | `$teSDK->track(distinct_id, account_id, event, properties)` | distinct_id first |

Java and Golang place `account_id` first. Python and PHP place `distinct_id` first. Node.js avoids the ambiguity entirely by using an object literal with named properties.

### Code Examples

**Java** -- HashMap-based properties, supports nested objects and arrays:

```java
HashMap<String,Object> properties = new HashMap<>();
properties.put("#ip", "192.168.1.1");
properties.put("channel", "te");
properties.put("age", 1);
properties.put("isSuccess", true);
properties.put("birthday", new Date());

te.track("account_id", "distinct_id", "payment", properties);
```

**Python** -- dict-based properties; preset properties like `#time` and `#ip` are passed in the properties dict:

```python
properties = {
    "#time": datetime.datetime.now(),
    "#ip": "192.168.1.1",
    "Product_Name": "商品名",
    "Price": 30,
    "OrderId": "订单号abc_123"
}
te.track(distinct_id, account_id, "Payment", properties)
```

**Golang** -- `map[string]interface{}` with PascalCase method names. Errors are returned rather than thrown:

```go
properties := map[string]interface{}{
    "channel":   "te",
    "age":       1,
    "is_success": true,
    "birthday":  time.Now(),
    "object": map[string]interface{}{"key": "value"},
    "objectArr": []interface{}{map[string]interface{}{"key": "value"}},
    "arr":       []string{"value"},
}
err := te.Track(accountId, distinctId, "payment", properties)
```

**Node.js** -- event object with callback for async error handling:

```javascript
let trackEvent = {
    accountId: '2222',
    distinctId: '1111',
    event: 'test_event',
    time: new Date(),
    ip: '202.38.64.1',
    properties: { prop_double: 134.1 },
    callback(e) {
        if (e) { console.log(e); }
    }
};
teSDK.track(trackEvent);
```

**PHP** -- associative arrays; `distinct_id` first:

```php
$properties = array();
$properties['age'] = 20;
$properties['Product_Name'] = 'c';
$properties['update_time'] = date('Y-m-d H:i:s', time());

$teSDK->track($distinct_id, $account_id, "viewPage", $properties);
```

---

## User Properties -- `user_set` / `userSet` / `UserSet`

The user-set API replaces (or creates, if not yet present) user property values on the specified user. The naming convention follows each language's idiomatic style:

| Language | Method Name | Notes |
|---|---|---|
| Java | `te.userSet(account_id, distinct_id, properties)` | Same parameter order as `track` |
| Python | `te.user_set(account_id="...", distinct_id="...", properties=...)` | Keyword arguments; flexible order |
| Golang | `te.UserSet(accountId, distinctId, properties)` | PascalCase |
| Node.js | `teSDK.userSet({accountId, properties, callback})` | Object pattern |
| PHP | `$teSDK->user_set(distinct_id, account_id, properties)` | Same parameter order as `track` |

Code examples:

```java
// Java
Map<String,Object> userProperties = new HashMap<>();
userProperties.put("user_name", "TA");
te.userSet("account_id", "distinct_id", userProperties);
```

```python
# Python -- note keyword arguments
te.user_set(account_id="account_id", distinct_id="distinct_id",
            properties={"user_name": "ABC"})
```

```go
// Golang
err := te.UserSet("accountId", "distinctId", map[string]interface{}{
    "user_name": "TA",
})
```

```javascript
// Node.js
teSDK.userSet({
    accountId: 'node_test',
    properties: {
        prop_string: 'hello',
        prop_int: 666,
    },
    callback(e) { if (e) console.log(e); }
});
```

```php
// PHP
$teSDK->user_set('distinct_id', 'account_id', $properties);
```

---

## Buffer and Flush Behavior

All SDKs buffer events in memory before writing to disk, but the trigger mechanism and default thresholds differ:

| Language | Buffer Trigger | Default Threshold | `flush()` Behavior |
|---|---|---|---|
| Java | Byte length of accumulated JSON | 8192 bytes | Force immediate disk write |
| Python | Event count in array | 5 events | Force immediate disk write |
| Golang | Per-event write (real time) | N/A | Sync filesystem cache to disk |
| Node.js | Per-event write (real time) | N/A | Not explicitly featured; data written in real time |
| PHP | Event count in array | 100 events | Force immediate disk write |

### Best Practice for `flush()`

In all languages, `flush()` forces data to disk immediately:

```java
te.flush();     // Java
te.flush()      # Python
te.Flush()      // Go
$te->flush();   // PHP
```

The documentation uniformly warns: frequent `flush()` calls degrade performance. Use sparingly -- typically only before process shutdown. For **Golang**, the SDK writes to disk in real time, and `Flush()` merely syncs the OS-level filesystem cache; manually calling it is generally unnecessary.

For **Node.js**, the SDK writes in real time and the API documentation does not include a dedicated `flush()` method.

---

## SDK Shutdown -- `close` / `close()` / `Close`

All SDKs must be explicitly closed before process exit to avoid losing buffered data:

| Language | Method | Notes |
|---|---|---|
| Java | `te.close()` | Call before server shutdown |
| Python | `te.close()` | Call before server shutdown |
| Golang | `te.Close()` | PascalCase |
| Node.js | `teSDK.Close()` | PascalCase |
| PHP | `$te->close()` | Surrounded by try/catch |

---

## Error Handling Patterns

| Language | Pattern |
|---|---|
| Java | Try/catch around each API call |
| Python | Try/except around each API call |
| Golang | Returned `error` value (check after each call) |
| Node.js | Callback receives error as first argument |
| PHP | Try/catch around each API call |

---

## Naming Convention Summary

Each SDK follows the host language's naming conventions:

| Convention | Java | Python | Golang | Node.js | PHP |
|---|---|---|---|---|---|
| Method names | camelCase | snake_case | PascalCase | camelCase | snake_case |
| Property dict type | `HashMap<String,Object>` | `dict` | `map[string]interface{}` | Plain object `{}` | `array()` / `[]` |
| Error handling | Exceptions | Exceptions | Return value | Callback (err, result) | Exceptions |
| Thread safety | Thread-safe (sync) | N/A | N/A | Async (event loop) | N/A |

---

## Complete Best-Practice Workflow (Cross-Language)

Regardless of language, the recommended sequence is:

1. **Initialize** the SDK consumer with a dedicated log directory.
2. **Send events** via `track`, always including both `distinct_id` and `account_id` to ensure correct user identity binding.
3. **Set user properties** via `user_set` / `UserSet` when user attributes change.
4. **Call `flush()`** before process shutdown to drain any remaining buffer.
5. **Call `close()`** to gracefully tear down the SDK.

### End-to-End Examples

**Java:**
```java
TDAnalytics te = new TDAnalytics(new TDLoggerConsumer("LOG_DIRECTORY"), false);
// ... send events and user properties ...
te.flush();
te.close();
```

**Python:**
```python
from tgasdk.sdk import *
te = TDAnalytics(TDLogConsumer("LOG_DIRECTORY"))
# ... send events and user properties ...
te.flush()
te.close()
```

**Golang:**
```go
consumer, _ := thinkingdata.NewLogConsumerWithConfig(thinkingdata.TDLogConsumerConfig{
    Directory: "./log_directory",
})
te := thinkingdata.New(consumer)
// ... send events and user properties ...
te.Flush()  // generally optional in Go
te.Close()
```

**Node.js:**
```javascript
var teSDK = ThinkingData.initWithLoggingMode('LOG_DIRECTORY');
// ... send events and user properties ...
// No explicit flush; Close() drains the buffer
teSDK.Close();
```

**PHP:**
```php
$consumer = new TDFileConsumer("LOG_DIRECTORY", 200, true, "te");
$teSDK = new TDAnalytics($consumer, true);
// ... send events and user properties ...
$te->flush();
$te->close();
```

---

## Language Selection Guide

| Criterion | Recommendation |
|---|---|
| JVM ecosystem (Spring, Kafka, Hadoop) | **Java** -- mature, thread-safe, Maven-native |
| Data science / ML pipelines | **Python** -- pip integration, idiomatic dict properties |
| Microservices / cloud-native (Kubernetes, high concurrency) | **Golang** -- real-time writes, no explicit flush needed, low overhead |
| Node.js backends / BFF layers | **Node.js** -- npm-native, callback-based async model, object-pattern API |
| LAMP stack / CMS / legacy PHP applications | **PHP** -- Composer-native, PHP 5.5+ compatibility |
| When parameter-order ambiguity is a concern | **Node.js** (named-object pattern) or **Python** (keyword arguments for `user_set`) |
| When you want the safest buffer guarantees | **Golang** or **Node.js** (real-time disk write per event) |
| When minimizing disk I/O is critical | **Java** (byte-threshold batch writes) or **PHP** (configurable count batch writes) |

---

## Key Takeaways

1. **All server SDKs share the same core APIs** -- init, track, user_set, flush, close -- differing only in naming convention and parameter order to match host language idioms.
2. **Parameter order for `track` is inconsistent across languages**: Java/Go put `account_id` first; Python/PHP put `distinct_id` first; Node.js uses named keys. Always consult the SDK-specific documentation.
3. **Buffer strategy varies**: Java batches by byte size, Python and PHP batch by event count, Go and Node.js write per-event in real time. This affects when you need to call `flush()`.
4. **LogBus is the universal transport**: all SDKs write to local files; LogBus handles the upload to ThinkingData servers.
5. **Always send both `account_id` and `distinct_id`** with every event to ensure correct user identity matching.
6. **Always call `close()`** before process termination to prevent data loss.
