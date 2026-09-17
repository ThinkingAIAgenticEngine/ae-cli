const amplitude = require('@amplitude/analytics-node');
const ThinkingData = require('thinkingdata-node');
const { EVENT_USER_SIGNUP } = require('./constants.js');

// Initialize Amplitude (server SDK) — kept for dual-write (add mode)
try {
  amplitude.init('YOUR_AMPLITUDE_API_KEY');
} catch (e) {
  // Amplitude unavailable — its writes below no-op; AE still runs
}

// Initialize AE (server SDK)
let teSDK = null;
try {
  teSDK = ThinkingData.initWithLoggingMode('LOG_DIRECTORY', { filePrefix: 'test' });
} catch (e) {
  // AE unavailable — its writes below no-op; Amplitude still runs
}

// user_signup — identity rides on the event (server SDK has no global setUserId)
function handleSignup(user) {
  try {
    amplitude.track(EVENT_USER_SIGNUP, { plan: 'pro' }, { user_id: user.id });
  } catch (e) {
    // Amplitude unavailable — swallow; AE write still runs
  }
  try {
    // @tracking user_signup
    teSDK.track({ accountId: user.id, event: 'user_signup', properties: { plan: 'pro' } });
  } catch (e) {
    // AE unavailable — swallow
  }
}
