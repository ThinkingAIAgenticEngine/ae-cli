---
topic: SDK Selection Guide
sources:
  - raw/data-ingestion-guide.md
  - raw/data-ingestion-guide/client-sdk.md
  - raw/data-ingestion-guide/server-sdk.md
  - raw/data-ingestion-guide/data-import-tools.md
  - raw/preparations-before-data-ingestion.md
generated: 2026-06-16
---

# SDK Selection Guide

## Overview

ThinkingData (AE) provides three primary data ingestion methods: **Client SDK**, **Server SDK**, and **Data Import Tools**. Each approach serves distinct use cases and comes with its own trade-offs. This guide helps you understand when to choose each method, and how to combine them for a robust data tracking architecture.

Before selecting an ingestion method, you must complete three foundational steps:

1. **Define your data tracking scheme** based on business analysis requirements (what events, what properties, what user attributes).
2. **Obtain your Project APP ID** and **data receiver URL** from the AE console (SaaS users find it on the project management page; private deployment users configure a custom URL).
3. **Verify receiver connectivity** by visiting `https://YOUR_RECEIVER_URL/health-check` -- the page should return `ok`.

---

## Data Ingestion Methods at a Glance

| Dimension | Client SDK | Server SDK | Data Import Tools |
|---|---|---|---|
| **Primary role** | Collect user behavior on client devices (app, web, game) | Track business logic events from backend services | Import historical data or stream logs into AE |
| **Deployment** | Embedded in client app (Android, iOS, JS, Unity, etc.) | Integrated into backend server code | Standalone process or plugin (LogBus, DataX, Filebeat) |
| **Data captured** | User interactions (clicks, page views, installs), device info, app state | Transactions, API calls, server-side business events, core metrics | Existing log files, database tables, third-party data |
| **Timeliness** | Near real-time | Near real-time | Varies: LogBus is real-time streaming; DataX is batch-oriented |
| **Device information** | Automatically included | Not available (server does not know device details) | Depends on source data |
| **Accuracy** | Good for UI interactions; may miss events when offline | High (server events are deterministic) | Depends on source data quality |
| **Ease of setup** | Simple -- SDK handles formatting, batching, retry | Moderate -- requires server code changes | Moderate to complex -- requires data pipeline configuration |

---

## Client SDK

### Description

The Client SDK is embedded directly in your end-user applications. It automatically tracks device information, manages user identity (generating a `#distinct_id` by default), and sends events to the AE receiver. The SDK handles data formatting, batching, and network retry logic for you.

### Supported Platforms

| Category | Platforms |
|---|---|
| **Native Mobile** | Android, iOS, MacOS |
| **Web / H5** | JavaScript |
| **Game Engines** | Unity, Unreal, Cocos2d-x, CocosCreator, Corona |
| **Cross-Platform** | React Native, Flutter |
| **Desktop / Embedded** | C++, C# |

### Key Capabilities

- **Automatic device information collection**: The SDK automatically tracks preset properties such as device model, OS version, screen resolution, network type, and carrier.
- **User identification management**: Generates a random `#distinct_id` for anonymous users, and accepts `#account_id` after login. Both IDs are carried on every event, enabling cross-device user stitching.
- **Automatic event tracking**: Common behaviors like app install, app start, and app end can be collected automatically (depending on the SDK variant).
- **Offline buffering**: Events are queued locally when the device is offline and sent when connectivity is restored.

### When to Use

- You need to capture user-facing interactions: page views, button taps, form submissions, video plays, in-game actions.
- You need device-level context (OS version, device model, carrier, screen size) for your analysis.
- Your application has an unauthenticated browsing experience and you need to track anonymous users before they log in.
- You are building a mobile app, web app, or mobile game.

### Pros

- Minimal developer effort for basic setup -- usually a few lines of initialization code.
- SDK handles data formatting, retry, and batching automatically.
- Preset properties (device info, app version, etc.) are tracked without extra work.
- Offline buffering ensures data is not lost during connectivity gaps.

### Cons

- Cannot track server-side business logic (payment verification, API calls, database writes).
- Subject to ad-blockers and network restrictions on web.
- Data may be lost if the user uninstalls the app before events are flushed.
- Some events (e.g., purchase completion confirmation) are more reliable when tracked server-side.

---

## Server SDK

### Description

The Server SDK is integrated into your backend application code. Unlike the Client SDK, it does not run on the user's device and therefore cannot collect device-level information. However, it provides deterministic, tamper-proof event tracking for business-critical operations. The Server SDK typically works with a **LoggerConsumer + LogBus** architecture for production deployments: the SDK writes events to log files, and LogBus reads, transforms, and forwards them to the AE receiver.

