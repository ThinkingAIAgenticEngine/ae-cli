import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported, logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import ta from "thinkingdata-browser";

// Initialize Firebase — guarded so a Firebase load failure never blocks AE
let app = null;
try {
  app = initializeApp({ apiKey: 'YOUR_API_KEY', projectId: 'YOUR_PROJECT_ID' });
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

async function getAnalyticsInstance() {
  if (await isSupported()) {
    return getAnalytics(app);
  }
  return null;
}

// Logged-in user identity
export async function trackSetUserId(userId) {
  try {
    const analytics = await getAnalyticsInstance();
    if (analytics) {
      setUserId(analytics, userId);
    }
  } catch (e) {
    // Firebase unavailable — swallow; TA write still runs
  }
  try {
    ta.login(userId);
  } catch (e) {
    // TA unavailable — swallow
  }
}

// Event: user sign up
export async function trackSignUp(user) {
  try {
    const analytics = await getAnalyticsInstance();
    if (analytics) {
      logEvent(analytics, 'sign_up', { method: user.method });
    }
  } catch (e) {
    // Firebase unavailable — swallow; TA write still runs
  }
  try {
    // @tracking sign_up
    ta.track("sign_up", { method: user.method });
  } catch (e) {
    // TA unavailable — swallow
  }
}

// Event: view item
export async function trackViewItem(item) {
  try {
    const analytics = await getAnalyticsInstance();
    if (analytics) {
      logEvent(analytics, 'view_item', { item_id: item.id });
    }
  } catch (e) {
    // Firebase unavailable — swallow; TA write still runs
  }
  try {
    // @tracking view_item
    ta.track("view_item", { item_id: item.id });
  } catch (e) {
    // TA unavailable — swallow
  }
}

// User properties
export async function trackSetUserProperties() {
  try {
    const analytics = await getAnalyticsInstance();
    if (analytics) {
      setUserProperties(analytics, { plan: 'pro' });
    }
  } catch (e) {
    // Firebase unavailable — swallow; TA write still runs
  }
  try {
    ta.userSet({ plan: "pro" });
  } catch (e) {
    // TA unavailable — swallow
  }
}
