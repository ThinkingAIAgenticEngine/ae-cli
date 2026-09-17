import ta from "thinkingdata-browser";

// Initialize AE (client SDK)
ta.init({
  appId: "APP_ID",
  serverUrl: "https://YOUR_SERVER_URL/sync_js",
  autoTrack: {
    pageShow: true,
    pageHide: true
  }
});

// Super properties → AE common event properties (static)
ta.setSuperProperties({ app_version: "1.2.3", channel: "web" });

// @tracking sign_up
ta.track("sign_up", { method: "phone" });

// People properties → AE user property APIs
ta.userSet({ plan: "pro" });
