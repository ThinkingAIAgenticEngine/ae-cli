# LogBus2 Data Parser Plugin

> Logbus2 supports customer custom data parser from version 2.1.0.0, used for custom format conversion when original data format is inconsistent with TE data format. Functionality is comparable to Logbus1's Custom Interceptor feature.

## 1. Preparation

### Data Format

1. gRPC plugin server receives data for batch processing, multiple data records are concatenated using Logbus2 configuration parameter parser.separator (default ::)
2. Single data record is concatenated with file name or Kafka topic name, using configuration parameter parser.index_separator (default |ta|)

Example:

```python
# File name: event.log
# Original data 2 records:
{"user_id": "abc", "distinct_id": "123"}
{"user_id": "def", "distinct_id": "456"}

# Data received by gRPC plugin server:
event.log|ta|{"user_id": "abc", "distinct_id": "123"} ::event.log|ta|{"user_id": "def", "distinct_id": "456"}
```

gRPC plugin server return data format, concatenated using parser.separator to convert to standard ta format data:

```python
# Return data should be:
{"#account_id": "abc", "#distinct_id": "123"}::{\"#account_id\": \"def\", \"distinct_id\": \"456\"}
```

Error handling:

- Returning non-correct json data, main program will skip error lines
- Returning non-standard ta data, data report will produce errors
- Returning second parameter as error, will perform infinite retry to prevent error data entering te cluster. Can combine with alert function to predict error information in advance.

### proto File

parser.proto file is used to generate gRPC server code in various languages.

### Java

1. JDK 8+ (Logbus deployment environment and development environment should be consistent), Maven
2. Download protobuf compiler: https://github.com/protocolbuffers/protobuf/releases
3. Download grpc-java compiler: https://repo.maven.apache.org/maven2/io/grpc/protoc-gen-grpc-java/

Compilation steps:

```shell
# Generate ParserGrpc.java file
protoc --plugin=protoc-gen-grpc-java=protoc-gen-grpc-java-1.51.0-osx-aarch_64.exe  --grpc-java_out=/ta/path/ -I=/ta/path/ /ta/path/parser.proto

# Generate ParserOuterClass.java file
protoc --experimental_allow_proto3_optional -I /ta/path/ --java_out=/ta/path/ /ta/path/parser.proto
```

### Python

1. Python3.6+
2. Install third-party libraries:

```shell
pip3 install grpcio-tools==1.48.2 -i https://pypi.tuna.tsinghua.edu.cn/simple
pip3 install grpcio-health-checking==1.48.2 -i https://pypi.tuna.tsinghua.edu.cn/simple
```

Compilation steps:

```shell
python -m grpc_tools.protoc -I /ta/path/ --python_out=/ta/path/ --grpc_python_out=/ta/path/ /ta/path/parser.proto
```

## 2. gRPC Server Development

### Java Version (Required version JDK 8+)

Maven dependencies:

```xml
<dependencies>
    <dependency>
        <groupId>com.google.protobuf</groupId>
        <artifactId>protobuf-java</artifactId>
        <version>3.19.4</version>
    </dependency>
    <dependency>
        <groupId>io.grpc</groupId>
        <artifactId>grpc-all</artifactId>
        <version>1.51.0</version>
    </dependency>
</dependencies>
```

Parser logic demo:

