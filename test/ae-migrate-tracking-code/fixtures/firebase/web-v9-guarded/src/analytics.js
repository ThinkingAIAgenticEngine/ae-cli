import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported, logEvent, setUserId, setUserProperties } from 'firebase/analytics';

const app = initializeApp({ apiKey: 'YOUR_API_KEY', projectId: 'YOUR_PROJECT_ID' });

async function getAnalyticsInstance() {
  if (await isSupported()) {
    return getAnalytics(app);
  }
  return null;
}

// Logged-in user identity
export async function trackSetUserId(userId) {
  const analytics = await getAnalyticsInstance();
  if (!analytics) return;
  setUserId(analytics, userId);
}

// Event: user sign up
export async function trackSignUp(user) {
  const analytics = await getAnalyticsInstance();
  if (!analytics) return;
  logEvent(analytics, 'sign_up', { method: user.method });
}

// Event: view item
export async function trackViewItem(item) {
  const analytics = await getAnalyticsInstance();
  if (!analytics) return;
  logEvent(analytics, 'view_item', { item_id: item.id });
}

// User properties
export async function trackSetUserProperties() {
  const analytics = await getAnalyticsInstance();
  if (!analytics) return;
  setUserProperties(analytics, { plan: 'pro' });
}
