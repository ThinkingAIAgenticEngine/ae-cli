---
code: filebeat_logstash_installation
name: "Filebeat + Logstash Usage Guide"
wikiToken: FiOpwljqpi2CotkX9ofc7rDRnHc
parentWikiToken: RjUcwyNY8iQH1dk8SP9cPyz1ngf
updateTime: 1745310935000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=filebeat_logstash_installation
---

# Filebeat + Logstash Usage Guide

This section mainly introduces the usage method of data transmission tool Filebeat + Logstash:

**Before starting integration, you need to read Data Rules first. After becoming familiar with TE data format and data rules, then read this guide for integration.**

**Filebeat + Logstash uploaded data must follow TE data format**

**Note: Logstash throughput is low. If importing large amounts of historical data, recommend using DataX engine or Logbus tool**

### 1. Filebeat + Logstash Introduction

Filebeat + Logstash tool is mainly used to import log data to TE backend in real-time, monitor file streams in server log directory. When any log file in the directory has new data generated, send to TE backend in real-time.

Logstash is an open-source server-side data processing pipeline that can collect data from multiple sources simultaneously, transform data, then send data to your favorite "repository". Logstash official website introduction

Filebeat is a local file log data collector that can monitor log directories or specific log files (tail file). Filebeat provides a lightweight method for forwarding and summarizing logs and files. Filebeat official website introduction

Based on Filebeat + Logstash collection flow diagram as shown below:

### 2. Filebeat + Logstash Download and Installation

**Note: Logstash-6.x or above version, server needs JDK environment**

#### 2.2 Logstash Download and Installation

Refer to Logstash official website installation documentation, please choose method to download

#### 2.3 logstash-output-thinkingdata Plugin

**Latest version**: 1.2.0

**Update date**: 2023-04-25

##### 2.3.1 Install and Uninstall logstash-output-thinkingdata Plugin

This plugin checks whether data is json data, packages data and sends to TE

Execute in logstash directory:

```
bin/logstash-plugin install logstash-output-thinkingdata
```

Installation needs some time, please wait patiently for installation success, then execute:

```
bin/logstash-plugin list
```

If **logstash-output-thinkingdata** is in the list, it means installation is successful.

Other commands as shown:

Upgrade plugin can execute:

```
bin/logstash-plugin update logstash-output-thinkingdata
```

Uninstall plugin can execute:

```
bin/logstash-plugin uninstall logstash-output-thinkingdata
```

##### 2.3.2 Change Log

###### **v1.2.1 2023/07/26**

- Added format validation for data in message

###### **v1.2.0 2023/04/25**

- Supports multiple data in message

###### **v1.1.0 2021/01/27**

- Added support for #app_id format in data

###### **v1.0.0 2020/06/09**

- Receive message passed by Logstash event and send to TE

#### 2.4 Filebeat Download and Installation

Refer to Filebeat official installation documentation, please choose method to download

### 3. Filebeat + Logstash Usage Instructions

#### 3.1 Data Preparation

1. First, ETL convert the data to be transmitted into TE data format, and write to local or transmit to Kafka cluster. If using Java or other server SDK's write Kafka or local file consumer, data is already correct format, no need to convert again.

2. Determine the directory where uploaded data files are stored, or Kafka address and topic, and configure Filebeat + Logstash related configurations. Filebeat + Logstash will monitor file changes in file directory (monitor file creation or tail existing files), or subscribe to data in Kafka.

3. Do not directly rename data logs that have been uploaded and stored in monitoring directory. Renaming logs is equivalent to creating new files. Filebeat may re-upload these files, causing data duplication.

#### 3.2 Logstash Configuration

##### 3.2.1 Logstash Pipeline Configuration

Logstash supports running multiple Pipelines simultaneously. Each Pipeline is independent, has its own input output configuration. Pipeline configuration file is located at config/pipelines.yml. If you are currently using Logstash to complete some other log collection work, you can add a Pipeline specifically responsible for collecting TE log data on original Logstash, and send to TE.

New Pipeline configuration as follows:

```
# thinkingdata pipeline configuration
- pipeline.id: thinkingdata-output
  # If uploading user properties core count set to 1, if only uploading event properties can set less than or equal to local cpu count
  pipeline.workers: 1
  # Buffer queue type used
  queue.type: persisted
  # Use different input output configuration
  path.config: "/home/elk/conf/ta_output.conf"
```

More Pipeline configuration official website: Pipeline

##### 3.2.2 Logstash Input Output Configuration

