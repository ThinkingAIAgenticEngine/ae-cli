# LogBus2 Usage Recommendations

## 1. Introduction

LogBus2 is a log synchronization tool redeveloped by ThinkingData using Go language based on the original LogBus. Compared to LogBus1, it has the following advantages:

- **Lower memory usage**: Reduced to one-fifth of the original (about 100-200M)
- **Faster transmission speed**: Increased to 30,000-50,000 records/second
- **More stable operation**: LogBus1 has difficulty repairing file buffer areas in some special scenarios
- **Simpler deployment**: No JDK environment required, runs directly

## 2. Preparation Before Use

1. **Data format conversion**: Convert the data to be transmitted into TE data format, supporting TA format and Sensors format
2. **Determine data source**: Determine the file storage directory or Kafka address and topic
3. **Disk space**: Compared to LogBus1, LogBus2 removes the local disk queue, resulting in smaller disk usage

## 3. Application Scenarios

- Users using ThinkingData server SDK LogConsumer mode
- Scenarios with high requirements for data accuracy and dimensions
- Need to transmit large amounts of historical data
- Scenarios requiring data distribution to multiple projects
- Scenarios requiring integration with Sensors data

## 4. Performance Metrics

| Metric             | Description                                  |
| ------------------ | -------------------------------------------- |
| Transmission speed | 30,000-50,000 records/second (single LogBus) |
| Memory usage       | About 100-200M                               |
| CPU limit          | Supports cpu_limit configuration             |
| Bandwidth usage    | Peak about 70Mbps                            |

> Transmission efficiency is affected by network conditions, disk IO, system allocated resources, number of monitored files, etc.

## 5. Supported Environments

| Operating System | Architecture | Description              |
| ---------------- | ------------ | ------------------------ |
| Linux            | amd64        | Recommended              |
| Linux            | arm64        | Supported                |
| Windows          | amd64        | Supported                |
| macOS            | amd64        | Supported                |
| Docker           | -            | Host machine persistence |
| K8S              | -            | Supports Helm deployment |

