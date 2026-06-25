---
code: restful_api
name: "Restful API User Guide"
wikiToken: Jsp1w2ewJiXA2wkBvU8ckXxhn6g
parentWikiToken: AWr4wIMGYi9FB7ksPi4c17kNnxh
updateTime: 1774252026000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=restful_api
---

This user guide will introduce how to use the data access API. Depending on the data access API, you can directly transmit data to the ThinkingAnalytics background by using the HTTP POST method, without relying on a transmission tool and SDK.
**Before docking, you need to read the **<text underline="true">**data rules**</text>** first, and then read this user guide after you have been familiar with TA's data format and data rules.**
**POST must upload data in the **<text underline="true">**data forma…</text>**<text underline="true">** **</text>**of ****the ****TA**
## I. Data format conversion
Before data upload, the format of the data needs to be converted to TA's data format first. Each piece of data in TA is a JSON. The data sample is as follows (for the convenience of reading, the data has been formatted):
```json
{
  "#account_id": "ABCDEFG-123-abc",
  "#distinct_id": "F53A58ED-E5DA-4F18-B082-7E1228746E88",
  "#type": "track",
  "#ip": "192.168.171.111",
  "#time": "2017-12-18 14:37:28.527",
  "#event_name": "test",
  "properties": {
    "#lib": "LogBus",
    "#lib_version": "1.0.0",
    "#screen_height": 1920,
    "#screen_width": 1080,
    "argString": "abc",
    "argNum": 123,
    "argBool": true
  }
}
```

For specific data format specifications, please refer to <text underline="true">**data format**</text>.
## II. Data reporting
When you have prepared the JSON data, you can report the data. The TA background accepts the calling request of the HTTP standard POST method, and the character set of all interface data is encoded by the UTF-8 method. The specific calling method is as follows:
### 2.1 Data receiving interface (form-data)
If you are using a cloud service, please enter the following URL:
https://global-receiver-ta.thinkingdata.cn/sync_data
If you are using a privately deployed version, please enter the following URL:
http://`data acquisition address`/sync_data
#### 2.1.1 Receive parameters (written in requestBody)
- If it is a piece of json data:
  - Parameter 1: appid= your project APPID
  - Parameter 2: data=JSON data, UTF-8 encoding, urlencode encoding required
  - Parameter 3: client=0, default 0, when it is set to 1, take the reporting terminal ip as the #ip field (mandatory substitution)
- If there are multiple pieces of data:
  - Parameter 1: appid= your project APPID
  - Parameter 2: data_list=JSONArray data, including multiple pieces of JSON data, UTF-8 encoding, urlencode encoding required
  - Parameter 3: client=0, default 0, when it is set to 1, take the reporting terminal ip as the #ip field (mandatory substitution)
**Note:** Libraries in different languages may have their own urlencode, and there is no need to urlencode again at this time, such as the requests library of Python3 and the request test of postman.
The following demonstrates how to call the RESTful API through `curl`, and the following data is the source data
```json
{
  "#account_id": "testing",
  "#time": "2019-01-01 10:00:00.000",
  "#type": "track",
  "#event_name": "testing",
  "properties": {
    "test": "test"
  }
}
```

The above data needs to be urlencoded first
```perl
%7b%22%23account_id%22%3a%22testing%22%2c%22%23time%22%3a%222019-01-01+10%3a00%3a00.000%22%2c%22%23type%22%3a%22track%22%2c%22%23event_name%22%3a%22testing%22%2c%22properties%22%3a%7b%22test%22%3a%22test%22%7d%7d
```

Add parameters and report data
```plaintext
curl "http://receiver:9080/sync_data" --data "appid=test-sdk-appid&data=%7b%22%23account_id%22%3a%22testing%22%2c%22%23time%22%3a%222019-01-01+10%3a00%3a00.000%22%2c%22%23type%22%3a%22track%22%2c%22%23event_name%22%3a%22testing%22%2c%22properties%22%3a%7b%22test%22%3a%22test%22%7d%7d"
```

#### 2.1.2 Return parameters
If the return parameter is received, code: 0, it means that the data has been successfully transmitted
#### 2.1.3 Debug mode
In the upload parameters, you can add the debug parameters (that is, three upload parameters, appid, data\\data_list, debug). You don't have to upload it, and the default is off
The Debug mode is enabled only when a small amount of test data is uploaded. Please do not enable the Debug mode in the production environment
When `debug=1`, the return result will show detailed error reasons, for example:
`{"code":-1,"msg":"The format of the #time field is incorrect, and the format of [yyyy-MM-dd HH:mm:ss] or [yyyy-MM-dd HH:mm:ss.SSS] needs to be passed" }`
### 2.2 Data receiving interface (raw)
If you are using a cloud service, please enter the following URL:
```css
https://global-receiver-ta.thinkingdata.cn/sync_json
```

If you are using a privately deployed version, please enter the following URL:
```groovy
http://data acquisition address/sync_json
```

#### 2.2.1 Receive parameters (written in requestBody)
- If it is a piece of json data:
```json
{
  "appid": "debug-appid",
  "debug": 0,
  "data": {
    "#type": "track",
    "#event_name": "test",
    "#time": "2019-11-15 11:35:53.648",
    "properties": { "a": "123", "b": 2 },
    "#distinct_id": "1111"
  }
}
```

- If there are multiple pieces of data:
```json
[
    {
        "appid": "debug-appid",
        "debug": 0,
        "data": {
          "#type": "track",
          "#event_name": "test",
          "#time": "2019-11-15 11:35:53.648",
          "properties": { "a": "123", "b": 2 },
          "#distinct_id": "1111"
        },
    {
        "appid": "debug-appid",
        "debug": 0,
        "data": {
          "#type": "track",
          "#event_name": "test",
          "#time": "2019-11-15 11:35:53.648",
          "properties": { "a": "123", "b": 2 },
          "#distinct_id": "1111"
        }
    }
}
```

#### 2.2.2 Return parameters:
If the return parameter is received, code: 0, it means that the data has been successfully transmitted
#### 2.2.3 Debug mode
In the upload parameters, you can add the debug parameter (that is, add debug parameter in json), you don't have to upload it, and the default is off
**The Debug mode is enabled only when a small amount of test data is uploaded. Please do not enable the Debug mode in the production environment**
When debug=1, the return result will show detailed error reasons, for example:
```json {wrap}
{
  "code": -1,
  "msg": "# the format of the time field is incorrect. You need to pass the format yyyy-MM-dd HH:mm:ss or yyyy-MM-dd HH:mm: ss.sss].
}
```

#### 2.2.4 Data compression
Add the compress field in the RequestHeader to upload compressed data. For example, if you upload compress=gzip, the server will decompress the data by gzip. The available compression methods are gzip, lzo, lz4, and snappy, and the default is no compression.
#### 2.2.5 Get the reporting terminal ip
Add client=1 in RequestHeader. At this time, the server will take the reporting terminal ip as the #ip field (mandatory substitution), and the default value is 0, that is, the reporting terminal ip will not be substituted
## III. FAQs
Please refer to the <text underline="true">data rule FAQs</text> and troubleshoot data transmission exceptions caused by data format problems.