ta_output.conf reference example:

::: tip Note

Here scenario is based on files generated by SDK, Logstash output input configuration

:::

```
# Use beats as input
input {
    beats {
        port => "5044"
    }
}
# If not server SDK generated or data conforming to TE format, need filter to filter metadata, here recommend ruby plugin filter, fourth module has example
#filter {
#   if "log4j" in [tags] {
#    ruby {
#      path => "/home/elk/conf/rb/log4j_filter.rb"
#    }
#  }
#}
# Use thinkingdata as output
output{
   thinkingdata {
        url => "http://data_collection_address/logbus"
		   appid =>"your AppID"
    }
}
```

thinkingdata parameter description:

**Parameter Name**

**Type**

**Required**

**Default Value**

**Description**

url

string

true

None

TE data receiver address

appid

string

true

None

Project APPID

flush_interval_sec

number

false

2

Trigger flush interval time, unit: seconds

flush_batch_size

number

false

500

Trigger flush json data, unit: records

compress

number

false

1

Compress data, 0 means no compression, can set in internal network; 1 means gzip compression, default gzip compression

uuid

boolean

false

false

Whether to enable UUID switch, for deduplication when network fluctuation may occur in short time interval

is_filebeat_status_record

boolean

false

true

Whether to enable Filebeat monitoring log status, such as offset, file name, etc.

##### 3.2.3 Logstash Running Configuration

Logstash defaults to use **config/logstash.yml** as running configuration.

```
pipeline.workers: 1
queue.type: persisted
queue.drain: true
```

**Recommendations**

1. When user_set uploads user properties, please change pipeline.workers value to 1. When workers value is greater than 1, it will cause data processing order change. track events can set greater than 1.
1. To ensure data transmission does not lose due to program accidental termination, please set queue.type: persisted, represents Logstash used buffer queue type. This configuration can continue to send data in buffer queue after restarting Logstash.
   **More data persistence related can see official website** persistent-queues

1. Set queue.drain value to true. This configuration will make Logstash send all data in buffer queue before normal exit.
   **More details can see official website** logstash.yml

##### 3.2.4 Logstash Startup

In Logstash installation directory:

1. Direct startup, use config/pipelines.yml as Pipeline configuration and running configuration

```
bin/logstash
```

2. Specify ta_output.conf as input output configuration file startup, will use config/logstash.yml as running configuration

```
bin/logstash -f /youpath/ta_output.conf
```

3. Background startup

```
nohup bin/logstash -f /youpath/ta_output.conf > /dev/null 2>&1 &
```

More startup, can see Logstash official startup documentation

#### 3.3 Filebeat Configuration

##### 3.3.1 Filebeat Running Configuration

Filebeat reads backend SDK log files. Filebeat default configuration file: filebeat.yml. config/filebeat.yml reference configuration as follows:

```
#======================= Filebeat inputs =========================
filebeat.shutdown_timeout: 5s
filebeat.inputs:
- type: log
  enabled: true
  paths:
     - /var/log/log.*
    #- c:\programdata\elasticsearch\logs\*
#------------------------- Logstash output ----------------------------
output.logstash:
 # Can fill one server process, or multiple Logstash processes on multiple servers
  hosts: ["ip1:5044","ip2:5044"]
  loadbalance: false
```

1. shutdown_timeout: Filebeat shutdown time waiting for publisher to complete sending events before closing.
1. **paths**: Specify logs to monitor. Currently processed according to Go language glob function, no recursive processing for configured directory.
1. **hosts**: Send address to multiple Logstash hosts. When loadbalance is false similar to primary standby function, true represents load balancing
1. **loadbalance**: If there is user_set user property upload, do not set loadbalance: true. Setting will use round-robin method to send data to all Logstash, which may cause data order disorder.
   If only importing track events, can set multiple Logstash processes, and can set loadbalance: true. Filebeat default configuration is loadbalance: false

Filebeat materials can see: Filebeat official documentation

##### 3.3.2 Filebeat Startup

After filebeat startup, view related output information:

```
 ./filebeat -e -c filebeat.yml
```

Background startup

```
nohup ./filebeat -c filebeat.yml > /dev/null 2>&1 &
```

### 4. Case Configuration Reference

#### 4.1 Filebeat Monitoring Different Log Format Data Configuration

Single Filebeat filebeat.xml can set as follows, running memory about 10 MB. Can also start multiple filebeat processes to monitor different log formats, refer to official website for details

