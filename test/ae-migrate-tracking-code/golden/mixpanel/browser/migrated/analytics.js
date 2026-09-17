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

// @tracking sign_up
ta.track("sign_up", { method: "phone" });

// @tracking purchase
ta.track("purchase", { order_id: "ord-1", amount: 99.0, currency: "USD" });

// People properties → AE user property APIs
ta.userSet({ plan: "pro" });
