import firebase from 'firebase/app';
import 'firebase/analytics';

firebase.initializeApp({ apiKey: 'YOUR_API_KEY', projectId: 'YOUR_PROJECT_ID' });
const analytics = firebase.analytics();

// Logged-in user identity
analytics.setUserId(user.id);

// Event: user sign up
analytics.logEvent('sign_up', { method: 'phone' });

// Event: view item
analytics.logEvent('view_item', { item_id: 'sku-123' });
