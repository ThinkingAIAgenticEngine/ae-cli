import { initializeApp } from 'firebase/app';
import { getAnalytics, setUserId, setUserProperties } from 'firebase/analytics';

const app = initializeApp({ apiKey: 'YOUR_API_KEY', projectId: 'YOUR_PROJECT_ID' });
export const analytics = getAnalytics(app);

// Logged-in user identity
setUserId(analytics, user.id);

// User properties
setUserProperties(analytics, { plan: 'pro' });
