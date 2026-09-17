import mixpanel from 'mixpanel-browser';
import { EVENT_SIGNUP } from './constants.js';

// Initialize Mixpanel (client SDK)
mixpanel.init('YOUR_MIXPANEL_TOKEN');

// Logged-in user identity
mixpanel.identify(user.id);

// Event: sign up (cut over to AE)
mixpanel.track(EVENT_SIGNUP, { method: 'phone' });