```java
package org.interceptor.logbus2.service;

import org.interceptor.logbus2.proto.ParserGrpc;
import org.interceptor.logbus2.proto.ParserOuterClass;
import com.google.protobuf.ByteString;
import io.grpc.Server;
import io.grpc.ServerBuilder;
import io.grpc.stub.StreamObserver;
import java.util.*;

public class Demo extends ParserGrpc.ParserImplBase {

    // Corresponds to logbus2 parameter parser.separator, custom separator between multiple data records, default ::
    private static final String separator = ":ta:";

    // Corresponds to logbus2 parameter parser.index_separator, separator between index and data for single data record, default |ta|
    private static final String indexSeparator = "\\|ta\\|";

    // Corresponds to logbus2 parameter parser.batch_separator, separator for converting one data to multiple data, default 0x01
    private static final String batchSeparator = new String(new byte[]{0x01}, StandardCharsets.UTF_8);

    public static String parseData(final String rawData) {
        try {
            // Processing logic: convert "test" character in received data to "product", and increase data to 3 records
            String parseData = JSON.toJSONString(JSON.parseObject(rawData.replaceAll("test", "product"), TaDataDo.class));
            return parseData + batchSeparator + parseData + batchSeparator + parseData;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    @Override
    public void parse(ParserOuterClass.Request request, StreamObserver<ParserOuterClass.Response> responseObserver) {
        String content = request.getContent().toStringUtf8();
        String[] datas = content.split(separator);
        List<String> responseList = new ArrayList<>();

        for (String data : datas) {
            try {
                String[] split = data.split(indexSeparator);
                responseList.add(parseData(split[1]));
            } catch (Exception e) {
                responseList.add("{}");
                e.printStackTrace();
            }
        }
        String join = String.join(separator, responseList);

        ParserOuterClass.Response response = ParserOuterClass.Response.newBuilder().setContent(ByteString.copyFrom(join.getBytes())).build();
        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }

    public static void main(String[] args) throws InterruptedException {
        int availablePort = RandomUtils.nextInt(10000, 12000);
        Server server = null;
        for (int i = availablePort; i < 60000; i++) {
            try {
                server = ServerBuilder.forPort(i)
                        .maxInboundMessageSize(100 * 1024 * 1024)
                        .addService(new Demo())
                        .build()
                        .start();
                break;
            } catch (IOException e) {
                // Port unavailable, try the next one
            }
        }
        assert server != null;
        // Important: This output is for logbus to get, format cannot be changed
        System.out.println("1|1|tcp|127.0.0.1:" + server.getPort() + "|grpc");
        server.awaitTermination();
    }
}
```

### Python Version

```python
import random
from concurrent import futures
import socket
import sys
import json
import grpc
import parser_pb2
import parser_pb2_grpc
from grpc_health.v1.health import HealthServicer
from grpc_health.v1 import health_pb2, health_pb2_grpc

separator = ":ta:"
index_separator = "|ta|"

class ParserServicer(parser_pb2_grpc.ParserServicer):
    def Parse(self, request, context):
        data = request.content
        result = parser_pb2.Response()
        data_list = data.decode('utf-8').split(separator)
        return_data_list = []
        for data in data_list:
            try:
                raw_data_list = data.replace('\r\n', '').split(index_separator)
                parse_data = json.loads(raw_data_list[1])
                new_parse_data = {}
                new_parse_data["properties"] = parse_data.copy()
                new_parse_data["#account_id"] = parse_data["ACCOUNTID"]
                new_parse_data["#distinct_id"] = parse_data["OSTYPE"]
                new_parse_data["#type"] = "track"
                new_parse_data["#ip"] = parse_data["IP"]
                new_parse_data["#uuid"] = parse_data["UID"]
                new_parse_data["#time"] = parse_data["LOGTM"]
                new_parse_data["#event_name"] = "event_" + str(parse_data["CODE"])
                return_data_list.append(json.dumps(new_parse_data))
            except Exception as ve:
                return_data_list.append('{}')
        result.content = separator.join(return_data_list).encode('utf-8')
        return result

def serve():
    health = HealthServicer()
    health.set("plugin", health_pb2.HealthCheckResponse.ServingStatus.Value('SERVING'))
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10), options=[
         ('grpc.max_send_message_length', 4 * 1024 * 1024),
         ('grpc.max_receive_message_length', 4 * 1024 * 1024),
    ])
    parser_pb2_grpc.add_ParserServicer_to_server(ParserServicer(), server)
    health_pb2_grpc.add_HealthServicer_to_server(health, server)
    port = get_open_port_in_random_range()
    server.add_insecure_port(f'127.0.0.1:{port}')
    server.start()
    try:
        # Important: This output is for logbus to get, format cannot be changed
        print(f'1|1|tcp|127.0.0.1:{port}|grpc')
        sys.stdout.flush()
        while True:
            time.sleep(60*60*24)
    except KeyboardInterrupt:
        server.stop(0)

if __name__ == '__main__':
    serve()
```

