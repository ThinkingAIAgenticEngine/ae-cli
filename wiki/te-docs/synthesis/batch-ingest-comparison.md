---
topic: Batch Ingestion Comparison
sources:
  - raw/data-ingestion-guide/data-import-tools.md
  - raw/data-ingestion-guide/data-import-tools/logbus2-user-guide.md
  - raw/data-ingestion-guide/data-import-tools/logbus-user-guide.md
  - raw/data-ingestion-guide/data-import-tools/ta-datax-writer-plugin-user-guide.md
  - raw/data-ingestion-guide/data-import-tools/filebeat-logstash-user-guide.md
  - raw/data-ingestion-guide/data-import-tools/logbus-windows-user-guide.md
generated: 2026-06-16
---

## Overview

ThinkingData provides four primary tools for batch data ingestion into the TA platform:
**LogBus2**, **LogBus (v1)**, **DataX Writer**, and **Filebeat + Logstash**.
Each tool serves distinct use cases, from real-time log tailing to one-off historical data
migration. This document compares their architectures, performance characteristics,
deployment complexity, and recommended use cases to help you select the right tool.

---

## Quick-Reference Comparison Table

| Dimension | LogBus2 | LogBus (v1) | DataX Writer | Filebeat + Logstash |
|---|---|---|---|---|
| **Current version** | 2.1.1.6 (Dec 2024) | 1.5.15.7 (Dec 2021) | DataX plugin | Logstash plugin v1.0.0 (Jun 2020) |
| **Language / Runtime** | Go (native binary) | Java (JDK 8+) | Java (DataX framework) | Java (Logstash) + Go (Filebeat) |
| **Memory footprint** | ~1/5 of LogBus v1 | Higher (JVM, ~2GB default max) | Depends on DataX job config | Filebeat ~10MB; Logstash JVM heavy |
| **Throughput** | 5x faster than LogBus v1 | Moderate | High (parallel channels + threads) | **Low** (explicitly noted; not for bulk) |
| **Data sources** | File (Glob), Kafka, SLS (Aliyun) | File (regex/Glob), Kafka | Any DataX reader (MySQL, HDFS, Hive, etc.) | File (via Filebeat) |
| **Primary use case** | Real-time + bulk; server SDK logs, Kafka pipelines | Real-time + bulk; legacy deployments | Batch historical data migration from databases/data warehouses | Lightweight real-time log tailing; existing ELK shops |
| **Deployment platforms** | Linux, macOS, Windows, Docker, K8s (Helm) | Linux, Windows (separate build), Docker | Anywhere DataX runs (Linux/macOS) | Anywhere ELK stack runs |
| **Compression** | gzip, none (HTTP layer) | gzip, lzo, lz4, snappy, none | gzip, lzo, lz4, snappy (DataX level) | gzip, none (Logstash output plugin) |
| **Multi-tenancy** | Multi APP_ID per instance, multi-pipeline | Multi APP_ID per instance | One APP_ID per job config | One APP_ID per Logstash output |
| **Monitoring** | Prometheus + Grafana dashboards, progress command | status, progress, doctor commands | DataX built-in job metrics | ELK-native monitoring (Elastic) |
| **Custom parsing** | gRPC plugin system | Java CustomInterceptor | DataX reader/writer column mapping | Ruby filter scripts |
| **Windows support** | Yes (native, v2.1.1.6) | Yes (v1.3.0, file source only) | No (DataX only) | Yes (Filebeat + Logstash) |

---

## Tool-by-Tool Analysis

### LogBus2

LogBus2 is the **recommended real-time ingestion tool** and the direct successor to the
original LogBus. It was rewritten in Go for dramatically lower resource consumption and
higher throughput.

**Architecture**: A single Go binary (`logbus`) that monitors data sources and pushes
data to the TA receiver over HTTP. It maintains a runtime directory with consumption
offset snapshots, enabling crash recovery without data loss (provided files are not
deleted before consumption completes).

**Data Sources**:
- **File**: Glob pattern matching against local log directories. Supports auto-deletion
  policies (`unit_remove` + `offset_remove`) and directory cleanup.
- **Kafka**: Full consumer group support with SASL authentication (PLAIN, SCRAM-SHA-256,
  SCRAM-SHA-512), cloud provider presets (Aliyun, Tencent, Huawei), and transactional
  read support (`read_committed`).
- **SLS (Aliyun Log Service)**: Via Kafka protocol bridge (requires Aliyun-side
  enablement).

**Performance Features**:
- CPU limit via `cpu_limit` config (default: unlimited)
- IOPS throttling (`limit` + `iops` config)
- HTTP compression (gzip) for bandwidth savings
- SIMD-accelerated JSON processing (since 2.1.1.4)
- Configurable `http_timeout` (200ms–600s, default 600s)

**Operational Commands**:
```shell
./logbus start                 # Start ingestion
./logbus stop                  # Graceful stop (no data loss)
./logbus restart               # Restart to pick up config changes
./logbus env                   # Verify config + TA connectivity
./logbus progress              # View per-file transmission progress
./logbus dev                   # Validate file format locally
./logbus reset                 # Clear all read offsets (use with caution)
./logbus update                # Self-update to latest version
```