### Supported Languages

| Language | Language |
|---|---|
| Golang | Python |
| Java | Ruby |
| C | C# |
| Node.js | PHP |
| Lua | C++ |
| ErLang | |

### Key Capabilities

- **Accurate business event tracking**: Events are generated directly from your backend logic, ensuring correctness and completeness.
- **Batch and async sending**: Supports multiple consumer modes (LoggerConsumer for log output, BatchConsumer for direct API sending, AsyncConsumer for non-blocking sends).
- **User data management**: APIs to set user properties (`user_set`, `user_setOnce`, `user_add`, `user_del`, `user_append`).
- **No device-level preset properties**: You must manually pass any contextual data needed in analysis.

### When to Use

- You need to track business transactions: payment success/failure, order creation, subscription changes, API call results.
- You want tamper-proof data that cannot be manipulated on the client side.
- You need to import historical or batched data from your backend databases.
- You are combining server-side tracking with LogBus for high-throughput, fault-tolerant data pipelines (the recommended production architecture).

### Pros

- Highest data accuracy and reliability for backend events.
- Immune to client-side ad-blockers, network issues, or uninstalls.
- Full control over what is tracked and when.
- Easily integrates with existing backend logging and monitoring infrastructure.

### Cons

- Cannot collect device information or client-side user behavior.
- Requires coordination between frontend and backend to link user identities (you must pass `#distinct_id` or `#account_id`).
- More development effort than a simple Client SDK integration.
- No built-in offline buffering -- you must handle failures at the application or pipeline level.

### Recommended Architecture: Server SDK + LogBus

The AE team's recommended server-side tracking architecture pairs the **Server SDK** with **LogBus**. The flow works as follows:

1. Your application code calls the Server SDK to track events.
2. The SDK (configured with `LoggerConsumer`) writes event data to a log file in a structured format.
3. LogBus tails the log file, batches events, and forwards them to the AE receiver over HTTP.

This architecture is preferred because:
- **Stability**: The SDK is decoupled from network delivery; log files persist if LogBus is temporarily down.
- **Timeliness**: LogBus streams data continuously with low latency.
- **Efficiency**: LogBus handles batching, compression, and retry logic, keeping your application code simple.
- **Fault tolerance**: If the AE receiver is unreachable, LogBus retries without affecting your application.

---

## Data Import Tools

### Description

Data Import tools are standalone utilities for importing existing or historical data into AE. They are not embedded in application code; instead, they operate on log files, databases, or message queues. The main distinction is between **streaming tools** (LogBus) and **batch tools** (DataX, Filebeat + Logstash).

### Available Tools

| Tool | Type | Use Case |
|---|---|---|
| **LogBus2** | Streaming (resident service) | High-throughput real-time log streaming; recommended for production Server SDK pipelines |
| **LogBus (v1)** | Streaming (resident service) | Legacy version; use LogBus2 for new projects |
| **LogBus Windows** | Streaming (resident service) | Windows Server deployments |
| **ta-datax-writer** | Batch (on-demand) | Import heterogeneous data from multiple data sources (MySQL, HDFS, etc.); not resident |
| **Filebeat + Logstash** | Streaming (resident service) | Organizations already using ELK stack for log collection |

### When to Use

- **Historical data migration**: You have months or years of existing event data in databases or logs that need to be imported into AE.
- **Batch data import**: You periodically need to load data from an external system (CRM, ERP, data warehouse).
- **High-throughput server-side data pipeline**: LogBus is the recommended companion to the Server SDK for production environments.
- **ELK stack integration**: Your organization already uses Filebeat and Logstash for log collection, and you want to forward a subset of logs to AE.

### Tool Comparison

| Dimension | LogBus (v1/v2) | DataX (ta-datax-writer) | Filebeat + Logstash |
|---|---|---|---|
| **Operation mode** | Resident daemon, continuous streaming | On-demand batch job | Resident daemon, continuous streaming |
| **Data sources** | Log files (from Server SDK LoggerConsumer) | MySQL, Oracle, HDFS, Hive, and more | Any log source Filebeat can tail |
| **Timeliness** | Near real-time (seconds) | Batch (hours, scheduled) | Near real-time (seconds) |
| **Fault tolerance** | Built-in retry, checkpoint, and resume | Manual re-run on failure | Filebeat registry tracks position |
| **Heterogeneous data** | No (structured JSON logs expected) | Yes (rich data source connector support) | No (log-oriented) |
| **Best for** | Production server-side tracking pipeline | One-time or periodic historical data imports | Existing ELK users adding AE as output |

