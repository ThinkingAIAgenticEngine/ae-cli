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
ta.track("user_login", { user_id: "u-1", plan_type: "pro" });

// @tracking select_content
ta.track("select_content", { content_id: "c-1" });

// @tracking product_view
ta.track("product_view", { plan_type: "pro" });

// @tracking e_2fa_completed
ta.track("e_2fa_completed", { method: "totp" });

// @tracking subscription
ta.track("subscription", { tier: "pro" });
