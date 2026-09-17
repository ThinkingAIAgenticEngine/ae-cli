import ta from "thinkingdata-browser";

// dataLayer is a plain global array (GTM/GA4) — kept for dual-write (add mode)
window.dataLayer = window.dataLayer || [];

// Initialize AE (client SDK)
try {
  ta.init({
    appId: "APP_ID",
    serverUrl: "https://YOUR_SERVER_URL/sync_js",
    autoTrack: {
      pageShow: true,
      pageHide: true
    }
  });
} catch (e) {
  // AE unavailable — its writes below no-op; dataLayer still runs
}

// Logged-in user identity
try {
  window.dataLayer.push({ user_id: user.id });
} catch (e) {
  // dataLayer unavailable — swallow; AE write still runs
}
try {
  ta.login(user.id);
} catch (e) {
  // AE unavailable — swallow
}

try {
  window.dataLayer.push({ event: 'sign_up', method: 'phone' });
} catch (e) {
  // dataLayer unavailable — swallow; AE write still runs
}
try {
  // @tracking sign_up
  ta.track("sign_up", { method: "phone" });
} catch (e) {
  // AE unavailable — swallow
}

try {
  window.dataLayer.push({ event: 'purchase', order_id: order.id, amount: order.amount, currency: 'USD' });
} catch (e) {
  // dataLayer unavailable — swallow; AE write still runs
}
try {
  // @tracking purchase
  ta.track("purchase", { order_id: order.id, amount: order.amount, currency: "USD" });
} catch (e) {
  // AE unavailable — swallow
}
