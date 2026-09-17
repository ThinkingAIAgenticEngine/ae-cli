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

// @tracking user_login
ta.track("user_login", { login_method: "phone" });

// @tracking share
ta.track("share", { content_id: "post-1" });

// User properties → AE user property APIs
ta.userSet({ user_role: "admin" });
ta.userSet({ plan: "pro" });
ta.userSet({ sign_in_method: "email" });
