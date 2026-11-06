---
title: "Unity SDK FAQ"
code: "unity_sdk_faq"
source: "Feishu MCP"
doc_id: "wikcnZ5YKmQd4b26mJQ2uiF6fvd"
fetched_at: "2026-04-20T17:29:38Z"
---

> This document mainly addresses issues for Unity builds on platforms other than Android / iOS. Android / iOS platforms use native SDK by default.

# SDK Initialization

## Recommended SDK Initialization Location

- Recommended to initialize SDK after user agrees to privacy policy

## Initialization Methods

### Manual Initialization

```csharp
using ThinkingData.Analytics;
TDAnalytics.Init("APPID","SERVER");
// Or initialize via TDConfig
TDConfig config = new TDConfig("APPID","SERVER");
TDAnalytics.Init(config);
```

### Automatic Initialization

- Add TDAnalytics prefab and set SDK configuration

# Data Cache Mechanism

## Storage Location

- Stored via PlayerPrefs, on Mac OS X stored in ~/Library/Preferences

## Cache Limit

- No upper limit on cached data, cached data has no expiration deletion policy

# Data Upload Strategy

## Data Upload Trigger Scenarios

- APP switches to background
- Auto-tracking event generated
- Calling flush() interface
- Cached data count reaches threshold (default 30 records)
- Upload time interval exceeds threshold (default 30 seconds)
- DEBUG / DEBUG_ONLY mode direct upload

# Visitor ID (#distinct_id)

## Set Visitor ID

```csharp
TDAnalytics.SetDistinctId("Thinker");
```

## Visitor ID Change Scenarios

- User clears application data
- User uninstall/reinstall or change device
- Calling SetDistinctId() interface

# Account ID (#account_id)

## Set Account ID

```csharp
TDAnalytics.Login("TA");
```

# Device ID (#device_id)

## Generation Rules

- UNITY_WEBGL: Gets System.Guid.NewGuid().ToString("N")
- Other platforms: Gets SystemInfo.deviceUniqueIdentifier

# Debug Mode

## Differences between Normal, Debug, DebugOnly Modes

| Mode      | Upload Mode       | Data Storage | Strict Data Check | Data Encryption |
| --------- | ----------------- | ------------ | ----------------- | --------------- |
| Normal    | Batch Upload      | Yes          | No                | Supported       |
| Debug     | One-by-one Upload | Yes          | Yes               | Not Supported   |
| DebugOnly | One-by-one Upload | No           | Yes               | Not Supported   |

# Auto-tracking Events

## ta_app_install

- Triggered when app is installed or reinstalled after uninstall

## ta_app_start

- Application gains focus

## ta_app_end

- Application loses focus or exits

## ta_app_crash

- Monitors UnhandledException or LogType.Error, etc.
- Version 2.2.0+ by default collects C# exceptions

## ta_scene_loaded / ta_scene_unloaded

- Monitors SceneManager callbacks

# Common Event Properties

## Static Common Event Properties

- setSuperProperties method, stored locally

## Dynamic Common Event Properties

- Callback function is called each time track() is invoked to get current value

## Property Priority

- User-defined event properties > Dynamic common event properties > Static common event properties

# Preset Properties

## #ip

- TE server obtains ip from http request header

## #os

- Unity WebGL converted WeChat Mini Game #os is "other"

# Exception Issues

See complete documentation for details.

# Known Issues

- Missing #zone_offset issue after building iOS & Android
- Known bugs in multiple versions and fix versions
  See complete documentation for details.
