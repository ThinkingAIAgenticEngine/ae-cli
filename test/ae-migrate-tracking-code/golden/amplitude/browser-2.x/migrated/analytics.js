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
ta.track("view_item", { item_id: "sku-123", price: 9.99, in_stock: true });

// @tracking add_to_cart
ta.track("add_to_cart", { item_id: "sku-123", quantity: 1 });

// @tracking purchase
ta.track("purchase", { item_id: "sku-123", price: 9.99, quantity: 2, currency: "USD" });

// User properties via Identify → AE user property APIs
ta.userSet({ plan: "pro" });
ta.userSetOnce({ signup_source: "organic" });
ta.userAdd({ logins: 1 });
