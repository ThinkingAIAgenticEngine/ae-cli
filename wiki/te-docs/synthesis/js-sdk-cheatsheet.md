---
topic: JavaScript SDK Cheatsheet
sources:
  - raw/data-ingestion-guide/client-sdk/javascript.md
  - raw/data-ingestion-guide/client-sdk/javascript/javascript-advanced.md
  - raw/data-ingestion-guide/client-sdk/javascript/javascript-advanced/automatic-event-tracking.md
  - raw/data-ingestion-guide/client-sdk/javascript/javascript-advanced/preset-properties.md
generated: 2026-06-16
---

## Overview

The ThinkingData JavaScript SDK (latest version 2.5.1, ~58 KB) runs in browsers and supports IE 9+. It provides automatic, manual, and hybrid event tracking, user identity management, and a rich set of user property APIs. This cheatsheet covers initialization, core tracking APIs, auto-track configuration, super properties, user properties, and preset properties in one place.

---

## 1. SDK Integration & Initialization

### 1.1 NPM (Automatic Integration)

```javascript
npm install thinkingdata-browser --save

import ta from "thinkingdata-browser";

var config = {
    appId: "APP_ID",
    serverUrl: "https://YOUR_SERVER_URL",
    autoTrack: {
        pageShow: true,   // event name: ta_page_show
        pageHide: true,   // event name: ta_page_hide
        pageView: true,   // SPA page browse, event name: ta_pageview
        pageClick: true   // element click, event name: ta_page_click
    }
};
ta.init(config);
```

### 1.2 Script Tag (Manual Integration)

**Asynchronous loading** uses `thinkingdata.min.js` and a self-executing bootstrap snippet. Key parameters: `name` (global call variable), `sdkUrl` (script URL), `loaded` (callback after SDK load, fires before any queued data is sent -- ideal for setting user ID).

**Synchronous loading** uses `thinkingdata.umd.min.js`:

```javascript
<script src="./thinkingdata.umd.min.js"></script>
<script>
var config = {
    appId: 'APP_ID',
    serverUrl: 'https://YOUR_SERVER_URL',
    autoTrack: { pageShow: true, pageHide: true }
};
window.ta = thinkingdata;
ta.init(config);
</script>
```

### 1.3 Init Config Options Reference

| Config Key | Type | Default | Description |
|---|---|---|---|
| `appId` | string | required | Your project APP ID from the TE management page |
| `serverUrl` | string | required | Receiver URL (SaaS) or custom tracking URL (private deployment) |
| `autoTrack` | object | `{}` | Auto-track switches (see Section 4) |
| `send_method` | string | - | `'ajax'` for batch sending |
| `batch` | bool/object | `false` | Enable batch sending, or `{size, interval, storageLimit}` |
| `zoneOffset` | number | local | Default timezone offset in hours (e.g., `8` for UTC+8) |
| `disableRConfig` | bool | `false` | Set `true` to prevent SDK from pulling remote config at init |
| `secretKey` | object | - | Encryption: `{publicKey, version}` (requires crypto-js + jsencrypt) |

### 1.4 Batch Sending

```javascript
var config = {
    appId: 'xxx',
    serverUrl: 'xxx',
    send_method: 'ajax',
    batch: {
        size: 5,         // max per batch send, default 5, min 1, max 30
        interval: 5000,  // send interval in ms, default 6000
        storageLimit: 200 // max locally cached items, default 200
    }
};
```

**Notes:** Batch sending cannot be used with callbacks or `app_js_bridge`. Data in `debug`/`debugOnly` mode is sent directly regardless.

---

## 2. User Identity Management

The SDK generates a random UUID as the default distinct ID. Call `login` after the user authenticates to associate events with an account.

| API | Description |
|---|---|
| `ta.getDistinctId()` | Returns the current distinct ID |
| `ta.getDeviceId()` | Returns the device ID |
| `ta.identify("custom_id")` | Overrides the default distinct ID with your own system's ID |
| `ta.login("account_id")` | Associates events with a user account (sets `#account_id`) |
| `ta.logout()` | Removes account ID, reverts to distinct ID |

```javascript
// Set a custom distinct ID immediately after init
ta.identify("Thinker");

// When user logs in
ta.login("user_12345");

// When user explicitly logs out
ta.logout();
```

