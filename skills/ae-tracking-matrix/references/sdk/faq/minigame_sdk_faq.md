---
title: "Mini Game SDK FAQ"
code: "minigame_sdk_faq"
source: "Feishu MCP"
doc_id: "wikcnvfJGsMHmKJIsEIhx0T2lyj"
fetched_at: "2026-04-20T17:29:39Z"
---

# Integrate SDK

## SDK Integration Methods

- Currently only supports local integration, NPM is not supported yet

## SDK Compatibility Notes

- Supported platforms: WeChat Mini Game, Alipay Mini Game, ByteDance Mini Game, Baidu Mini Game, etc.
- Supported engines: CocosCreator, Egret White Egret Engine, Laya Engine

# Initialize SDK

## Recommended SDK Initialization Location

- Initialize in mini game startup script, such as game.js for WeChat Mini Game

## Common Issues

### Delayed initialization causes auto-tracking event time delay

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
    size: 5,
    interval: 5000,
    storageLimit: 200,
  },
};
TDAnalytics.init(config);
```

## Data Upload Failure Reasons

- Need to configure serverUrl as mini game access domain whitelist

# SDK Cache Mechanism

## Storage Content

- Visitor ID, Device ID, event data, etc.
- Uses mini game native setStorage interface for storage

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

## Reasons for Not Seeing Data in Debug Mode

- Confirm mode is correctly enabled
- Confirm Device ID is configured in TE backend
- Confirm appId, serverUrl are correct

# Auto-tracking

## ta_mg_show

- Triggered when mini game starts, background returns to foreground
- Monitors onShow event

## ta_mg_hide

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

## Taobao Mini Game

- 3.4.4 version Batch mode loop sending issue

## OPPO Mini Game

- module is not defined error

## TikTok

- #scene property type invalid