### Pros

- Enable importing large volumes of historical data without changing application code.
- LogBus provides production-grade resilience with checkpointing and automatic retry.
- DataX supports a wide variety of data sources.
- Decoupled from application logic -- no code changes needed for import workflows.

### Cons

- Additional infrastructure to deploy and monitor (LogBus requires a running process).
- Batch tools (DataX) do not guarantee real-time data delivery.
- Requires careful data format mapping to AE's event schema.
- Not suitable for collecting user-device-level information (use Client SDK for that).

---

## Selection Decision Matrix

Use the following table to guide your choice based on your primary requirement.

| Your Requirement | Recommended Method | Rationale |
|---|---|---|
| Track user clicks, page views, app interactions | **Client SDK** | Runs on device; captures UI events and device context automatically |
| Track payment completion, order fulfillment | **Server SDK** | Server-side events are authoritative and tamper-proof |
| Import 12 months of historical user activity | **DataX (ta-datax-writer)** | Batch-oriented; supports multiple database sources |
| High-throughput production event pipeline | **Server SDK + LogBus2** | Decoupled architecture with fault tolerance and low latency |
| Both client behavior and server business events | **Client SDK + Server SDK** (combined) | Each tracks what it does best; link via `#distinct_id` / `#account_id` |
| Existing ELK stack, want to add AE | **Filebeat + Logstash** | Leverages existing infrastructure with AE output plugin |
| Mobile game analytics (Unity/Unreal) | **Client SDK (Unity/Unreal)** | Game engine SDKs include engine-specific preset properties |
| Minimal setup for a quick prototype | **Client SDK (JavaScript / Android / iOS)** | Fastest time-to-first-event; SDK handles formatting |
| GDPR-sensitive or server-only data | **Server SDK** | Data never touches end-user devices |

---

## Combining Methods

In practice, most production systems use a combination of methods. A typical architecture looks like this:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Mobile App   │────▶│  Client SDK   │────▶│              │
│  (Android/iOS)│     │  (device info,│     │              │
│               │     │   user actions)│     │              │
└──────────────┘     └──────────────┘     │              │
                                          │  AE Receiver │
┌──────────────┐     ┌──────────────┐     │              │
│ Backend App   │────▶│  Server SDK   │────▶│              │
│ (Go/Java/Py) │     │ (LoggerConsumer)│    │              │
│               │     │       │        │     │              │
└──────────────┘     └───────┼────────┘     │              │
                             │ log file     │              │
                      ┌──────▼────────┐     │              │
                      │    LogBus2     │────▶│              │
                      │ (streams logs) │     │              │
                      └───────────────┘     └──────────────┘
```

**Key integration point**: Both Client SDK and Server SDK must use the same `#distinct_id` or `#account_id` for a given user. The typical pattern is:
1. Client SDK generates a `#distinct_id` on first launch.
2. After login, the client calls `login(accountId)` to set the `#account_id`.
3. The client passes the `#account_id` (or `#distinct_id`) to the backend with each API request.
4. The Server SDK uses this ID when tracking server-side events for the same user.

---

## Pre-ingestion Checklist

Before starting any of these approaches, ensure you have:

| Requirement | How to Obtain |
|---|---|
| **Project APP ID** | Check the project management page in AE console |
| **Receiver URL** | For SaaS: check the project settings page. For private deployment: configure a custom URL |
| **Receiver health verified** | Visit `https://RECEIVER_URL/health-check` in a browser; should return `ok` |
| **Data tracking scheme defined** | Document which events to track, their properties, data types, and trigger conditions |
| **User identification scheme defined** | Decide how you will set `#distinct_id` and `#account_id` across client and server |
| **Data format compliance planned** | Event/property names: letters, digits, and underscores only, max 50 chars. Event names are case-sensitive; property names are case-insensitive. |

---

## Data Format Considerations

Regardless of which ingestion method you choose, all data sent to AE must conform to the same data model:

### Supported Data Types

| AE Data Type | Example Value | JSON Type | Notes |
|---|---|---|---|
| **Numeric** | `123`, `1.23` | Number | Range: -9E15 to 9E15 |
| **Text** | `"ABC"`, `"Shanghai"` | String | Max 2 KB per value (default) |
| **Time** | `"2019-01-01 00:00:00"` | String | Format: `yyyy-MM-dd HH:mm:ss` or `yyyy-MM-dd HH:mm:ss.SSS` |
| **Boolean** | `true`, `false` | Boolean | -- |
| **List** | `["a","1","true"]` | Array(String) | Max 500 elements; all elements coerced to strings |
| **Object** | `{"hero_name":"Liu Bei","hero_level":22}` | Object | Max 100 sub-properties |
| **Object Group** | `[{...}, {...}]` | Array(Object) | Max 500 objects |

