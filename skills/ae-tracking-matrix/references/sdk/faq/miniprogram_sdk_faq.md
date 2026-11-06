---
title: "Mini Program SDK FAQ"
code: "miniprogram_sdk_faq"
source: "Feishu MCP"
doc_id: "wikcnFKi1tU3gBHjbIqVy4M6GGe"
fetched_at: "2026-04-20T17:29:39Z"
---

# Integrate SDK

## SDK Integration Methods

- Currently only supports local integration, NPM is not supported yet

## SDK Compatibility Notes

- Supported platforms: WeChat Mini Program, Alipay Mini Program, ByteDance Mini Program, Baidu Mini Program, etc.

# Initialize SDK

## Recommended SDK Initialization Location

- Initialize in mini program startup script, such as app.js for WeChat Mini Program

## Common Issues

### Delayed initialization causes first auto-tracking event after initialization to fail upload

### Device without network SDK initialization will not fail

# SDK Data Upload Strategy

## Real-time Upload

- Default immediate upload after collection, retry 3 times on failure

## Scheduled Batch Upload

```javascript
var config = {
  appId: "APP_ID",
  serverUrl: "SERVER_URL",
  enableBatch: true,
  batchConfig: {
    size: 20,
    interval: 10000,
    storageLimit: 100,
  },
};
TDAnalytics.init(config);
```

## Data Upload Failure Reasons

- Need to configure serverUrl as mini program access domain whitelist

# SDK Cache Mechanism

## Storage Content

- Visitor ID, Device ID, event data, etc.
- Uses mini program native setStorage interface for storage

## Cache Count Limit

- Default maximum cache of 200 records

# Visitor ID (#distinct_id)

## Default Format

- Random number-current timestamp, such as 2267955649-1679397798804

## Length Limit

- Maximum length 128 characters

# Debug Mode

## debugMode Three Values

- none: Normal mode
- debug: Data visible in TE Debug mode, participates in analysis
- debugOnly: Only validation, not stored in database

# Auto-tracking Events

## ta_mp_launch

- Triggered when mini program cold start initialization completes
- Monitors onLaunch callback

## ta_mp_view

- Triggered when mini program starts, background returns to foreground, page switches
- Monitors Page onShow event

## ta_mp_share

- Triggered after clicking mini program page share button
- Requires onShareAppMessage configuration

## ta_mp_show

- Triggered when mini program starts, background returns to foreground
- Monitors onShow event

## ta_mp_hide

- Triggered when foreground switches to background
- Monitors onHide event
- #duration is time difference from onShow to onHide

# Common Event Properties

## Static Common Event Properties

```javascript
ta.setSuperProperties({ channel: "Channel Name", user_name: "User Name" });
```

## Dynamic Common Event Properties

```javascript
ta.setDynamicSuperProperties(function () {
  return { gold_coin: getGold() };
});
```

## Property Priority

- User-defined > Dynamic common > Static common

# Preset Properties

## Device ID (#device_id)

- Default same as Visitor ID

## IP Address (#ip)

- Server resolves from request header
- Can manually upload #ip

# Known Issues

## WeChat Mini Program

- login method error TypeError: e.trim is not a function, needs to pass string

## Taobao Mini Program

- 3.3.4 Uncaught TypeError, need to upgrade SDK to 3.5.1
