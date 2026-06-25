---
code: h5_app_integrate
name: "H5 and APP SDK Connection"
wikiToken: FOFZwGHJii1Jm2ke88DcFrrJnUb
parentWikiToken: KaFCwNeV3iRxjNkpT3QcDMg3n5V
updateTime: 1774249226000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=h5_app_integrate
---

## **1. Introduction of Scheme**
In the APP, there might be some screens that are constructed by H5 screen. In this case, APP SDK could not perform data tracking against the H5 screen, and JavaScript SDK needs to be used to track the user's behavior on the H5 screen.  To ensure the consistency between JavaScript SDK data and APP SDK data, the data connection function is newly added for the SDK of the new version.
The H5 screen uses JavaScript SDK for data tracking, and would not send the data tracked directly but send the data to the server through APP SDK (e.g., Android SDK and iOS SDK). The APP SDK would adjust the data tracked by JavaScript SDK. The rules are as follows:
1. Save the `#time` uploaded by JavaScript SDK, that is, the time when data tracking is triggered shall be regarded as the event time
2. Use the `#account_id` and `#distinct_id` of  APP SDK, and the user maintained by APP SDK shall prevail.
3. Add the preset properties of APP SDK. If such properties conflict with the preset properties of JavaScript, the preset properties of APP SDK would overwrite the conflict value. For instance, the value of APP SDK in the `#lib` field would overwrite the value of JavaScript SDK
4. The public properties of APP SDK: if such public properties conflict with the properties imported by JavaScript, the native public property value should be abandoned; if JavaScript SDK does not have the property, the property should be added into the reported data. 
5. The `timeEvent` interface in APP SDK could become valid for the event tracked by JavaScript SDK
6. If the login, logout, and identify the interface in JavaScript SDK could not modify the user ID in APP SDK, the user ID of the data could not be modified through the above-mentioned interface.
7. When the switch of H5 and APP SDK connection is enabled, if APP SDK does not exist in the operating environment, JavaScript SDK would perform data tracking directly, which is equivalent to the state when the connection is not enabled. 
## **2. Usage Method**
If it is necessary to enable the H5 and APP SDK connection function, we need to perform the following configuration for JavaScript SDK and APP SDK. **Please**** pay attention to the applicable version of SDK**. It is recommended that users using historical versions upgrade to the latest version.
### 2.1 **Android SDK usage method**
Call  `setJsBridge` during `WebView` initialization：
```java
ThinkingAnalyticsSDK.sharedInstance(getApplicationContext()).setJsBridge(WebView webView);
```

If it is necessary to support the `X5Webview` of Tencent, call `setJsBridgeForX5WebView`:
```java
ThinkingAnalyticsSDK.sharedInstance(context, appId).setJsBridgeForX5WebView(webView);
```

### 2.2 **iOS SDK usage method**
#### WKWebView
The customUserAgent property of WKWebView should be set as follows:
```objectivec
    WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
    config.applicationNameForUserAgent = [NSString stringWithFormat:@"%@ %@", config.applicationNameForUserAgent ?: @"", @"/td-sdk-ios"];
```

If there is a self-contained UA, please splice the " /td-sdk-ios" and add the following codes into decidePolicyForNavigationAction
```objectivec

- (void)webView:(WKWebView *)webView decidePolicyForNavigationAction:(WKNavigationAction *)navigationAction decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler {
    if ([TDAnalytics showUpWebView:webView withRequest:navigationAction.request]) {
        decisionHandler(WKNavigationActionPolicyCancel);
        return;
    }
    // add your logic code here
    decisionHandler(WKNavigationActionPolicyAllow);
}
```

#### UIWebView
1. Call `addWebViewUserAgent` after SDK initialization:
```objectivec
   [TDAnalytics addWebViewUserAgent];
```

The following calls should be performed based on the types of `WebView` during `WebView` initialization:
```objectivec

- (BOOL)webView:(UIWebView *)webView shouldStartLoadWithRequest:(NSURLRequest *)request navigationType:(UIWebViewNavigationType)navigationType {
    if ([TDAnalytics showUpWebView:webView withRequest:request]) {
        return NO;
    }
     // add your logic code here
    return YES;
}
```


### 2.3 **Flutter**** SDK usage method**
Call addJavaScriptChannel when initializing WebView, and call TDAnalytics.h5ClickHandler() in the onMessageReceived method.
```java
controller = WebViewController();
controller.addJavaScriptChannel("ThinkingData_APP_Flutter_Bridge", onMessageReceived: (JavaScriptMessage message){
    TDAnalytics.h5ClickHandler(message.message);
});
```

### 2.4 **ReactNative**** SDK usage method**
Call the injectedJavaScript method to inject JS when initializing WebView, and call TDAnalytics.h5ClickHandler() in the onMessage method.
```java
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

### 2.5 **JavaScript ****SDK**** Usage Method**
**JavaScript ****SDK**** Usage Method**
- Add `useAppTrack: true` during parameter initialization, the example is as follows:
```javascript
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
    w[n] ""
    function(a) {
      return function() {
        (w[n]._q = w[n]._q "" []).push([a, arguments]);
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
  appId: "APP_ID", //APPID allocated by the system ID
  name: "ta", //The global call variable name can be set arbitrarily and used in subsequent calls. 
  sdkUrl: "http://www.a.com/thinkingdata.js", //record script URL
  serverUrl: "https://global-receiver-ta.thinkingdata.cn:9080/sync_js", //data upload URL
  send_method: "image", //data upload URL
  useAppTrack: true // connect APP and H5
});
```
