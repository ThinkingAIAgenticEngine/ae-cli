---
code: h5_app_integrate
name: "H5 and APP SDK Integration"
wikiToken: AQADwTQ9jisoGSkiyZycSLAInlt
parentWikiToken: FTcTwinIOi3OiRkK4MPc2Ex7neg
updateTime: 1745309847000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=h5_app_integrate
---

# H5 and APP SDK Integration

### 1. Solution Introduction

In APP, there may be some pages composed of H5 pages. At this time, APP SDK cannot collect data for H5 pages, and needs to use JavaScript SDK together to collect user behavior in H5 pages. To ensure JavaScript SDK and APP SDK data consistency, data integration feature is added in new version SDK:

H5 pages use JavaScript SDK for data collection. After collecting data, it does not send directly, but sends through APP SDK (i.e. Android SDK, iOS SDK, Flutter SDK, ReactNative SDK) to server. APP SDK will adjust the data collected by JavaScript SDK according to the following rules:

1. Keep the `#time` passed by JavaScript SDK, i.e. event time is based on the time when tracking is triggered
1. Use APP SDK's `#account_id` and `#distinct_id`, based on the user maintained by APP SDK
1. Add APP SDK's preset properties. If conflicts with JavaScript's preset properties, APP SDK's preset properties will overwrite the conflicting values, such as `#lib` field, APP SDK's value will overwrite JavaScript SDK's value
1. APP SDK's common properties: If conflicts with properties passed by JavaScript, discard native common property values. If JavaScript SDK does not have this property, add it to the reported data
1. `timeEvent` interface in APP SDK can work for events collected by JavaScript SDK
1. JavaScript SDK's login, logout, identify interfaces cannot modify APP SDK's user ID. When H5 and APP SDK integration is enabled, calling these interfaces in JavaScript SDK cannot modify the data's user ID
1. When H5 and APP SDK integration switch is enabled, if APP SDK does not exist in the running environment, JavaScript SDK will directly report data, equivalent to the state when integration is not enabled.

### 2. Usage Method

To enable H5 and APP SDK integration feature, you need to configure JavaScript SDK and APP SDK as follows. **Please note the applicable SDK versions**. Please upgrade to the latest version if using historical versions.

#### 2.1 Android SDK Usage Method

**Android SDK needs to use version 1.2.0 or later**

Call `setJsBridge` when initializing `WebView`:

```
TDAnalytics.setJsBridge(WebView webView);
```

If you need to support Tencent's `X5Webview`, Android SDK needs to use version 2.0.1 or later, call `setJsBridgeForX5WebView`:

```
TDAnalytics.setJsBridgeForX5WebView(webView);
```

#### 2.2 iOS SDK Usage Method

**iOS SDK needs to use version 1.1.1 or later**

##### WKWebView

In iOS 17 and later systems, the method of using NSUserDefaults to set global UserAgent is deprecated. You need to manually add ThinkingData SDK's specific UserAgent to WKWebView object. Otherwise H5 and native app integration cannot be achieved.

Add method as follows

```
WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
config.applicationNameForUserAgent = [NSString stringWithFormat:@"%@ %@", config.applicationNameForUserAgent ?: @"", @"/td-sdk-ios"];
WKWebView *webView = [[WKWebView alloc] initWithFrame:self.view.bounds configuration:config];
```

Add the following code in WKWebView's delegate method: decidePolicyForNavigationAction

```
- (**void**)webView:(WKWebView *)webView decidePolicyForNavigationAction:(WKNavigationAction *)navigationAction decisionHandler:(**void** (^)(WKNavigationActionPolicy))decisionHandler {
    **if** ([TDAnalytics showUpWebView:webView withRequest:navigationAction.request]) {
        decisionHandler(WKNavigationActionPolicyCancel);
        **return**;
    }

    decisionHandler(WKNavigationActionPolicyAllow);
}
```

##### UIWebView

1. After completing SDK initialization, call `addWebViewUserAgent`:

```
[TDAnalytics addWebViewUserAgent];
```

2. When initializing `WebView`, call according to `WebView` type:

```
- (**BOOL**)webView:(UIWebView *)webView shouldStartLoadWithRequest:(NSURLRequest *)request navigationType:(UIWebViewNavigationType)navigationType {
    **if** ([TDAnalytics showUpWebView:webView withRequest:request]) {
        **return** **NO**;
    }
    /*
        other code
    */
    **return** **YES**;
}
```

#### 2.3 Flutter SDK Usage Method

**Flutter SDK needs to use version 3.1.0-beta.1 or later**

Call `addJavaScriptChannel` when initializing `WebView`, call `TDAnalytics.h5ClickHandler();` in `onMessageReceived` method callback

```
controller = WebViewController();
controller.addJavaScriptChannel("ThinkingData_APP_Flutter_Bridge", onMessageReceived: (JavaScriptMessage message){
    TDAnalytics.h5ClickHandler(message.message);
});
```

#### 2.4 ReactNative SDK Usage Method

**ReactNative SDK needs to use version 3.1.0-beta.1 or later**

Call `injectedJavaScript` method to inject js when initializing `WebView`, call `TDAnalytics.h5ClickHandler();` in `onMessage` method callback

```
<WebView
  ref={webViewRef}
  source={localHtmlFile}
  onMessage={ event => {
    console.log(event.nativeEvent.data);
    TDAnalytics.h5ClickHandler(event.nativeEvent.data);
  }}
  javaScriptEnabled={true}
  injectedJavaScript='window.ThinkingData_APP_ReactNative_Bridge = function(data) { window.ReactNativeWebView.postMessage(data); };'
/>
```

#### 2.5 JavaScript SDK Usage Method

**JavaScript SDK needs to use version 2.0.4 or later**

- Add `useAppTrack: true` in initialization parameter configuration. Example as follows:

```
(function(param) {
  var p = param.sdkUrl,
    n = param.name,
    w = window,
    d = document,
    s = "script",
    x = null,
    y = null;
  w["ThinkingDataAnalyticalTool"] = n;
  w[n] =
    w[n] ||
    function(a) {
      return function() {
        (w[n]._q = w[n]._q || []).push([a, arguments]);
      };
    };
  var methods = [
    "track",
    "quick",
    "login",
    "logout",
    "trackLink",
    "userSet",
    "userSetOnce",
    "userAdd",
    "userDel",
    "setPageProperty"
  ];
  for (var i = 0; i < methods.length; i++) {
    w[n][methods[i]] = w[n].call(null, methods[i]);
  }
  if (!w[n]._t) {
    (x = d.createElement(s)), (y = d.getElementsByTagName(s)[0]);
    x.async = 1;
    x.src = p;
    y.parentNode.insertBefore(x, y);
    w[n].param = param;
  }
})({
  appId: "APP_ID", //System assigned APPID
  name: "ta", //Global call variable name, can be set arbitrarily, subsequent calls use this name
  sdkUrl: "http://www.a.com/thinkingdata.js", //Statistics script URL
  serverUrl: "https://global-receiver-ta.thinkingdata.cn:9080", //Data upload URL
  send_method: "image", //Data upload method
  useAppTrack: true // Enable APP and H5 integration
});
```