---

## 3. Event Tracking APIs

### 3.1 Ordinary Events (`track`)

```javascript
ta.track("product_buy", { product_name: "tv" });
```

Event name: string, starts with a letter, max 50 chars, supports letters / digits / underscore `_`.

### 3.2 Event-Type Comparison

| Type | API | Behavior | Use Case |
|---|---|---|---|
| Ordinary | `ta.track(name, props)` | Fires every time | Most user actions |
| First Event | `ta.trackFirst({eventName, properties, firstCheckId?})` | Recorded only once per device/ID | Device activation, first purchase |
| Updatable Event | `ta.trackUpdate({eventName, properties, eventId})` | Merges new properties into existing event by `eventId` | Order status updates |
| Overwriteable Event | `ta.trackOverwrite({eventName, properties, eventId})` | Replaces entire event data by `eventId` | Full data replacement |

**First Event Example:**

```javascript
// Once per device
ta.trackFirst({
    eventName: "device_activation",
    properties: { key: "value" }
});

// Once per custom dimension (e.g., user account)
ta.trackFirst({
    eventName: "account_activation",
    firstCheckId: "TA",
    properties: { key: "value" }
});
```

> First events are stored ~1 hour later due to server-side deduplication checks.

**Updatable Event Example:**

```javascript
ta.trackUpdate({
    eventName: "UPDATABLE_EVENT",
    properties: { status: 3, price: 100 },
    eventId: "test_event_id"
});

// Later: only status changes, price is preserved
ta.trackUpdate({
    eventName: "UPDATABLE_EVENT",
    properties: { status: 5 },
    eventId: "test_event_id"
});
```

**Overwriteable Event Example:**

```javascript
ta.trackOverwrite({
    eventName: "OVERWRITE_EVENT",
    properties: { status: 3, price: 100 },
    eventId: "test_event_id"
});

// Later: all previous properties are replaced
ta.trackOverwrite({
    eventName: "OVERWRITE_EVENT",
    properties: { status: 5 },
    eventId: "test_event_id"
});
// price is now deleted
```

### 3.3 Timing Events

```javascript
// Start timing
ta.timeEvent("stay_shop");

// ... user browses the product page ...

// End timing -- #duration (seconds) is automatically appended
ta.track("stay_shop", { product_name: "product_name" });
```

Only one timer per event name can run at a time.

---

## 4. Auto-Track Configuration

All auto-track settings go under the `autoTrack` key in the init config object.

| Setting | Type | Event Name | Description | Since |
|---|---|---|---|---|
| `pageShow` | bool | `ta_page_show` | Page display event | v1.x |
| `pageHide` | bool | `ta_page_hide` | Page hide event (includes `#duration`) | v1.x |
| `pageView` | bool | `ta_pageview` | SPA route-change browse event | v2.4.0 |
| `pageClick` | bool | `ta_page_click` | Element click event | v2.5.0 |

### 4.1 Full Auto-Track Example with Custom Properties

```javascript
var config = {
    appId: 'xxx',
    serverUrl: 'xxx',
    autoTrack: {
        pageShow: true,
        pageHide: true,
        pageView: true,
        pageClick: true,
        properties: {
            staticKey: 'staticValue'
        },
        callback: (eventType) => {
            if (eventType === 'pageShow') {
                return { appShowKey: 'appShowValue' };
            } else if (eventType === 'pageHide') {
                return { appHideKey: 'appHideValue' };
            } else if (eventType === 'pageView') {
                return { pageViewKey: 'pageViewValue' };
            }
            return {};
        }
    }
};
```

- `properties`: static properties added to every auto-track event.
- `callback(eventType)`: returns dynamic properties per auto-track event type.

### 4.2 Page Click Details

When `pageClick: true`, the SDK collects clicks on elements with `onclick` or `td-track-id`:

```html
<button onclick="testFun()" td-track-id="buttonId">test button</button>
```

The `#element_id` property is automatically added with the value of `td-track-id`. The element identifier is resolved in this priority order:

1. Custom attribute `td-track-id`
2. Element `innerHTML`
3. Element `value`
4. Fallback: `"ID not obtained"`

**Ignore click on an element:**

