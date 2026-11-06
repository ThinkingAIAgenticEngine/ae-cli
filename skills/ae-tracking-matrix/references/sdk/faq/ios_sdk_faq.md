---
title: "iOS SDK FAQ"
code: "ios_sdk_faq"
source: "Feishu MCP"
doc_id: "wikcn4nM313WpHDriYEdxvUmzqe"
fetched_at: "2026-04-20T17:29:37Z"
---

# Integrate SDK

## SDK Integration Methods

- Currently supports manual integration and automatic integration (CocoaPods), does not support Carthage integration

# Initialize SDK

## Recommended SDK Initialization Location

- Recommended to initialize SDK after user agrees to privacy policy

```objectivec
if (Privacy Policy Authorized) {
    NSString *appid = @"APPID";
    NSString *url = @"SERVER_URL";
    [TDAnalytics startAnalyticsWithAppId:appid serverUrl:url];
}
```

# SDK Cache Mechanism & Limits

## What data is stored locally by SDK?

- Basic data: Visitor ID, Device ID, static common event properties, etc., stored in Library directory
- Event data: Cached to local database Library/TDData-data.plist

## Event Data Cache Count Limit

- SDK default cache limit is 10,000 records
- Cache count can be customized, minimum value is 5,000 records

## Cache Expiration Time

- SDK default expiration time is 10 days
- Can be configured in info.plist

# SDK Data Upload Strategy

## Immediate Upload

- APP switching to background will immediately upload cached data
- debug / debug_only mode will immediately upload
- Auto-tracking events will immediately upload
- Manually calling flush() interface will immediately upload
- Each request has a maximum of 50 records

## Batch Upload

- Upload when time interval exceeds configured duration (default 30 seconds)
- Upload when cached event count reaches threshold (default 30 records)

# Visitor ID (#distinct_id)

## How to Set Visitor ID

```objectivec
[TDAnalytics setDistinctId:@"Thinker"];
```

## When Visitor ID Changes

- User clears application data
- User changes device or uninstall/reinstall
- Manually set via identify interface

# Account ID (#account_id)

## How to Set Account ID

```objectivec
[TDAnalytics login:@"TD"];
```

# Debug Mode

## Differences between Normal, Debug, DebugOnly Modes

| Mode      | Upload Mode       | Local Cache | Data Storage | Strict Data Check | Data Encryption |
| --------- | ----------------- | ----------- | ------------ | ----------------- | --------------- |
| Normal    | Batch Upload      | Yes         | Yes          | No                | Supported       |
| Debug     | One-by-one Upload | No          | Yes          | Yes               | Not Supported   |
| DebugOnly | One-by-one Upload | No          | No           | Yes               | Not Supported   |

> Do not use Debug and DebugOnly mode in production environment

# Auto-tracking Events

## ta_app_install

- Triggered when new APP install or uninstall/reinstall
- #install_time and #time not being equal is normal

## ta_app_start

- When first enabling auto-tracking
- Triggered when app switches from background to foreground

## ta_app_end

- When app switches from foreground to background, or app process is killed

## ta_app_crash

- Monitors exceptions captured by NSSetUncaughtExceptionHandler
- In Debug mode ta_app_crash may be lost

# Common Event Properties

## Static Common Event Properties

- `[TDAnalytics setSuperProperties:@{@"vip_level": @(2)}];`
- Stored locally, included in every track call

## Dynamic Common Event Properties

```objectivec
[TDAnalytics setDynamicSuperProperties:^NSDictionary * _Nonnull{
    return @{@"now": [NSDate date]};
}];
```

## Property Priority

- User-defined event properties > Dynamic common event properties > Static common event properties

# Preset Properties

## #device_id

- Obtains idfv, if unavailable obtains UUID
- Keychain persistent storage, will not change after uninstall/reinstall

## #ip

- TE server obtains ip information from http request header
- Uses third-party IP library to resolve geographic location

# Known Issues

See complete documentation for details.