Download link: [Official Website Download](https://docs.thinkingdata.cn/ta-manual/latest/installation/installation_menu/data_import/logbus2_installation.html)

## 6. Configuration Guide

### File Data Source Configuration

```json
{
  "push_url": "http://RECEIVER_URL",
  "cpu_limit": 4,
  "datasource": [
    {
      "type": "file",
      "file_patterns": ["/data/log/*.log"],
      "app_id": "your_app_id",
      "http_compress": "gzip",
      "unit_remove": "day",
      "offset_remove": 7
    }
  ]
}
```

### Kafka Data Source Configuration

```json
{
  "datasource": [
    {
      "type": "kafka",
      "topic": "topic1,topic2",
      "consumer_group": "consumer_group_name",
      "brokers": ["localhost:9092"],
      "auto_commit": false,
      "app_id": "your_app_id"
    }
  ],
  "push_url": "http://RECEIVER_URL"
}
```

### Multi-project Data Distribution Configuration

```json
{
  "datasource": [
    {
      "file_patterns": ["/data/log/*.log"],
      "app_id": "default_app_id",
      "app_pipe": {
        "attribute": "#lib_version",
        "id_map": {
          "app_id_1": "1.0.0",
          "app_id_2": "2.0.0"
        },
        "default": "app_id_1"
      }
    }
  ],
  "push_url": "http://RECEIVER_URL"
}
```

### Alert Configuration

```json
{
  "alert": {
    "enabled": true,
    "receiver": "feishu_robot",
    "extra": "logbus_instance_1",
    "out_cfg": {
      "feishu_robot_hook": "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
    }
  }
}
```

## 7. Common Operation Commands

### Environment Check

```bash
./logbus env
```

### Start Service

```bash
./logbus start
```

### Stop Service

```bash
./logbus stop
```

### View Sync Progress

```bash
./logbus progress
```

### Upgrade Version

```bash
./logbus stop
./logbus update
./logbus start
```

### View Transmission Speed

Check `logbus/log/transporter.log` to confirm transmission efficiency.

## 8. Configuration Parameter Details

### Global Configuration

| Parameter            | Type   | Default | Description                                     |
| -------------------- | ------ | ------- | ----------------------------------------------- |
| push_url             | string | -       | Receiver address, required                      |
| cpu_limit            | int    | -       | CPU core limit                                  |
| ignore_app_id_verify | bool   | false   | Whether to skip appid and push_url verification |

### Data Report Configuration

| Parameter        | Type   | Default | Description                                              |
| ---------------- | ------ | ------- | -------------------------------------------------------- |
| batch            | int    | 1000    | Data sending count condition, minimum 10, maximum 100000 |
| interval_seconds | int    | 2       | Data sending time interval, maximum 60 seconds           |
| send_thread_num  | int    | 3       | Data report thread count                                 |
| http_timeout     | string | 30s     | HTTP request timeout time                                |
| http_compress    | string | -       | HTTP compression protocol, supports gzip/snappy          |

### File Data Source Configuration

| Parameter             | Type     | Default | Description                          |
| --------------------- | -------- | ------- | ------------------------------------ |
| file_patterns         | []string | -       | File glob matching pattern, required |
| traverse_dir_interval | string   | 30s     | Directory scanning interval time     |

### Kafka Data Source Configuration

| Parameter      | Type     | Default | Description                                                     |
| -------------- | -------- | ------- | --------------------------------------------------------------- |
| topic          | string   | -       | Kafka topic, supports multiple topics (comma separated)         |
| brokers        | []string | -       | Kafka broker address                                            |
| consumer_group | string   | -       | Consumer group                                                  |
| auto_commit    | bool     | false   | Whether to auto commit                                          |
| protocol       | string   | none    | Authentication protocol: plain/scramsha256/scramsha512/iam/none |
| fetch_count    | int      | 1000    | Number of data pulled at once                                   |

### File Deletion Configuration

| Parameter     | Type   | Default | Description                                                                   |
| ------------- | ------ | ------- | ----------------------------------------------------------------------------- |
| offset_remove | int    | -       | Deletion cycle                                                                |
| unit_remove   | string | d       | Deletion unit: d(day)/h(hour)                                                 |
| RemoveDirs    | bool   | false   | Whether to delete folders, not recommended, may cause server write exceptions |

## 9. Important Notes

### File Operations Related

> **Do not rename files monitored by LogBus**, otherwise it will cause data loss or data duplication.

### Monitored File Requirements

- Files under LogBus monitoring path must be pure data files
- Cannot have files with gz/.iso/.rpm/.zip/.bz/.rar/.bz2 suffixes
- LogBus-v2 will bypass these files by default

### Multi-instance Running

- Multiple LogBus instances can run, but multiple LogBus cannot monitor files in the same path to report to the same project

### Kafka Consumption Optimization

- Consumer thread count should be equal to partition count
- Avoid single LogBus consuming partitions with consistent hash modulo results
- Can increase partition count and LogBus consumer count to speed up consumption

### Data Re-upload Notes

- For historical data, recommend enabling historical channel
- Pay attention to whether Kafka cluster has data backlog
- Re-uploading data should be sent to a separate topic to avoid confusion with formal data

## 10. Common Questions

### How to confirm network connectivity?

```bash
curl data_receiver_address/health-check
```

### How to confirm APPID is correct?

```bash
curl "data_receiver_address/check_appid?appid=target_APPID"
```

Return `{"code":0}` means normal.

### Reasons for data duplication?

1. Whether renamed already synced files
2. Whether source data files have duplicated data
3. Whether reset operation was executed

### What to do if transmission is slow?

1. Increase `send_thread_num` sending thread count
2. Enable HTTP compression: `http_compress: "gzip"`
3. Check network latency, bandwidth, recommend LogBus and Receiver in same internal network
4. Check if CPU, memory are limited

### What to do if Kafka consumption is slow?

1. Add LogBus instances
2. Increase `send_thread_num` for single LogBus
3. Increase partition count
4. Best strategy: LogBus consumer thread count = partition count

### Reporting delay caused by reading strategy differences?

If server-side data has multiple processes simultaneously writing data to different files, old versions of logbus2 will have serial reading, causing some real-time written files not to be reported in real-time. New version has handled this scenario.

```bash
# Stop LogBus
./logbus stop

# Upgrade LogBus
./logbus update

# Restart LogBus
./logbus start
```

## 11. Best Practice Recommendations

### Deployment Recommendations

1. **Resource planning**: Configure CPU and memory reasonably according to data volume
2. **Network optimization**: Deploy LogBus and Receiver in same internal network
3. **Monitoring alerting**: Configure alert notification to discover anomalies in time

### Configuration Recommendations

1. **Compression transmission**: Recommend enabling gzip compression to reduce network transmission volume
2. **File cleanup**: Configure auto deletion strategy to avoid insufficient disk space
3. **Thread configuration**: Adjust sending thread count according to data volume

### Operation Recommendations

1. **Version upgrade**: Regularly check release notes, upgrade in time
2. **Log retention**: Reasonably configure log retention time
3. **Process monitoring**: Monitor LogBus process
