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

// Logged-in user identity
ta.login(user.id);

// User properties
ta.userSet({ plan: "pro" });
