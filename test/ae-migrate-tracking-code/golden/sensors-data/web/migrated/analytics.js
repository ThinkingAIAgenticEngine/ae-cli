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

// @tracking user_login
ta.track("user_login", { method: "phone" });

// @tracking view_item
ta.track("view_item", { item_id: "sku-123", price: 9.99 });

// User properties (new naming → AE user property APIs)
ta.userSet({ plan: "pro" });