## 3. Local gRPC Debugging

Create local debugging gRPC client, start client to send message after server starts.

### Java Client

```java
public class ProtoClient {
    private static final String indexSeparator = "|ta|";

    public static void main(String[] args) {
        String event = "{\"#type\":\"track\",\"#time\":\"2023-09-05 18:58:17.021\",\"#event_name\":\"test\",\"#account_id\":\"test\",\"properties\":{\"#lib\":\"tga_python_sdk\"}}";

        ManagedChannel channel = ManagedChannelBuilder.forAddress("127.0.0.1", 12345)
                .usePlaintext()
                .build();
        ParserGrpc.ParserBlockingStub stub = ParserGrpc.newBlockingStub(channel);
        ParserOuterClass.Request request = ParserOuterClass.Request.newBuilder()
                .setContent(ByteString.copyFrom(("ta.log"+ indexSeparator + event).getBytes()))
                .build();

        try {
            ParserOuterClass.Response response = stub.parse(request);
            System.out.println("Server Response: " + response.getContent().toStringUtf8());
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            channel.shutdown();
        }
    }
}
```

### Python Client

```python
import grpc
import parser_pb2
import parser_pb2_grpc

def send_grpc_request():
    channel = grpc.insecure_channel('127.0.0.1:12345')
    stub = parser_pb2_grpc.ParserStub(channel)
    event = '{"#type":"track","#time":"2023-09-04 16:46:06.055","#event_name":"test","#distinct_id":"test"}'
    request = parser_pb2.Request(content=f'1.log|ta|{event}'.encode('utf-8'))
    response = stub.Parse(request)
    print("Response received:", response.content)

if __name__ == '__main__':
    send_grpc_request()
```

## 4. Configuration

### Logbus2 Configuration File

```json
{
  "datasource": [
    {
      "file_patterns": ["/path/server_log/*log"],
      "app_id": "debug-appid",
      "parser": {
        "cmd": "java -jar /path/lib/xxx.jar",
        "depend_sh": "true",
        "separator": ":ta:",
        "hand_shake": {
          "protocol_version": 1,
          "magic_cookie_key": "LogBus",
          "magic_cookie_value": "v2"
        }
      }
    }
  ],
  "push_url": "http://push_url"
}
```

> Note: Comments should be removed before starting

## 5. FAQ

1. **Startup error: Unrecongnized remote plugin message......latest protocol**

Cause: Program uses proto generated files not latest, Logbus client verification failed

Solution: Refer to preparation section, regenerate java classes or python files based on proto file

2. **Log error: Parser return data is invalid: length is changed**

Cause: Current version Logbus2 parser plugin verifies whether data count before and after parsing is same, if different will cause verification failure

Solution: Confirm whether data count before and after parsing is same, if one-to-many function is needed, use parser.batch_separator for data concatenation

3. **Logbus log error: rpc error: code = Canceled desc = stream terminated by RST_STREAM with error code: CANCEL**

Also Java program error: io.grpc.StatusRuntimeException: RESOURCE_EXHAUSTED: gRPC message exceeds maximum size

Cause: Parser program set transmission data byte size too small, causing logbus and Java parser program RPC communication transmission failure

Solution: Increase maximum transmission byte size in program, Java setting: maxInboundMessageSize(100*1024*1024)

4. **Startup error: plugin [parser] start failed: fork/exec /bin/sh: bad file descriptor**

Cause: Due to plugin compiler compatibility issue, cannot run in mac environment currently

Solution: Need to run in linux / windows environment
