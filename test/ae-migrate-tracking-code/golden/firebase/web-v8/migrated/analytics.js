import firebase from 'firebase/app';
import 'firebase/analytics';
import ta from "thinkingdata-browser";

// Initialize Firebase (namespaced web SDK) — kept for dual-write (add mode)
let analytics = null;
try {
  firebase.initializeApp({ apiKey: 'YOUR_API_KEY', projectId: 'YOUR_PROJECT_ID' });
  analytics = firebase.analytics();
} catch (e) {
  // Firebase unavailable — its writes below no-op; AE still runs
}

// Initialize AE (client SDK) — dual-write (add mode)
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
  // AE unavailable — its writes below no-op; Firebase still runs
}

// Logged-in user identity
try {
  analytics.setUserId(user.id);
} catch (e) {
  // Firebase unavailable — swallow; AE write still runs
}
try {
  ta.login(user.id);
} catch (e) {
  // AE unavailable — swallow
}

// Event: user sign up
try {
  analytics.logEvent('sign_up', { method: 'phone' });
} catch (e) {
  // Firebase unavailable — swallow; AE write still runs
}
try {
  // @tracking sign_up
  ta.track("sign_up", { method: "phone" });
} catch (e) {
  // AE unavailable — swallow
}

// Event: view item
try {
  analytics.logEvent('view_item', { item_id: 'sku-123' });
} catch (e) {
  // Firebase unavailable — swallow; AE write still runs
}
try {
  // @tracking view_item
  ta.track("view_item", { item_id: "sku-123" });
} catch (e) {
  // AE unavailable — swallow
}