**Deployment Options**:
- **Bare metal**: Download tarball, edit `conf/daemon.json`, run `./logbus start`
- **Docker**: Prebuilt image `thinkingdata/ta-logbus-v2:latest`; mount data, conf, log,
  and runtime directories as volumes
- **Kubernetes**: Helm chart with StatefulSet; PVC-backed for persistence; each pod
  handles its own file patterns via `container:` prefix in `values.yaml`

**Limitations**:
- Kafka source does not support the `progress`, `reset`, or `dev` commands as of v2.1.1.6
- Kafka consumption is load-balance mode; number of LogBus2 instances must not exceed
  partition count
- File patterns do not support regular expressions (Glob only)

**When to choose LogBus2**:
- You need the highest throughput with the lowest resource footprint
- You are starting a new deployment (greenfield)
- You need K8s-native deployment
- You require Prometheus/Grafana monitoring integration
- You are consuming from Kafka or SLS

---

### LogBus (v1)

The original LogBus, built on Apache Flume (Java). It is **mature and stable** but no
longer receives major feature updates. The last release (1.5.15.7) was a security patch
for the log4j vulnerability in December 2021.

**Architecture**: Java process embedding Flume components (Source -> Channel -> Sink).
Uses file-based or memory-based channels for buffering. Each APP_ID deployment requires
at least 10GB of disk space for channel buffers.

**Data Sources**:
- **File**: Java-standard regex or Glob matching (configurable via `TAIL_MATCHER`).
  Supports `DATE{YYYYMMDD}` templates for date-based directory structures (regex mode
  only).
- **Kafka**: Consumer group based, supports SASL authentication (since 1.5.15.5).
  Requires Kafka broker version 0.10.1.0+.

**Notable Features**:
- File format debugging via `data_debug` command (validates data format against TA spec)
- `doctor` command for automated troubleshooting
- `status` command for real-time speed, memory, and CPU monitoring
- Custom parser via Java `CustomInterceptor` interface (Maven/Gradle dependency)
- Multi-threaded transmission with configurable `NUMTHREAD`

**Limitations**:
- Higher memory footprint due to JVM overhead
- No native macOS support
- No K8s/Helm deployment option
- No multi-platform binary (separate Windows build at v1.3.0 with reduced features)
- End of active feature development

**When to choose LogBus v1**:
- You have an existing LogBus v1 deployment to maintain
- Your environment has special JDK constraints that make Go binaries impractical
- You need regex-based file matching (not available in LogBus2 Glob patterns)
- You need the `data_debug` bulk format validation command

---

### DataX Writer (ta-datax-writer)

The DataX Writer plugin is designed exclusively for **one-off bulk historical data
migration** from relational databases, data warehouses, HDFS, or other structured
sources into TA.

**Architecture**: A writer plugin for Alibaba's DataX framework. DataX manages the
reader (source) and writer (TA) in a job with configurable channel parallelism. Each
channel independently reads from the source and writes to TA via HTTP (receiver
endpoint).

**Column Mapping**: The writer maps source columns to TA data model fields via a
`column` array:
```json
{
  "index": "0",
  "colTargetName": "#distinct_id",
  "type": "string"
}
```

Each column specification requires at least one of `index` (source column ordinal) or
`value` (constant). Type conversion follows this mapping:

| DataX Internal Type | TA Data Type |
|---|---|
| Int | Number |
| Long | Number |
| Double | Number |
| String | String |
| Boolean | Boolean |
| Date | Date (with configurable `dateFormat`) |

**Supported Data Types**: `track` (event data) and `user_set` (user property data).

**Performance**: Throughput is determined by DataX's channel count (`speed.channel`) and
the writer's thread count (`thread`, default 3). These operate independently -- multiple
writer threads within each channel.

**Compression**: Supports gzip, lzo, lz4, snappy at the sink level.

**Limitations**:
- Only supports writing to TA clusters (single-purpose writer)
- Requires separate DataX installation and configuration
- No real-time/streaming capability -- batch job only
- One APP_ID per job JSON configuration
- No built-in offset tracking, retry, or crash recovery beyond DataX's job-level
  semantics

**When to choose DataX Writer**:
- You are migrating historical data from a database or data warehouse into TA
- The source is one of DataX's many supported readers (MySQL, Oracle, HDFS, Hive, ODPS,
  MongoDB, etc.)
- You need column-level type mapping and transformation
- The job is one-off or scheduled batch, not real-time streaming

---

### Filebeat + Logstash

This combination uses open-source ELK stack components for real-time log tailing. It is
best suited for teams **already operating an ELK stack** who want to add TA as an
additional output destination.

**Architecture**:
```
Log files -> Filebeat (tail) -> Logstash (filter/transform) -> TA Receiver
```

