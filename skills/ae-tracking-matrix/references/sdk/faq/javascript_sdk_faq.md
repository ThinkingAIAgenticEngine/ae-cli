---
title: "JavaScript SDK FAQ"
code: "javascript_sdk_faq"
source: "Feishu MCP"
doc_id: "FVlZw0Q3wig1svk13CEcGlQonHd"
fetched_at: "2026-04-20T17:29:40Z"
---

# Integrate & Initialize SDK

## SDK Integration Methods

### Automatic Integration (npm)

```shell
npm install thinkingdata-browser --save
```

### Manual Integration

- Synchronous loading or asynchronous loading

## SDK Compatibility Notes

- Runtime environment must be browser, currently not compatible with IE 8 and below

# SDK Data Upload Strategy

## Network Request Method Parameter (send_method)

| Method | Request Type | Description                                             |
| ------ | ------------ | ------------------------------------------------------- |
| image  | get          | Data appended to image request, cross-origin compatible |
| ajax   | post         | Uses XMLHttpRequest, can send large amounts of data     |
| beacon | post         | Browser background sending, does not block page unload  |

## Immediate Upload

- Normal mode without batch upload enabled uploads immediately
- debug or debugOnly mode uploads immediately
- Manually calling flush() interface

## Batch Upload

```javascript
var config = {
  appId: "APP_ID",
  serverUrl: "SERVER_URL",
  send_method: "ajax",
  batch: {
    size: 5,
    interval: 5000,
    maxLimit: 200,
  },
};
```

# SDK Cache Mechanism

## Storage Content

- Visitor ID, Device ID, event data, etc.
- Uses localStorage for storage

## Cache Count Limit

- Default maximum cache of 500 records

# Visitor ID (#distinct_id)

## Default Format

- Timestamp16hex-Random16hex-UA16hex-ScreenWidthHeight-Timestamp16hex

## Manual Setting

```javascript
ta.identify("your_distinct_id");
```

## Length Limit

- Maximum length 128 characters

# Debug Mode

## mode Three Values

- normal: Normal mode
- debug: Data visible in TE Debug mode
- debug_only: Only validation, not stored in database

# Auto-tracking

## ta_page_show

- Triggered when page opens, refreshes, tab switches back to current page
- Monitors visibilitychange event, document.hidden = false

## ta_page_hide

- Triggered when page closes, tab switches, minimize
- Monitors visibilitychange event, document.hidden = true

## ta_pageview

- Requires calling quick() method for manual upload
- Difference from ta_page_show: ta_page_show is auto-tracked, ta_pageview requires manual call

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

## Page Common Properties

```javascript
ta.setPageProperty({ page_id: "page10001" });
```

## Property Priority

- User-defined > Page common > Dynamic common > Static common

# Preset Properties

## Device ID (#device_id)

- Default same as Visitor ID

## IP Address (#ip)

- Server resolves from request header
- Can manually upload #ip

# Common Issues

## Error Cannot read properties of undefined (reading 'getOptTracking')

- SDK interface called before initialization, needs to be called after initialization

## Error net::ERR_BLOCKED_BY_ORB

- Default uses image mode upload, can set imgUseCrossorigin: true

## How to Upload Data in pagehide

- Use trackWithBeacon method

# Known Issues

See complete documentation for details.