```
#=========================== Filebeat inputs =============================

filebeat.inputs:
- type: log
  enabled: true
  #Monitor directory
  paths:
     - /home/elk/sdk/*/log.*
  #Tag data, Logstash match, no need for filter processing
  tags: ["sdklog"]
 #Data split by special character
- type: log
  enable: true
  paths: /home/txt/split.*
  #Tag data, Logstash match, need filter processing
  tags: ["split"]
 # log4j received data
- type: log
  enable: true
  paths: /home/web/logs/*.log
  # Need filter processing
  tags: ["log4j"]
   # log4j received data
 # nginx log data
- type: log
  enable: true
  paths: /home/web/logs/*.log
  tags: ["nginx"]
```

#### 4.2 Logstash Configuration

Check whether Logstash configuration file has error

```
 bin/logstash -f /home/elk/ta_output.conf --config.test_and_exit
```

**Note: All ruby plugins in following scripts are written based on ruby syntax. If you are familiar with java, can use custom parser in logbus directory**

##### 4.2.1 Server SDK Log

ta_output.conf can set as follows

```
input {
    beats {
        port => "5044"
    }
}
# Use thinkingdata as output
output{
   thinkingdata {
        url => "url"
        appid =>"appid"
        # compress => 0
        # uuid => true
    }
}
```

##### 4.2.2 log4j Log

log4j format can set as follows, set according to business log situation:

```
 //Log format
 //[%d{yyyy-MM-dd HH:mm:ss.SSS}] Log conforms to TE input time, can also be yyyy-MM-dd HH:mm:ss
 //[%level{length=5}]    Log level, debug, info, warn, error
 //[%thread-%tid]    Current thread information
 //[%logger] Current log information belongs to class full path
 //[%X{hostName}]    Current node hostname. Need to customize through MDC.
 //[%X{ip}]  Current node ip. Need to customize through MDC.
 //[%X{userId}]  User login unique ID, can set account_id, or other value. TE requires account_id and distinct_id cannot both be empty, can set other properties, see business settings. Need to customize through MDC.
 //[%X{applicationName}] Current application name. Need to customize through MDC.
 //[%F,%L,%C,%M] %F: Current log information belongs to file (class) name, %L: Log information line number in file, %C: Current log belongs to file full class name, %M: Current log belongs to method name
 //[%m]  Log detail
 //%ex   Exception information
 //%n    Line break
 <property name="patternLayout">[%d{yyyy-MM-dd HH:mm:ss.SSS}] [%level{length=5}] [%thread-%tid] [%logger] [%X{hostName}] [%X{ip}] [%X{userId}] [%X{applicationName}] [%F,%L,%C,%M] [%m] ## '%ex'%n
</property>
```

ta_output.conf configuration

```
input {
    beats {
        port => "5044"
    }
}
filter {
if "log4j" in [tags]{
    #Can also do other filter data processing
   ruby {
     path => "/home/conf/log4j.rb"
    }
 }
}
# Use thinkingdata as output
output{
  thinkingdata {
        url => "url"
        appid =>"appid"
    }
}
```

/home/conf/log4j.rb script as follows

```
# Here through parameter event can get all attributes in input
def filter(event)
  _message = event.get('message') #message is your uploaded each log
begin
  #Here regex out correct data format, if error log recommend put in separate file, error log too long no analysis scenario, and cross line
  #Here data similar to this format _message ="[2020-06-08 23:19:56.003] [INFO] [main-1] [cn.thinkingdata] [x] [123.123.123.123] [x] [x] [StartupInfoLogger.java,50,o)] ## ''"
 mess = /\[(.*?)\] \[(.*?)\] \[(.*?)\] \[(.*?)\] \[(.*?)\] \[(.*?)\] \[(.*?)\] \[(.*?)\] \[(.*?)\] ## '(.*?)'/.match(_message)
time = mess[1]
level = mess[2]
thread = mess[3]
class_name_all = mess[4]
event_name = mess[5]
ip = mess[6]
account_id = mess[7]
application_name = mess[8]
other_mess = mess[9]
exp = mess[10]

if event_name.empty? || account_id.empty?
  return []
end

properties = {
      'level' => level,
      'thread' => thread,
      'application_name' => application_name,
      'class_name_all' => class_name_all,
      'other_mess' => other_mess,
      'exp' => exp
}

  data = {
      '#ip' => ip,
      '#time' => time,
      '#account_id'=>account_id,
      '#event_name'=>event_name,   #If type is track can use, if no #event_name no upload
      '#type' =>'track',           #Can get from file, if in file, confirm whether upload data is user property or event property
      'properties' => properties
  }

  event.set('message',data.to_json)
  return [event]
  rescue
      # puts _message
      puts "Data does not conform to regex format"
      return [] #No upload
  end
end
```

