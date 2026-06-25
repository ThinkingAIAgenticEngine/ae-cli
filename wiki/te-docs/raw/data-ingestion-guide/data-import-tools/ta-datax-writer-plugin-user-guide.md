---
code: ta-datax-writer
name: "Ta-Datax-Writer Plugin User Guide"
wikiToken: ITEuwWzGsiNarbkCottcVhkWnLd
parentWikiToken: S9D7wPqKDiC6zhkvv2dc6MgonCg
updateTime: 1774249353000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=ta-datax-writer
---

## I. Introduction
Ta-Datax-Writer is a DataX plugin for writing data, which provides the function of transmitting data to TA clusters in the DataX ecosystem. You can deploy DataX on the data transmission server, and use the data source supported by DataX to read the plugin and this plugin, thus achieving data synchronization between multiple data sources and TA clusters.
To learn about DataX, you can visit [DataX's Github homepage](https://github.com/ThinkingDataAnalytics/DataX)
**The data is sent to the TA receiver for data transmission**
## II. Functions and limitations
TaDataWriter can convert the data from the DataX protocol to the internal data in the TA clusters. TaDataWriter has the following functions:
1. Support and only support writing to TA clusters.
2. Support data compression. Existing compression formats are gzip, lzo, lz4, and snappy.
3. Support multi-thread transmission.
## III. Use instructions
### 3.1 Download datax
- Visit DataX [official website](https://github.com/ThinkingDataAnalytics/DataX)
- Download DataX toolkit: [DataX download](https://download.thinkingdata.cn/tools/datax/datax.tar.gz)
```bash
wget http://datax-opensource.oss-cn-hangzhou.aliyuncs.com/datax.tar.gz
```

<image token="Ong7bmb09o2kyZxFGUMcMOx3nPf" width="978" height="172" align="center"/>

### 3.2 Decompress datax
```bash
tar -zxvf datax.tar.gz
```

### 3.3 Install the ta-datax-writer plugin
- Download the ta-datax-writer plugin: [ta-datax-writer download](https://download.thinkingdata.cn/tools/release/ta-datax-writer.tar.gz)
```bash
wget https://download.thinkingdata.cn/tools/release/ta-datax-writer.tar.gz
```

- Copy ta-datax-writer.tar.gz to the data/plugin/writer directory
```bash
cp ta-datax-writer.tar.gz data/plugin/writer
```

<image token="FWcEbhsKSo2KQCxZOECc2EBpnJb" width="687" height="380" align="center"/>

- Decompress the plugin package
```bash
tar -zxvf ta-datax-writer.tar.gz
```

- Remove package
```bash
rm -rf  ta-datax-writer.tar.gz
```

<image token="QqolbX0unokOt2xKmWgc8EwtnJg" width="494" height="384" align="center"/>

## IV. Functions
### 4.1 Configuration example
```json
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
            "pushUrl": "http://{data receiving address}",
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

### 4.2 Parameter description
- **thread**
  - Description: number of threads, used concurrently within each channel, not related to the number of channels in DataX. 
  - Required: No
  - Default value: 3
- **pushUrl**
  - Description: Access point address. 
  - Required: Yes
  - Default value: none 
- **uuid**
  - Description: Add "#uuid": "uuid value" in the transmitted data, and enable it with the [<text color="purple" underline="true">data unique ID</text>](https://thinkingdata.feishu.cn/wiki/wikcnUg2hivNLwUSLDKM2ITS0Sf#uRcTdS) function.
  - Required: No 
  - Default value: false 
- **type**
  - Description: written data type support user_set, track.
  - Required: Yes
  - Default value: none
- **compress**
  - Description: Text compression type, "not filled by default" means no compression. The supported compression types are zip, lzo, lzop, tgz, and bzip2.
  - Required: No
  - Default value: no compression
- **appid**
  - Description: project appid.
  - Required: Yes
  - Default value: none 
- **column**
  - Description:a list of fields to read. type specifies the data type, and index specifies the current column corresponding to the column of the reader (starting with 0); value specifies that the current type is constant. It does not read data from the reader, but automatically generates a column based on the value.
The user can specify the Column field as follows:
```json {wrap}
[
  {
    "type": "Number",
    "colTargetName": "test_col", // generate column name corresponding to data
    "index": 0 //transmit the first column from reader to datax and get the Number field
  },
  {
    "type": "string",
    "value": "testvalue",
    "colTargetName": "test_col"
    //generate the string field of testvalue fromTaDataWriter as the current field
  },
  {
    "index": 0,
    "type": "date",
    "colTargetName": "testdate",
    "dateFormat": "yyyy-MM-dd HH:mm:ss.SSS"
  }
]
```

- For the Column information specified by the user, at least one of index and value must be selected, and the type is not required. When setting the date type, dataFormat is optional.
  - Required: Yes
  - Default value: all read according to the reader type 
### 4.3 Type conversion
The type is TaDataWriter definition:

<lark-table rows="7" cols="2" column-widths="365,365">

  <lark-tr>
    <lark-td>
      **DataX internal type**
    </lark-td>
    <lark-td>
      **TaDataWriter data type**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      Int
    </lark-td>
    <lark-td>
      Number
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      Long
    </lark-td>
    <lark-td>
      Number
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      Double
    </lark-td>
    <lark-td>
      Number
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      String
    </lark-td>
    <lark-td>
      String
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      Boolean
    </lark-td>
    <lark-td>
      Boolean
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      Date
    </lark-td>
    <lark-td>
      Date
    </lark-td>
  </lark-tr>
</lark-table>