```html
<!-- Standard HTML -->
<button onclick="testFun()" td-track-ignore>test button</button>
<!-- React: must use td-track-ignore="true" -->
<button onClick={testFun} td-track-ignore="true">test button</button>
```

> Vue projects: elements lack `onclick` -- use `td-track-id` exclusively for click filtering.

### 4.3 Manual Element Click Tracking (`trackLink`)

For finer control, use `trackLink` to attach listeners to specific elements:

```javascript
ta.trackLink(
    { tag: ["a", "button"], class: ["class1"], id: ["id1"] },
    "click_event_name",
    { production: "production", name: "name" }
);
```

> `trackLink` sets listeners once. New elements added after the call are not monitored -- call `trackLink` again for them.

### 4.4 Manual Page Browsing (`quick("autoTrack")`)

```javascript
// Report a page view immediately
ta.quick("autoTrack");

// With custom properties
ta.quick('autoTrack', {
    name: 'test_name',
    time: new Date(),
    pro: [1, 2, 3, 4]
});
```

---

## 5. Super Properties

Super properties are automatically appended to every event. There are three tiers with different priorities and caching behavior.

| Type | API | Priority | Persistence | Value Type |
|---|---|---|---|---|
| Page Public Properties | `ta.setPageProperty(props)` | Highest | Current page only | Static only |
| Dynamic Super Properties | `ta.setDynamicSuperProperties(fn)` | Medium | Cleared on re-init | Dynamic (function return) |
| Static Super Properties | `ta.setSuperProperties(props)` | Lowest | localStorage/cookie | Static only |

### 5.1 Static Super Properties

```javascript
// Set
ta.setSuperProperties({ vip_level: 2, channel: "te" });

// Get all
var sp = ta.getSuperProperties();

// Remove one
ta.unsetSuperProperty("channel");

// Remove all
ta.clearSuperProperties();
```

### 5.2 Page Public Properties

```javascript
ta.setPageProperty({ page_id: "page10001" });

// Get current page's public properties
var pp = ta.getPageProperty();
```

### 5.3 Dynamic Super Properties

```javascript
ta.setDynamicSuperProperties(function() {
    var d = new Date();
    d.setHours(10);
    return { date: d };
});
```

The callback is invoked at every `track` call, and its return value is merged into the event properties.

### 5.4 Property Value Types

Super properties (and all event/user properties) support:

- `string`, `number`, `boolean`
- `Date` (converts to time)
- `object` (flat key-value)
- `array` (e.g., `["value"]`)
- `array of objects` (e.g., `[{key: "value"}]`)

Key rules: starts with a letter, contains letters/digits/underscores only, max 50 characters, case-insensitive (uppercase is converted to lowercase by TE).

---

## 6. User Properties API Reference

| API | Behavior | Example |
|---|---|---|
| `userSet(props)` | Sets properties, overwrites existing | `ta.userSet({ username: "TA" })` |
| `userSetOnce(props)` | Sets once, ignores subsequent calls | `ta.userSetOnce({ first_payment_time: "2018-01-01" })` |
| `userAdd(props)` | Adds to numeric properties (negative = subtract) | `ta.userAdd({ total_revenue: 30 })` |
| `userUnset("key")` | Resets a single property | `ta.userUnset("userPropertykey")` |
| `userDelete()` | Deletes the user (events remain queryable) | `ta.userDelete()` |
| `userAppend(props)` | Appends to array properties (allows duplicates) | `ta.userAppend({ user_list: ["a", "b"] })` |
| `userUniqAppend(props)` | Appends to array properties (deduplicated) | `ta.userUniqAppend({ user_list: ["a", "c"] })` |

```javascript
// userSet overwrites
ta.userSet({ username: "TA" });   // username = "TA"
ta.userSet({ username: "TE" });   // username = "TE"

// userSetOnce: first write wins
ta.userSetOnce({ first_payment_time: "2018-01-01" });
ta.userSetOnce({ first_payment_time: "2018-12-31" }); // ignored

// userAdd accumulates
ta.userAdd({ total_revenue: 30 });   // total_revenue = 30
ta.userAdd({ total_revenue: 648 });  // total_revenue = 678

// userAppend vs userUniqAppend
ta.userAppend({ user_list: ["apple", "ball"] });     // ["apple", "ball"]
ta.userAppend({ user_list: ["apple", "cube"] });     // ["apple", "ball", "apple", "cube"]
ta.userUniqAppend({ user_list: ["apple", "cube"] }); // ["apple", "ball", "cube"]
```

