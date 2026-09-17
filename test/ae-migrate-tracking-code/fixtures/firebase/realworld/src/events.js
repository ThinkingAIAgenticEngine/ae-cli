import { logEvent } from 'firebase/analytics';
import { analytics } from './analytics.js';
import { EVENT_SIGN_UP } from './constants.js';

// Event: sign up — name from a module constant
logEvent(analytics, EVENT_SIGN_UP, { method: 'phone' });