- **Filebeat**: Lightweight Go agent (~10MB memory) installed on each log-producing
  server. Monitors files via Glob patterns and ships lines to Logstash. Supports
  multiple input configurations with tag-based routing.
- **Logstash**: Java-based data processing pipeline. Receives events from Filebeat via
  the Beats input plugin on port 5044. Transforms data using Ruby filter scripts.
  Outputs to TA via the `logstash-output-thinkingdata` plugin.

**Key Configuration Points**:
- `queue.type: persisted` is strongly recommended to prevent data loss on unexpected
  shutdown (persistent queues on disk)
- `queue.drain: true` ensures all buffered data is flushed before graceful shutdown
- `pipeline.workers: 1` is required for `user_set` data to preserve event ordering;
  `track` events can use multiple workers
- `loadbalance: true` in Filebeat is only safe for `track` events; must be `false` for
  `user_set`

**Custom Parsing (Ruby Filters)**:
Logstash requires Ruby scripts to transform arbitrary log formats into TA data format.
Example for a structured log:
```ruby
def filter(event)
  _message = event.get('message')
  time, account_id, ip, event_name, msg, intdata = _message.split(/,/)
  properties = { 'msg' => msg, 'int_data' => intdata.to_i }
  data = {
    '#time' => time,
    '#account_id' => account_id,
    '#event_name' => event_name,
    '#ip' => ip,
    '#type' => 'track',
    'properties' => properties
  }
  event.set('message', data.to_json)
  return [event]
rescue
  return []  # drop bad records
end
```

**Limitations**:
- **Low throughput**: The official documentation explicitly warns that Logstash has low
  throughput and recommends DataX or LogBus for bulk historical data
- Requires JDK environment on Logstash nodes
- Two daemons to maintain (Filebeat + Logstash)
- No built-in TA-specific monitoring or debug commands
- No multi APP_ID support per Logstash pipeline (one output plugin instance = one APP_ID)

**When to choose Filebeat + Logstash**:
- Your organization already runs and maintains an ELK stack
- You want to reuse existing Filebeat agents already deployed on your servers
- Your throughput requirements are modest
- You need flexible, script-based log transformation (Ruby) for non-standard formats
- You want to avoid deploying a separate ingestion tool

---

## Selection Decision Matrix

| Requirement | Recommended Tool |
|---|---|
| Real-time server log tailing (new deployment) | **LogBus2** |
| Real-time server log tailing (existing LogBus v1) | **LogBus2** (migrate) or maintain **LogBus v1** |
| Bulk historical data from database/warehouse | **DataX Writer** |
| Kafka-based streaming pipeline | **LogBus2** |
| K8s-native deployment | **LogBus2** (Helm) |
| Existing ELK stack, add TA as output | **Filebeat + Logstash** |
| Windows server environment | **LogBus2** (preferred) or **LogBus Windows** (legacy) |
| Prometheus/Grafana monitoring required | **LogBus2** |
| Low memory budget | **LogBus2** (Go binary, ~1/5 of LogBus v1) |
| Regex-based file matching needed | **LogBus v1** |
| Aliyun SLS as data source | **LogBus2** |

---

## Performance Hierarchy (high to low throughput)

1. **LogBus2** -- 5x faster than LogBus v1; Go runtime with SIMD acceleration
2. **DataX Writer** -- High throughput via parallel channels; tunable
3. **LogBus v1** -- Moderate; JVM-bound; tunable thread count
4. **Filebeat + Logstash** -- Low throughput; explicitly noted as unsuitable for bulk

---

## Deployment Complexity (simplest to most complex)

1. **LogBus2** -- Single binary; one JSON config file; Docker/K8s/Helm available
2. **LogBus v1** -- Java runtime required; properties-file config; Docker available
3. **DataX Writer** -- Requires DataX framework installation + plugin deployment + job
   JSON authoring
4. **Filebeat + Logstash** -- Two daemons; Java + Go runtimes; Logstash plugin
   installation; Ruby filter scripting

---

## Migration Path: LogBus v1 to LogBus2

For teams currently on LogBus v1, a migration to LogBus2 is recommended given that v1
receives only security patches and LogBus2 delivers a 5x throughput improvement at 1/5
the memory cost. Key migration considerations:

- **Config format changes**: LogBus v1 uses Java-style `.conf` properties files; LogBus2
  uses JSON (`daemon.json`). Use the `configConvert` tool shipped in the LogBus2
  `tools/` directory to assist.
- **File matching**: LogBus v1 supports both regex and Glob; LogBus2 supports Glob only.
  Review `TAIL_FILE` patterns for regex constructs that need rewriting.
- **Custom parsers**: LogBus v1 uses Java `CustomInterceptor` (JAR-based); LogBus2 uses
  gRPC-based plugins. Parser logic must be reimplemented.
- **Monitoring**: LogBus v1 uses the `status` and `doctor` commands; LogBus2 uses
  Prometheus metrics and Grafana dashboards.
- **Kafka offset**: Both consume from `earliest` by default and support
  `auto.offset.reset`. Coordinate consumer group names to avoid re-consuming existing
  data.
