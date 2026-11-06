# Restful API Usage Notes

ThinkingData provides Restful API to support HTTP Post method for reporting data to TE cluster. For detailed introduction, see official user manual [Restful API Usage Guide](https://docs-v2.thinkingdata.cn/?code=restful_api&anchorId=). This article introduces the usage notes of Restful API.

#### Usage Scenarios

Since Restful API cannot provide error retry and other fault tolerance capabilities like SDK or Logbus, **it is recommended for data report debugging, data format verification and other testing scenarios, or small amount of data one-time report, low-frequency report scenarios.**

For scenarios other than the above, it is recommended to use Logbus and other more reliable integration tools. See [LogBus2 Usage Guide](https://docs-v2.thinkingdata.cn/?version=latest&code=logbus2_installation&lan=zh-CN&anchorId=).

#### Request Methods

Restful API provides two request methods: `form-data` and `raw`. Both methods have consistent main functions, but differ in request interface, parameter passing method, etc.

| Request Method | Interface                        | Supports Data Compression | Supports Debug Mode |
| -------------- | -------------------------------- | ------------------------- | ------------------- |
| form-data      | http://YOUR_SERVER_URL/sync_data | No                        | Yes                 |
| raw            | http://YOUR_SERVER_URL/sync_json | Yes                       | Yes                 |

#### Exception Handling

**If using Restful API for production scenarios, please handle network request exceptions, report failures and other exceptions, adopt retry and other fallback strategies to avoid data loss.**

You can judge whether request is successful based on code returned by request. `"code": 0` represents success:

```json
{
  "code": 0
}
```

`"code": -1` or other non-0 values represent failure. You can analyze failure reasons based on `msg`:

```json
{
  "code": -1,
  "msg": "Data format error, not json format"
}
```

#### QPS

The `sync_data` and `sync_json` interfaces corresponding to Restful API itself have no concurrency limit, but cluster connection count has upper limit. If concurrency is too high causing cluster connection to reach upper limit, it will cause request failure.

Data volume and data length in request will affect cluster processing request duration and resources:

- Larger data volume in single request, longer request processing time. If data volume in request is too large, it is easy to cause request timeout, cluster connection full and other exceptions.
- Under same data volume premise, larger average data length, larger request body, larger memory resource consumption for request processing. If data volume and average data length in request are both large, it may cause cluster data receiving component OOM.

**Therefore, data volume in single request needs to be controlled within reasonable range, recommended not more than 1000 records. If average data length is large, need to reduce data volume in request.**

#### debug Parameter

debug parameter is used for complete verification of data format and content. Default value is 0. When cluster processes request, it only does simple verification of data JSON format and key fields. If passing `debug = 1`, cluster will do complete verification of data content and return results.

Since enabling debug mode causes data verification to generate larger resource overhead, cluster data receiving and processing performance will be affected.

**Therefore, debug mode is only used for testing and debugging, please do not use in production environment.**

Both request methods of Restful API support passing debug parameter. Parameter passing method details see [Restful API Usage Guide](https://docs-v2.thinkingdata.cn/?code=restful_api&anchorId=).

#### client Parameter

client parameter is used to identify whether to process data as client report data. If passing `client = 1`, cluster will process data as client report data. Cluster will record IP information in request and store it in `#ip` attribute, and write IP resolution results to `#country`, `#country_code`, `#province`, `#city` attributes.

Both request methods of Restful API support passing client parameter. Parameter passing method details see [Restful API Usage Guide](https://docs-v2.thinkingdata.cn/?code=restful_api&anchorId=).

#### Data Compression

Raw request method supports data compression. Adding `compress` parameter in Header can enable data compression and specify compression format, such as `compress=gzip`. Enabling data compression can reduce transmission traffic, but will have certain impact on cluster data receiving and processing performance.

Since compression and decompression implementation of different programming languages may have compatibility issues, it is recommended to choose gzip format first, and test and debug before formal use.
