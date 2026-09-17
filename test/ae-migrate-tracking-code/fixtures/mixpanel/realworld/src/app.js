import mixpanel from 'mixpanel-browser';
import { EVENT_SIGNUP } from './constants.js';

// Initialize Mixpanel (client SDK)
mixpanel.init('YOUR_MIXPANEL_TOKEN');

// Event name comes from a module constant; property value is a runtime variable
mixpanel.track(EVENT_SIGNUP, { signup_method: user.signupMethod });

// User property set from a runtime value
mixpanel.people.set({ plan: account.plan });
