---
code: logbus2_installation
name: "LogBus2 User Guide"
wikiToken: HoUywXWnNiqVfWkTJXwcbFG8n0c
parentWikiToken: S9D7wPqKDiC6zhkvv2dc6MgonCg
updateTime: 1774249346000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=logbus2_installation
---

**I. Introduction to LogBus2**
<quote-container>
LogBus2 is a log synchronization tool redeveloped on the basis of the original LogBus. Compared with the original LogBus, its memory footprint is reduced to 1/5 of the original, but its speed is increased by 5 times.
</quote-container>

---


Logbus2 is mainly used to import back-end log data to the TA background in real time. Its core working principle is similar to that of Flume and Loggie. It will monitor the file flow in the log directory of the server. When any log file in the directory has new data, it will verify new data and send it to the TA background in real time.
We recommend the following types of users access data by using LogBus2:

1. Users who use server SDK / Kafka / SLS to store data in TA format and upload data through LogBus2
2. Users who have high requirements for accuracy and dimension of the data, whose data requirements cannot be met only depending on the client SDK, or for whom it is inconvenient to access the client SDK
3. Users who don't want to develop the back-end data push process by themselves
4. Users who need to transmit bulk historical data
5. Users who have certain requirements for memory usage and transmission efficiency

## **II. Download LogBus2**
**Latest version: **2.1.1.6
**Update time:** 2024-12-20
[Linux-amd64 download](https://download.thinkingdata.cn/tools/release/ta-logBus-v2-linux-amd64.tar.gz)
[Linux-arm64 download](https://download.thinkingdata.cn/tools/release/ta-logBus-v2-linux-arm64.tar.gz)
[Windows version download](https://download.thinkingdata.cn/tools/release/ta-logBus-v2-windows-amd64.tar.gz)
[Mac Apple Silicon download](https://download.thinkingdata.cn/tools/release/ta-logBus-v2-darwin-arm64.tar.gz)
[Mac Intel download](https://download.thinkingdata.cn/tools/release/ta-logBus-v2-darwin-amd64.tar.gz)
[Docker Image](https://hub.docker.com/r/thinkingdata/ta-logbus-v2)
#### 
## **III. Preparation before use**
### **File type**
1. Determine the directory where the uploaded data files are stored, and configure LogBus2. In this case, LogBus2 will monitor the file changes in the fc.
2. Do not directly rename the uploaded data logs stored in the monitoring directory. Renaming the log is equivalent to creating a new file, and LogBus2 may upload these files again, resulting in data duplication.
3. Since there is a snapshot of the current log transmission progress in the LogBus2 running directory, please do not work with the files in the runtime directory by yourself
### **Kafka**
1. Determine the Kafka message format. In this case, Logbus will only process the value part of the Kafka Message
2. Ensure that partitions are split based on userIDs to avoid out-of-order data
3. Please enable the free use of Kafka Consumer Group to avoid the failure of multiple Logbus consumers
4. Consume from the earliest by default. To consume from a specified location, you need to create a consumer group with a specific offset first.
### **SLS**
1. Contact Alibaba Cloud to enable Kafka protocol support
## **IV. Installation and update of LogBus2**
### **Installation**
Download and decompress the LogBus2 [<text underline="true">installation package.</text>](https://thinkingdata.feishu.cn/docx/HswYdoSwzo2ePTxjsAnctLrHnxb)
Decompressed directory structure:
<image token="ZEQ4bwhxao26ixx0nqGcBxONnMf" width="504" height="254" align="center"/>


- **Logbus:**LogBus2: binary file
- **conf: **
  - **daemon.json: **configuration file template 2
- **tools:**
  - **configConvert: **configuration conversion tool
### **Update**
Requirement: LogBus2 version ≥ 2.0.1.
Direct execution
`./logbus update`, execute after update.
`./logbus start`

## **V. Use and configuration of Logbus2**
### **Start parameters**
#### **Start**
```shell {wrap}
./logbus start
```

**Stop**
```shell {wrap}
./logbus stop
```

#### **Restart**
```shell {wrap}
./logbus restart
```

#### **Check configuration and connectivity to TA system**
```shell {wrap}
./logbus env
```

**Reset LogBus read records**
```shell {wrap}
./logbus reset
# Kafka is currently unavailable
```

**View transmission progress**
```shell {wrap}
./logbus progress
# Kafka is currently unavailable
```

#### **Verify file format**
```shell {wrap}
./logbus dev
# Kafka is currently unavailable
```

### **Configuration file guide**
#### **Default configuration template**
```json {wrap}
{
 "datasource": [
  {
     "file_patterns": [
       "/data/log1/*.txt",
       "/data/log2/*.log"
    ],//file matching character
     "app_id": "app_id",//app_id from the token of ta's official website, please get the APPID of the implementation project on the project configuration page of TA background and fill it here
  },
],
 "push_url": "http://RECEIVER_URL"//http transmission, please use http://receiver.ta.thinkingdata.cn/, if you enable privatization deployment, please modify the transmission URL to http://data acquisition address/
}
```

#### **Common configuration**
###### **File**
```json {wrap}
{
    "datasource": [
      {
        "type":"file",
        "file_patterns": ["/data/log1/*.txt", "/data/log2/*.log"],  //file Glob matching rules
        "app_id": "app_id", //APPID from the token of ta's official website, please get the APPID of the implementation project on the project configuration page of TA background and fill it here
        "unit_remove": "day"| "hour", //file deletion unit
        "offset_remove": 7,//unit_remove*offset_remove get the final removal time**offset must be greater than 0, otherwise it is invalid
        "remove_dirs": true|false,//enable folder deletion or not NOTE: Only delete the folder after all files in the folder have been consumed
         "http_compress": "gzip"|"none",//enable http compression or not,
      }
    ],    
    "cpu_limit": 4, //limit the number of CPU cores used by Logbus2 
  
    "push_url": "http://RECEIVER_URL"
  }
  
```

###### **Kafka**
```json {wrap}
{
    "datasource": [
      {
        "type":"kafka",    //type: Kafka
        "topic":"ta",    //specific topic
        "brokers":[
          "localhost:9091"    //Kafka Brokers address
        ],
        "consumer_group":"logbus",    //consumer group name
        "cloud_provider":"ali"|"tencent"|"huawei", //cloud provider name
        "username":"",    //Kafka username
        "password":"",    //Kafka password
        "instance":"",    //cloud provider instance name
        "protocol":"none"|"plain"|"scramsha256"|"scramsha512", //authentication protocol
        "block_partitions_revoked":true,
        "app_id":"YOUR_APP_ID"
      }
    ],
    "cpu_limit": 4, //limit the number of CPU cores used by Logbus2
  
    "push_url": "http://RECEIVER_URL"
  }
```

###### **SLS**
<text color="red">NOTE: </text><text color="red">Please</text><text color="red"> contact </text><text color="red">Alibaba Cloud</text><text color="red"> to enable the SLS Kafka consumption protocol before SLS consumption</text>
```json {wrap}
{
  "datasource": [
    {
      "type":"kafka",
      "brokers":["{PROJECT}.{ENTRYPOINT}:{PORT}"],    //NOTE: see https://www.alibabacloud.com/help/en/log-service/latest/endpoints#reference-wgx-pwq-zdb for details
      "topic":"{SLS_Logstore_NAME}",    //Logstore name
      "protocol":"plain",
      "consumer_group":"{YOUR_CONSUMER_GROUP}",     // ConsumerGroup
      "username":"{PROJECT}",    // Project name
      "disable_tls":true,
      "password":"{ACCESS_ID}#{ACCESS_PASSWORD}",    //   authorization by Alibaba Cloud RAM
      "app_id":"YOUR_APP_ID"
    }
  ],
  "push_url": "http://RECEIVER_URL"
}
```

#### **Complete configuration item**
##### **Configuration item list and description**

<lark-table rows="4" cols="5" column-widths="139,83,114,75,313">

  <lark-tr>
    <lark-td>
      **Configuration**
    </lark-td>
    <lark-td>
      **Type**
    </lark-td>
    <lark-td>
      **Example**
    </lark-td>
    <lark-td>
      **Required field**
    </lark-td>
    <lark-td>
      **Description**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      cpu_limit
    </lark-td>
    <lark-td>
      Number
    </lark-td>
    <lark-td>
      4
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      Limit the maximum allowable number of CPU cores used by Logbus2
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      push_url
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      ✔️
    </lark-td>
    <lark-td>
      Receiver address, starting with http/https.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      datasource
    </lark-td>
    <lark-td>
      Object list
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      ✔️
    </lark-td>
    <lark-td>
      Data source list
    </lark-td>
  </lark-tr>
</lark-table>

##### **datasource (data source configuration)**
###### **File**

<lark-table rows="14" cols="6" column-widths="139,83,114,75,95,336">

  <lark-tr>
    <lark-td>
      Configuration
    </lark-td>
    <lark-td>
      Type
    </lark-td>
    <lark-td>
      Example
    </lark-td>
    <lark-td>
      Required field
    </lark-td>
    <lark-td>
      Default value
    </lark-td>
    <lark-td>
      Description
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      app_id
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      ✔️
    </lark-td>
    <lark-td>
      ""
    </lark-td>
    <lark-td>
      Data reporting project appid
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      appid_in_data
    </lark-td>
    <lark-td>
      Bool
    </lark-td>
    <lark-td>
      false
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      false
    </lark-td>
    <lark-td>
      When set to true, logbus will use appid from data instead rather than the configure value.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      specified_push_url
    </lark-td>
    <lark-td>
      Bool
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      false
    </lark-td>
    <lark-td>
      True: do not parse push_url, and send it as the push_url configured by the user, that is, http://yourhost:yourport. 
      False: After parsing the push_url, send it according to the logbus url specified by the receiver, namely http://yourhost:yourport/logbus.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      add_uuid
    </lark-td>
    <lark-td>
      Bool
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      false
    </lark-td>
    <lark-td>
      True: Add the uuid property in each piece of data or not (the transmission efficiency will reduce if enabled).
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      file_patterns
    </lark-td>
    <lark-td>
      String list
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      ✔️
    </lark-td>
    <lark-td>
      [""]
    </lark-td>
    <lark-td>
      Directory wildcards are supported, but regular expressions are not supported at this time. If without special configuration, it is bypassed by default. Files suffixed with gz/.iso/.rpm/.zip/.bz/.rar/.bz2
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      ignore_files
    </lark-td>
    <lark-td>
      String list
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      [""]
    </lark-td>
    <lark-td>
      Files filtered in file_patterns
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      unit_remove
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      ""
    </lark-td>
    <lark-td>
      Delete user files. Delete by day or hour. Note: If no configuration file is automatically deleted, the memory footprint of LogBus2 will gradually increase
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      offset_remove
    </lark-td>
    <lark-td>
      Int
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      0
    </lark-td>
    <lark-td>
      Delete user files. When offset_remove>0 and unit_remove is configured by day or hour, the user file deletion function can be enabled.
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      remove_dirs
    </lark-td>
    <lark-td>
      Bool
    </lark-td>
    <lark-td>
      true|false
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      false
    </lark-td>
    <lark-td>
      Delete the folder or not
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      http_timeout
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      500ms
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      600s
    </lark-td>
    <lark-td>
      Timeout when sending data to receiver, default value: 600s. Range: 200ms - 600s. Support milliseconds "ms", seconds "s", minutes "m", hours "h".
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      iops
    </lark-td>
    <lark-td>
      int
    </lark-td>
    <lark-td>
      20000
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      20000
    </lark-td>
    <lark-td>
      Limit Logbus data traffic per second (number of items)
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      limit
    </lark-td>
    <lark-td>
      bool
    </lark-td>
    <lark-td>
      true|false
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      false
    </lark-td>
    <lark-td>
      Turn on the speed limit switch
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      http_compress
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      none | gzip
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      none
    </lark-td>
    <lark-td>
      Format of data compression when sending http. none=no compression. Default value: none.
    </lark-td>
  </lark-tr>
</lark-table>

NOTE: The max_batch_size is verified first, followed by batch length verification. If the last interval is 2 seconds, it is forced to send.
###### **Kafka**
<text color="red">NOTE: Before enabling the </text><text color="red">Logbus</text><text color="red"> Kafka mode, be sure to enable the free use of the Consumer Group</text>

<lark-table rows="15" cols="6" column-widths="139,83,114,75,100,366">

  <lark-tr>
    <lark-td>
      Configuration {align="center"}
    </lark-td>
    <lark-td>
      Type {align="center"}
    </lark-td>
    <lark-td>
      Example {align="center"}
    </lark-td>
    <lark-td>
      Required field {align="center"}
    </lark-td>
    <lark-td>
      Default value {align="center"}
    </lark-td>
    <lark-td>
      Description {align="center"}
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      brokers
    </lark-td>
    <lark-td>
      String List
    </lark-td>
    <lark-td>
      ["localhost:9092"]
    </lark-td>
    <lark-td>
      ✔️
    </lark-td>
    <lark-td>
      [""]
    </lark-td>
    <lark-td>
      Kafka Brokers
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      topic
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      "ta-msg-chan"
    </lark-td>
    <lark-td>
      ✔️
    </lark-td>
    <lark-td>
      ""
    </lark-td>
    <lark-td>
      Kafka topic
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      consumer_group
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      "ta-consumer"
    </lark-td>
    <lark-td>
      ✔️
    </lark-td>
    <lark-td>
      ""
    </lark-td>
    <lark-td>
      Kafka Consumer Group
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      protocol
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      "plain"
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      "none"
    </lark-td>
    <lark-td>
      Kafka authentication mode
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      username
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      "ta-user"
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      ""
    </lark-td>
    <lark-td>
      Kafka username
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      password
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      "ta-password"
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      ""
    </lark-td>
    <lark-td>
      Kafka password
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      instance
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      ""
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      ""
    </lark-td>
    <lark-td>
      CKafka instance ID
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      fetch_count
    </lark-td>
    <lark-td>
      Number
    </lark-td>
    <lark-td>
      1000
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      10000
    </lark-td>
    <lark-td>
      Number of messages per Poll
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      fetch_time_out
    </lark-td>
    <lark-td>
      Number
    </lark-td>
    <lark-td>
      30
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      5
    </lark-td>
    <lark-td>
      Poll timeout
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      read_committed
    </lark-td>
    <lark-td>
      Bool
    </lark-td>
    <lark-td>
      true
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      false
    </lark-td>
    <lark-td>
      Consume Kafka UnCommitted data or not
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      disable_tls
    </lark-td>
    <lark-td>
      Bool
    </lark-td>
    <lark-td>
      true
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      false
    </lark-td>
    <lark-td>
      Disable tls verification
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      cloud_provider
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      "tencent"
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      ""
    </lark-td>
    <lark-td>
      Enabled when the public network is connected to Kafka. Currently, the following cloud providers provide this service: tencent, huawei, ali
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      block_partitions_revoked
    </lark-td>
    <lark-td>
      Bool
    </lark-td>
    <lark-td>
      false
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      false
    </lark-td>
    <lark-td>
      Block consumption or not. If disabled, data duplication will occur when multiple Logbuses are in the same consumer_group
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      auto_reset_offset
    </lark-td>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      "earliest"
    </lark-td>
    <lark-td>
    </lark-td>
    <lark-td>
      "earliest"
    </lark-td>
    <lark-td>
      A parameter that specifies the default behavior when there are no committed offsets
    </lark-td>
  </lark-tr>
</lark-table>

NOTE: Logbusv2 currently consumes Kafka in load balance mode, and the number of Logbusv2 deployments is ≤ partition num
##### **Monitoring configuration and dashboard construction**
Please view: [<text color="blue" underline="true">Monitoring Configuration DEMO</text>](https%3A%2F%2Fthinkingdata.feishu.cn%2Fdocx%2FEEBpdN6oyoOBBXx5D81cALwNnPh)
##### **Alert configuration**
Please view: [<text underline="true">Alert Configuration DEMO</text>](https%3A%2F%2Fthinkingdata.feishu.cn%2Fdocx%2FJvyBd8mAqoblc1xGnxjczzz3nKd)
##### **Plugin use**
Please view:[<text underline="true"> </text>](https%3A%2F%2Fthinkingdata.feishu.cn%2Fdocx%2FJvyBd8mAqoblc1xGnxjczzz3nKd)[<text color="blue" underline="true">Plugin Configuration DEMO</text>](https%3A%2F%2Fthinkingdata.feishu.cn%2Fdocx%2FJvyBd8mAqoblc1xGnxjczzz3nKd)

## **VI. Advanced use**
### **Report multiple events through a single Logbus**
In the case of single Logbus deployment, due to IO limitations, there may be situations where some information is consumed with a delay, for example
<image token="MF19bWENGoPfikx1VTLcCyDsnwh" width="206" height="640" align="center"/>

Due to polling, the consumption order is `event_*/log.1 -> event_*/log.2 -> event_*/log.3`. In this case, file consumption will slow down. You can enable multiple LogBuses to cut logs without contextual meaning through GloBs so that the files matched by GloBs can be uploaded in parallel
### **Multiple PipeLine configuration**
<text color="red">NOTE</text><text color="red">: </text><text color="red">The appid cannot be repeated under multiple PipeLine</text>
```json {wrap}
{
    "datasource": [
      {
        "file_patterns": ["/data/log1/*.txt", "/data/log2/*.log"],  //file Glob matching rules
        "app_id": "app_id", //APPID from the token of ta's official website, please get the APPID of the implementation project on the project configuration page of TA background and fill it here
        "unit_remove": "day"| "hour", //file deletion unit
        "offset_remove": 7,//unit_remove*offset_remove get the final removal time**offset must be greater than 0, otherwise it is invalid
        "remove_dirs": true|false,//enable folder deletion or not NOTE: Only delete the folder after all files in the folder have been consumed
        "http_compress": "gzip"|"none",//enable http compression or not
      },
      {
        "file_patterns": ["/data/log1/*.txt", "/data/log2/*.log"],  //file Glob matching rules
        "app_id": "app_id", //APPID from the token of ta's official website, please get the APPID of the implementation project on the project configuration page of TA background and fill it here
        "unit_remove": "day"| "hour", //file deletion unit
        "offset_remove": 7,//unit_remove*offset_remove get the final removal time**offset must be greater than 0, otherwise it is invalid
        "remove_dirs": true|false,//enable folder deletion or not NOTE: Only delete the folder after all files in the folder have been consumed
        "http_compress": "gzip"|"none",//enable http compression or not
      }
    ],
    "cpu_limit": 4, //limit the number of CPU cores used by Logbus2
  
    "push_url": "http://RECEIVER_URL"
  }
```

### **LogBus2 On Docker**
#### **Pull the latest mirror**
```bash
docker pull thinkingdata/ta-logbus-v2:latest
```

#### **Create a persistent folder on the host and initialize the configuration file**
```bash
mkdir -p /your/folder/path/{conf,log,runtime}
touch /your/folder/path/daemon.json
vim /your/folder/path/daemon.json
```

**⚠️ Warning: Do not delete any file in the runtime directory by yourself**
#### **Modify the configuration template and write to **`**daemon.json**`
```json
{
  "datasource": [
    {
      "type":"file",
      "app_id": "YOUR APP ID",
      "file_patterns": ["/test-data/*.json"],
      "app_id":""
    },
    {
      "type":"kafka",
      "app_id": "YOUR APP ID",
      "brokers": ["localhot:9092"],
      "topic":"ta-message",
      "consumer_group":"ta",
      "app_id":""
    }
  ],
  "push_url": "YOUR PUSH URL WITHOUT SUFFIX OF/logbus"
}
```

#### **Mount the data folder and start LogBus**
```bash
docker run -d \
  --name logbus-v2 \
  --restart=always \
  -v /your/data/folder:/test-data/ \
  -v /your/folder/path/conf/:/ta/logbus/conf/ \
  -v /your/folder/path/log/:/ta/logbus/log/ \
  -v /your/folder/path/runtime/:/ta/logbus/runtime/ \
thinkingdata/ta-logbus-v2:latest
```

### **LogBus2 On K8s**
#### **Prepare the environment**
1. Kubectl can connect to the k8s cluster and has deployment permissions.
2. Installing dependencies: install helm to the local command line according to the helm file https://helm.sh/zh/docs/intro/install/

#### **Download the logbus v2 helm file**
[<text underline="true">download link</text>](https://download.thinkingdata.cn/tools/release/logBusv2-helm.tar)
<view type="1">

  <file token="YkJTbVhKoo0iuQxXUrjcUs1Knwf" name="ta-logBusv2-2.0.1.8-helm.tar.gz"/>

</view>

```apache
tar xvf logBusv2-helm.tar && cd logbusv2
```


#### **Configure logbus**

#### **Preparations**
1. Create the log pvc to be uploaded on the console
2. Get the pvc name and confirm the namespace
3. Get TA's app id, receiver url

#### **Modify values.yaml**
```yaml {wrap}
pvc:
  name: pvc name
logbus_version: 2.1.0.2
namespace: namcspace name
logbus_configs:
  - push_url: "http://receiver address of TA upload data"
    datasource:
      - file_patterns:
        - "container:wildcard of the relative path to the file" # Do not delete the prefix "container:"
        - "container: wildcard of the relative path to the file" # Do not delete the prefix "container:"
        app_id: app id of TA system
```

#### **yaml for preview rendering**
```apache {wrap}
helm install --dry-run -f values.yaml logbus .
```

#### **Use helm to deploy logbusv2**
```apache {wrap}
 helm install -f values.yaml logbus-v2 .
```

**Check the created statefulset**
```powershell {wrap}
kubectl get statefulset
```

**Check the created pod**
```powershell {wrap}
kubectl get pods
```

**Update the LogBus in K8s**
```bash
vim value.yaml # Modify the previous value.yaml file
# Modify logbus_version to the latest NOTE: Considering backward compatibility, it's better not to use the latest!
logbus_version:2.0.1.8 -> logbus_version:2.1.0.2
# save and exit
helm upgrade -f values.yaml logbus .
# Wait for rolling update
```

#### **Notes**
Logbusv2 has read and write permissions on the pvc of the mounted log.
Logbusv2 writes file consumption records and running logs to PVC respectively according to pod. If PVC deletes logbus-related records, there is a risk of data retransmission.
### **Configuration details**
Execute command:
```powershell {wrap}
helm show values .
```

Show available configurations:
```yaml {wrap}
# Default values for logbusv2.
# This is a YAML-formatted file.
# Declare variables to be passed into your templates.

pvc:
  name: pvc-logbus
logbus_version: 2.1.0.2
namespace: big-data

logbus_configs:
  #### pod 1
  #### push_url: receiver url, need http:// https:// prefix
  - push_url: "http://172.17.16.6:8992/"
    datasource:
      - file_patterns:
        #### target files relative path in pvc
        - "container:/ta-logbus-0/data_path/*"
        #### TA app_id
        app_id: "thinkingAnalyticsAppID"
  #### pod 2
  - push_url: "http://172.26.18.132:8992/"
    datasource:
      - file_patterns:
        - "container:/ta-logbus-1/data_path/*"
        app_id: "thinkingAnalyticsAppID"
  #### pod 3
  - push_url: "http://172.26.18.132:8992/"
    datasource:
      - file_patterns:
        - "container:/ta-logbus-2/data_path/*"
        app_id: "thinkingAnalyticsAppID"

#### logbus pod requests
#requests:
#  cpu: 2
#  memory: 1Gi
```

requests not clearly configured will not be reflected in yaml.

#### **pvc order catalog**
```yaml {wrap}
pvc:
  name: write the actual pvc name

namespace: existing namespace

logbus_configs:
  - push_url: http or https, write the TA receiver URL that the pod can access
    datasource:
      - file_patterns:
        - "container:/ta-logbus-0/data_path/*" "container:"placeholder. During yaml deployment, the relative path is replaced with an absolute path that the container can access. When configuring the directory, the directory is prefixed with container:.
        app_id: "thinkingAnalyticsAppID" TA system app id
```

**Multiple directories in pvc**
When reading multiple directories in pvc, it is recommended to deploy them in pods, and each pod is responsible for a folder. This allows for better deployment performance and security.
```yaml {wrap}

pvc:
  name: pvc-logbus

namespace: big-data

logbus_configs:
  #### pod 1
  #### push_url: receiver url, need http:// https:// prefix
  - push_url: "http://172.17.16.6:8992/"
    datasource:
      - file_patterns:
        #### target files relative path in pvc
        - "container:/ta-logbus-0/data_path/*"
        #### TA app_id
        app_id: "thinkingAnalyticsAppID"
  #### pod 2
  - push_url: "http://172.26.18.132:8992/"note that each app id and push url need to be configured separately
    datasource:
      - file_patterns:
        - "container:/ta-logbus-1/data_path/*"
        app_id: "thinkingAnalyticsAppID"
  #### pod 3
  - push_url: "http://172.26.18.132:8992/"
    datasource:
      - file_patterns:
        - "container:/ta-logbus-2/data_path/*"
        app_id: "thinkingAnalyticsAppID"
```

#### **Multi-pvc**
Currently, it only supports the deployment of a single pvc, and multi-pvc requires multiple configurations of values.yaml file

## **VII. FAQs**
**Q: **Why is folder deletion enabled, but LogBus does not delete the folder?
**A: **The prerequisite for LogBus to delete a folder is that the files in the current folder have been read by LogBus and there is no file in the folder, then folder deletion will be triggered

**Q: **Why can't the log be uploaded?
**A: **In the data files read by LogBus, there should be no line breaks in a single piece of data.  The configured data file does not support regular expressions, only wildcard (Glob) is used. Can the configured data file rules be matched to files

**Q: **Why are files uploaded repeatedly?
**A: **In the data files read by LogBus, there should be no line breaks in a single piece of data. The configured data file does not support regular expressions, only wildcard (Glob) is used. Can the configured data file rules be matched to files

**Q: **Why data skewing
**A**: Currently TE uses distinct_id as data UUID for shuffle. When using the same string for the distinct_id of massive data, it may lead to the increase of memory pressure on a single machine, thus increasing the risk of data skew.
## **VIII. Releases Note**
### Version: 2.1.1.6 --- 2024.12.20
**Optimizations**:
- Using http proxies configured in env
### Version: 2.1.1.4 --- 2024.5.15
**Optimizations**:
- Kafka source now supports `fetch_max_partition_bytes`
- DataSource supports skipping remote validation, default off
- Utilizing SIMD for accelerated JSON processing
### Version:2.1.1.3 --- 2024.2.23
**Optimizations**
- Enhanced Kafka Progress experience
- Added support for the `auto_reset_offset` parameter
- Logged Kafka Client related information for improved logging
**Bug Fixes**
- Force shutdown causing Logbus to kill the wrong process
- Memory leak issue
- Goroutine leak problem
- Kafka timeouts not being consumed
- Failure to start on Windows version
- Inability to update on Windows version
### **Version:2.1.1.2 --- 2024.2.2**
**Improve**
- i18n log format
### **Version:2.1.1.1 --- 2024.1.10**
**Improve**
- The accuracy of the `progress` command.
### **Version:2.1.1.0 --- 2023.12.11**
- **Fix**
  - The default values for logs have been adjusted to retain logs for 7 days by default, with individual files split at 100MB and a maximum retention of 30 log files. <text color="red">Without upgrading, the configuration can also be set using the log configuration option</text>.
- **Impact **
  - In the case of generating a large amount of unparseable error data in the data source, the logging of these errors can lead to the log files becoming increasingly large.
### **Version:2.1.0.9 --- 2023.10.26**
**Add **
- Support for event filters allows data filtering to be performed on the client side.
- Support for space detection within the logbus directory.

### **Version:2.1.0.8 --- 2023.6.06**
**Improve **
- Ensuring proper closure of plugins is essential.
- Optimizing process communication and log output is crucial for improving overall system performance. 
**Fix**
- CPU limit log output
- linux arm version compile
### **Version:2.1.0.7 --- 2023.4.07**
**Add **
- Kafka Source support command `progress`
**Improve **
- Custom tags support retrieving environment variables
### **Version:2.1.0.6 --- 2023.3.28**
**Improve **
- Support for custom tags to trace data sources
- Support for custom plugin delimiters
### **Version**:2.1.0.5 --- 2023.2.20
**Improve**
- Data streaming project supports arrays, compatible with numeric and string primitive types
- Monitoring metric calculation logic
### **Version:2.1.0.4 --- 2023.1.12**
**Add **
- Support configuration to read data from files without newline characters
- Support configuring the number of iterations and interval time for cyclic reading
**Fix**
- Fix concurrency bugs in monitoring metric statistics
### **Version:2.1.0.3 --- 2022.12.23**
**Add**
- Allow overriding internal appid data through configuration
**Fix **
- Use appid_in_data and remove the default value for appid
### **Version: 2.1.0.2 --- 2022.12.13**
**Add**
- Plugin supports property splitting
**Repair**
- Create meta_name under multiple pipelines
### **Version: 2.1.0.1 --- 2022.11.29**
**Add**
- The kafka data source supports transactional read committed
- Plugin command supports sh environmental dependencies
**Repair**
- Create meta_name without appid configuration
### **Version: 2.1.0.0 --- 2022.11.22**
**Add:**
- Data distribution: distribute data to different projects according to the configuration appidMap
- Kafka data source supports multi-topic consumption
- Limiter, to limit the reporting speed and reduce the server pressure
- Multiple pipelines perform data reporting
- Custom plugin parser based on grpc
- Real-time performance monitoring (prometheus, pushgateway, grafana)
- Add lz4 " lzo to the compaction algorithm
**Repair:**
- Fix the bug where logbus is unable to stop under the kafka data source
- Fix the bug that the file is too active to jump out under the file data source
- Fix the file monitor closing issue
### **Version: 2.0.1.8 --- 2022.07.20**
**Add:**
- dev (format verification command)
- Kafka Source
- Multi-platform
**Repair:**
- Problem with waking up file transmission several times
- Less log volume
- `Progress` sorting by file transmission time
- Multi-pipeline optimization
- `Docker image` streamlining
### **Version: 2.0.1.7 --- 2022.03.01**
**Optimization:**
- Operating efficiency, higher performance
- File deletion logic
- Location file export logic
- Memory footprint
