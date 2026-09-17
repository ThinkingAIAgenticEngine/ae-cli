import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent, setUserId, setUserProperties } from 'firebase/analytics';

const app = initializeApp({ apiKey: 'YOUR_API_KEY', projectId: 'YOUR_PROJECT_ID' });
const analytics = getAnalytics(app);

// Logged-in user identity
setUserId(analytics, user.id);

// Event: user sign up
logEvent(analytics, 'sign_up', { method: 'phone' });

// Event: view item
logEvent(analytics, 'view_item', { item_id: 'sku-123', value: 9.99 });

// User properties
setUserProperties(analytics, { plan: 'pro' });
