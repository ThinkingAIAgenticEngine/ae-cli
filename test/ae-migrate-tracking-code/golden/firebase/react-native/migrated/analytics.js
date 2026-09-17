import analytics from '@react-native-firebase/analytics';
import TDAnalytics from "react-native-thinking-data";

// Initialize AE (React Native SDK)
try {
  TDAnalytics.init({ appId: "APP_ID", serverUrl: "https://YOUR_SERVER_URL" });
} catch (e) {
  // AE unavailable — its writes below no-op; Firebase still runs
}

async function initUser(user) {
  try {
    await analytics().setUserId(user.id);
    await analytics().setUserProperties({ plan: 'pro' });
  } catch (e) {
    // Firebase unavailable — swallow; AE write still runs
  }
  try {
    TDAnalytics.login(user.id);
    TDAnalytics.userSet({ plan: "pro" });
  } catch (e) {
    // AE unavailable — swallow
  }
}

async function logSignUp(user) {
  try {
    await analytics().logEvent('sign_up', { method: 'phone' });
  } catch (e) {
    // Firebase unavailable — swallow; AE write still runs
  }
  try {
    // @tracking sign_up
    TDAnalytics.track({ eventName: "sign_up", properties: { method: "phone" } });
  } catch (e) {
    // AE unavailable — swallow
  }
}

async function logPurchase(user, order) {
  try {
    await analytics().logEvent('purchase', { order_id: order.id, amount: order.amount, currency: 'USD' });
  } catch (e) {
    // Firebase unavailable — swallow; AE write still runs
  }
  try {
    // @tracking purchase
    TDAnalytics.track({ eventName: "purchase", properties: { order_id: order.id, amount: order.amount, currency: "USD" } });
  } catch (e) {
    // AE unavailable — swallow
  }
}
