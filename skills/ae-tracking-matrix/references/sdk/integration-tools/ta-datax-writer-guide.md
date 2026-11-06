---
code: ta-datax-writer
name: "Ta-Datax-Writer Plugin Usage Guide"
wikiToken: WuEZwXOUliRnPIkdj9Gcavglnod
parentWikiToken: RjUcwyNY8iQH1dk8SP9cPyz1ngf
updateTime: 1745310936000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=ta-datax-writer
---

# Ta-Datax-Writer Plugin Usage Guide

### 1. Introduction

Ta-Datax-Writer is a DataX data writing plugin that provides the functionality to transmit data to TE cluster in the DataX ecosystem. You can deploy DataX on data transmission server, and use DataX supported data source reading plugins and this plugin to achieve data synchronization between multiple data sources and TE cluster.

To learn about DataX, you can visit DataX Github homepage

**Data transmission method sending data to TE receiver for data transmission**

### 2. Features and Limitations

TaDataWriter implements the functionality from DataX protocol to TE cluster internal data. TaDataWriter has the following conventions:

1. Supports and only supports writing to TE cluster.
1. Supports data compression, current compression formats are gzip, lzo, lz4, snappy.
1. Supports multi-thread transmission.

### 3. Usage Instructions

#### 3.1 Download datax

- Visit DataX official website
- Download DataX tool package: DataX download address

```
wget http://datax-opensource.oss-cn-hangzhou.aliyuncs.com/datax.tar.gz
```

#### 3.2 Extract datax

```
tar -zxvf datax.tar.gz
```

#### 3.3 Install ta-datax-writer plugin

- Download ta-datax-writer plugin: ta-datax-writer download address

```
wget https://download.thinkingdata.cn/tools/release/ta-datax-writer.tar.gz
```

- Copy ta-datax-writer.tar.gz to data/plugin/writer directory

```
cp ta-datax-writer.tar.gz data/plugin/writer
```

- Extract plugin package

```
tar -zxvf ta-datax-writer.tar.gz
```

- Delete software package

```
rm -rf  ta-datax-writer.tar.gz
```

### 4. Feature Description

#### 4.1 Configuration Example

```
{
  "job": {
    "setting": {
      "speed": {
        "channel": 1
      }
    },
    "content": [
      {
        "reader": {
          "name": "streamreader",
          "parameter": {
            "column": [
              {
                "value": "123123",
                "type": "string"
              },
              {
                "value": "testbuy",
                "type": "string"
              },
              {
                "value": "2019-08-16 08:08:08",
                "type": "date"
              },
              {
                "value": "2222",
                "type": "string"
              },
              {
                "value": "2019-08-16 08:08:08",
                "type": "date"
              },
              {
                "value": "test",
                "type": "bytes"
              },
              {
                "value": true,
                "type": "bool"
              }
            ],
            "sliceRecordCount": 10
          }
        },
        "writer": {
          "name": "ta-datax-writer",
          "parameter": {
            "thread": 3,
            "type": "track",
            "pushUrl": "http://{data_receiver_address}",
            "appid": "6f9e64da5bc74792b9e9c1db4e3e3822",
            "column": [
              {
                "index": "0",
                "colTargetName": "#distinct_id"
              },
              {
                "index": "1",
                "colTargetName": "#event_name"
              },
              {
                "index": "2",
                "colTargetName": "#time",
                "type": "date",
                "dateFormat": "yyyy-MM-dd HH:mm:ss.SSS"
              },
              {
                "index": "3",
                "colTargetName": "#account_id",
                "type": "string"
              },
              {
                "index": "4",
                "colTargetName": "testDate",
                "type": "date",
                "dateFormat": "yyyy-MM-dd HH:mm:ss.SSS"
              },
              {
                "index": "5",
                "colTargetName": "os_1",
                "type": "string"
              },
              {
                "index": "6",
                "colTargetName": "testBoolean",
                "type": "boolean"
              },
              {
                "colTargetName": "add_clo",
                "value": "123123",
                "type": "string"
              }
            ]
          }
        }
      }
    ]
  }
}
```

#### 4.2 Parameter Description

- **thread**
- Description: Thread count, used for concurrent execution within each channel, unrelated to DataX channel count.
- Required: No
- Default value: 3
- **pushUrl**
- Description: Access point address.
- Required: Yes
- Default value: None
- **uuid**
- Description: Add "#uuid":"uuid value" in transmitted data, used with data unique ID function.
- Required: No
- Default value: false
- **type**
- Description: Written data type user_set, track.
- Required: Yes
- Default value: None
- **compress**
- Description: Text compression type, default not filling means no compression. Supported compression types are zip, lzo, lzop, tgz, bzip2.
- Required: No
- Default value: No compression
- **appid**
- Description: Corresponding project appid.
- Required: Yes
- Default value: None
- **column**
- Description: Read field list, type specifies data type, index specifies current column corresponds to which column from reader (starting from 0), value specifies current type as constant, does not read data from reader, but automatically generates corresponding column based on value.
  User can specify Column field information, configuration as follows:

```
[
  {
    "type": "Number",
    "colTargetName": "test_col", //Generated data corresponding column name
    "index": 0 //Get Number field from first column transmitted by reader to datax
  },
  {
    "type": "string",
    "value": "testvalue",
    "colTargetName": "test_col"
    //Generate testvalue string field from TaDataWriter internally as current field
  },
  {
    "index": 0,
    "type": "date",
    "colTargetName": "testdate",
    "dateFormat": "yyyy-MM-dd HH:mm:ss.SSS"
  }
]
```

- For user specified Column information, index/value must choose one, type is optional. When setting date type, dataFormat can be set optionally.
- Required: Yes
- Default value: Read all according to reader type

#### 4.3 Type Conversion

Type is TaDataWriter defined:

**DataX Internal Type**

**TaDataWriter Data Type**

Int

Number

Long

Number

Double

Number

String

String

Boolean

Boolean

Date

Date