---

## 7. Preset Properties

### 7.1 All Events

Every event (including auto-track events) carries these preset properties:

| Property | Display Name | Type | Description |
|---|---|---|---|
| `#os` | OS | Text | Operating system (e.g., "Mac OS X") |
| `#screen_width` | Screen Width | Number | Screen width in pixels |
| `#screen_height` | Screen Height | Number | Screen height in pixels |
| `#browser` | Browser | Text | Browser type (e.g., "Chrome") |
| `#browser_version` | Browser Version | Text | Browser version |
| `#device_id` | Device ID | Text | Device identifier |
| `#zone_offset` | Timezone Offset | Number | UTC offset in hours |

### 7.2 Auto-Track Events Only

These additional preset properties are added to auto-track events (`ta_page_show`, `ta_page_hide`, `ta_pageview`, `ta_page_click`):

| Property | Description |
|---|---|
| `#url` | Current full URL of the page |
| `#url_path` | Current URL path |
| `#referrer` | Referrer URL (previous page address) |
| `#referrer_host` | Referrer hostname |
| `#title` | Current page title |

### 7.3 Retrieving Preset Properties Programmatically

```javascript
var presetProperties = ta.getPresetProperties();

// All preset properties as an event property object
var props = presetProperties.toEventPresetProperties();
/*
{
    "#os": "Mac OS X",
    "#screen_width": 1920,
    "#screen_height": 1080,
    "#browser": "Chrome",
    "#browser_version": "91.0.4472.114",
    "#device_id": "17a3858fafd9b4-...",
    "#zone_offset": 8
}
*/

// Individual access
var os = presetProperties.os;
var screenWidth = presetProperties.screenWidth;
var screenHeight = presetProperties.screenHeight;
var browser = presetProperties.browser;
var browserVersion = presetProperties.browserVersion;
var deviceId = presetProperties.deviceId;
var zoneOffset = presetProperties.zoneOffset;
```

Use this when server-side data tracking needs client-side preset properties.

---

## 8. Advanced Features

### 8.1 Cross-Domain Tracking (`siteLinker`)

Unify user identity across two different domains:

```javascript
ta.quick('siteLinker', {
    linker: [
        { part_url: 'thinkingdata.cn', after_hash: true },
        { part_url: 'example.com', after_hash: true }
    ]
});
```

- `part_url`: substring of the target domain URL
- `after_hash`: `true` appends `_tasdk` parameter to the hash fragment; `false` appends to the query string

### 8.2 Encryption

```javascript
var config = {
    appId: "xxx",
    serverUrl: "xxx",
    secretKey: {
        publicKey: 'public_key_from_te_admin',
        version: 1
    }
};
```

Requires additional dependencies:
```html
<script src="https://cdn.bootcdn.net/ajax/libs/crypto-js/4.1.1/crypto-js.js"></script>
<script src="https://cdn.bootcss.com/jsencrypt/3.2.1/jsencrypt.js"></script>
```

### 8.3 Default Timezone

```javascript
var config = {
    appId: "xxx",
    serverUrl: "xxx",
    zoneOffset: 8   // UTC+8; omit to use device local time
};
```

> When a fixed timezone is set, the device's local timezone information is lost in the event. Add a custom property if you need to preserve it.

### 8.4 Best-Practice Initialization Order

```javascript
import ta from "thinkingdata-browser";
var config = {
    appId: "APP_ID",
    serverUrl: "https://YOUR_SERVER_URL",
    autoTrack: {
        pageShow: true,
        pageHide: true,
        pageView: true,
        pageClick: true
    }
};

// 1. Initialize SDK
ta.init(config);

// 2. Set user account if logged in
ta.login("TA");

// 3. Set super properties before sending any events
ta.setSuperProperties({
    channel: "ta",
    vip_level: 2
});

// 4. Track events
ta.track("product_buy", { product_name: "tv" });

// 5. Set user properties
ta.userSet({ username: "TA" });
```
