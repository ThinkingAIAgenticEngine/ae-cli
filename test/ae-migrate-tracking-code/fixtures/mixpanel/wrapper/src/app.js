import { trackEvent } from './analytics.js';

export function signUp(user) {
  trackEvent('sign_up', { method: user.method });
}