**Important**: AE determines a property's data type based on the first received value. Subsequent data with a conflicting type for the same property will be silently dropped. Define types carefully in your tracking plan before beginning ingestion.

### Naming Rules

- Event names and property names may only contain letters, digits, and underscores (`_`).
- Names must start with a letter.
- Maximum length: 50 characters.
- Event names are **case-sensitive** (e.g., `PaymentSuccess` and `paymentsuccess` are different events).
- Property names are **case-insensitive** (e.g., `OrderId` and `orderid` are treated as the same property).

### Preset Properties

Properties prefixed with `#` (e.g., `#app_version`, `#os_version`, `#device_model`) are **preset properties** automatically collected by the Client SDK. You do not need to set them manually. The Server SDK and data import tools do not populate preset properties, so you must include any necessary context in your custom properties.

---

## Quick Reference: Supported Platforms by Method

### Client SDK -- Platform Coverage

| Platform | SDK Available |
|---|---|
| Android | Yes |
| iOS | Yes |
| Web / H5 | Yes (JavaScript) |
| Unity | Yes |
| Unreal | Yes |
| Cocos Creator | Yes |
| Cocos2d-x | Yes |
| Corona | Yes |
| React Native | Yes |
| Flutter | Yes |
| C++ | Yes |
| C# | Yes |
| MacOS | Yes |

### Server SDK -- Language Coverage

| Language | SDK Available |
|---|---|
| Golang | Yes |
| Java | Yes |
| Python | Yes |
| Node.js | Yes |
| Ruby | Yes |
| C | Yes |
| C# | Yes |
| C++ | Yes |
| PHP | Yes |
| Lua | Yes |
| ErLang | Yes |

### Data Import Tools -- Coverage

| Tool | Environment | Data Sources |
|---|---|---|
| LogBus2 | Linux, macOS | Log files (JSON) |
| LogBus (v1) | Linux, macOS | Log files (JSON) |
| LogBus Windows | Windows | Log files (JSON) |
| DataX (ta-datax-writer) | Cross-platform (Java) | MySQL, Oracle, HDFS, Hive, and more |
| Filebeat + Logstash | Cross-platform | Any Filebeat-compatible source |

---

## Decision Flowchart

When choosing your ingestion approach, work through these questions in order:

1. **Do you need to track user interactions on a client device (tap, swipe, page view)?**
   - Yes → Use **Client SDK** for those events.
   - No → Go to question 2.

2. **Do you need to track business logic events on your backend (payments, orders, API calls)?**
   - Yes → Use **Server SDK**. For production, configure with `LoggerConsumer` and add **LogBus2** as the delivery pipeline.
   - No → Go to question 3.

3. **Do you need to import historical or batch data from existing systems?**
   - Yes → Use **DataX (ta-datax-writer)** for heterogeneous sources, or **LogBus** if data is already in log files.
   - No → Go to question 4.

4. **Do you need a REST API for direct, programmatic event submission?**
   - Yes → Use the **Restful API** (see separate documentation). This is suitable for custom integrations where no SDK or tool fits.

For most applications, the answer will be a combination of **Client SDK** (for user-facing events) and **Server SDK + LogBus** (for backend business events), with **DataX** reserved for one-time historical data imports.

---

## Additional Resources

- [AE Basic Knowledge & Data Rules](https://thinkingdata.feishu.cn/docx/PCFEdBbNOo306LxIghpc7IfinHf) -- Essential reading on AE data model and field constraints.
- [User Identification Rules](https://thinkingdata.feishu.cn/wiki/Pov9wECdsi2QQsk4NN9cEPsvnyc) -- How AE resolves `#distinct_id` and `#account_id` into a single `#user_id`.
- [Preset Properties & System Fields](https://thinkingdata.feishu.cn/wiki/HoS9wEGASi5cpMkA2KocFLkfndg) -- Complete list of `#`-prefixed properties collected automatically by Client SDKs.
- [Restful API User Guide](https://thinkingdata.feishu.cn/wiki/Jsp1w2ewJiXA2wkBvU8ckXxhn6g) -- Direct HTTP-based event submission.
- [GitHub: ThinkingDataAnalytics](https://github.com/ThinkingDataAnalytics) -- Open-source SDK implementations and tools.

For questions about your tracking architecture, consult an AE analyst or reach out through the support group chat.
