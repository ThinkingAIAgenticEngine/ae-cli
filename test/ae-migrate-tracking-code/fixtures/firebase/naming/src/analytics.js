import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent, setUserProperties } from 'firebase/analytics';

const app = initializeApp({ apiKey: 'YOUR_API_KEY', projectId: 'YOUR_PROJECT_ID' });
const analytics = getAnalytics(app);

// Event with a camelCase name (non-standard but seen in the wild)
logEvent(analytics, 'userLogin', { login_method: 'phone' });

// Event with a reserved firebase_ prefix
logEvent(analytics, 'firebase_share', { content_id: 'post-1' });

// User properties with reserved prefixes
setUserProperties(analytics, { firebase_user_role: 'admin' });
setUserProperties(analytics, { ga_plan: 'pro' });
setUserProperties(analytics, { google_sign_in_method: 'email' });