##### 4.2.3 Nginx Log

First define Nginx log format. If set to json format:

```
input {
    beats {
        port => "5044"
    }
}
filter {
#If same format data no need to judge tags
if "nginx" in [tags]{
   ruby {
     path => "/home/conf/nginx.rb"
    }
 }
}
# Use thinkingdata as output
output{
  thinkingdata {
        url => "url"
        appid =>"appid"
    }
}
```

/home/conf/nginx.rb script as follows:

```
  require 'date'
   def filter(event)
      #Take similar log information
      # {"accessip_list":"124.207.82.22","client_ip":"123.207.82.22","http_host":"203.195.163.239","@timestamp":"2020-06-03T19:47:42+08:00","method":"GET","url":"/urlpath","status":"304","http_referer":"-","body_bytes_sent":"0","request_time":"0.000","user_agent":"s","total_bytes_sent":"180","server_ip":"10.104.137.230"}
      logdata= event.get('message')
       #Parse log level and request time, and save to event object
         #Parse json format log
    #Get log content
    #Convert to json object
    logInfoJson=JSON.parse logdata
    time = DateTime.parse(logInfoJson['@timestamp']).to_time.localtime.strftime('%Y-%m-%d %H:%M:%S')
    url = logInfoJson['url']
    account_id = logInfoJson['user_agent']
    #event_name
    #account_id or #distinct_id both null, skip upload
    if url.empty? || url == "/" || account_id.empty?
      return []
    end
    properties = {
      "accessip_list" => logInfoJson['accessip_list'],
      "http_host"=>logInfoJson['http_host'],
      "method" => logInfoJson['method'],
      "url"=>logInfoJson['url'],
      "status" => logInfoJson['status'].to_i,
      "http_referer" => logInfoJson['http_referer'],
      "body_bytes_sent" =>logInfoJson['body_bytes_sent'],
      "request_time" =>  logInfoJson['request_time'],
      "total_bytes_sent" => logInfoJson['total_bytes_sent'],
      "server_ip" => logInfoJson['server_ip'],
    }
  data = {
      '#ip' => logInfoJson['client_ip'],#Can be null
      '#time' => time,   #Cannot be null
      '#account_id'=>account_id, # account_id and distinct_id cannot both be null
      '#event_name'=>url,   #If type is track can use, if no #event_name no upload
      '#type' =>'track',           #Can get from file, if in file, confirm whether upload data is user property or event property
      'properties' => properties
  }
   event.set('message',data.to_json)
   return [event]

  end
```

##### 4.2.4 Other Logs

ta_output.conf configuration as follows

```
input {
    beats {
        port => "5044"
    }
}
filter {
if "other" in [tags]{
    #Can also do other filter data processing
   ruby {
     path => "/home/conf/outher.rb"
    }
 }
}
# Use thinkingdata as output
output{
  thinkingdata {
        url => "url"
        appid =>"appid"
    }
}
```

/home/conf/outher.rb script as follows:

```
# def register(params)
#   # Here through params get parameters passed through script_params in logstash file
#   #@message = params["xx"]
# end
def filter(event)
  #Here process business data, if no grok and other processing, directly get metadata in message for processing
  begin
  _message = event.get('message') #message is your uploaded each log
  #Here processed log similar to following data
  #2020-06-01 22:20:11.222,123455,123.123.123.123,login,nihaoaaaaa,400
  time,account_id,ip,event_name,msg,intdata=_message.split(/,/)
  #Or through regex match data, or json data, ruby syntax parse json, can process data here for data upload
  #mess = /regex/.match(_message)
  #time = mess[1]
  #level = mess[2]
  #thread = mess[3]
  #class_name_all = mess[4]
  #event_name = mess[5]
  #account_id = mess[6]
  #api = mess[7]

  properties = {
      'msg' => msg,
      'int_data' => intdata.to_i #to_i is int type, to_f is float type, to_s is string type (default)
  }
  data = {
      '#time' => time,
      '#account_id'=>account_id,
      '#event_name'=>event_name,
      '#ip' => ip,
      '#type' =>'track',
      'properties' => properties
  }
  event.set('message',data.to_json)

  return [event]
  rescue
       #If do not want certain data to pass or error, this data can return empty, such as account_id or distinct_id both null directly return []
       return []
  end
end
```
