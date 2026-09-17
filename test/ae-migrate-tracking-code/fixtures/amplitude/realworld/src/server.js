const amplitude = require('@amplitude/analytics-node');
const { EVENT_USER_SIGNUP } = require('./constants.js');

// Initialize Amplitude (server SDK)
amplitude.init('YOUR_AMPLITUDE_API_KEY');

// user_signup — identity rides on the event (server SDK has no global setUserId)
function handleSignup(user) {
  amplitude.track(EVENT_USER_SIGNUP, { plan: 'pro' }, { user_id: user.id });
}
