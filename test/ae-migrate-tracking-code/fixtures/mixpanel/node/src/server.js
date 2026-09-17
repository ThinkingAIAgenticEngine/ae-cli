const Mixpanel = require('mixpanel');
const mixpanel = Mixpanel.init('YOUR_MIXPANEL_TOKEN');

// user_signup — distinct_id rides inside the event properties (server SDK)
function handleSignup(user) {
  mixpanel.track('user_signup', { distinct_id: user.id, plan: 'pro' });
}

// purchase — distinct_id rides inside the event properties
function handlePurchase(user, order) {
  mixpanel.track('purchase', { distinct_id: user.id, order_id: order.id, amount: order.amount });
}
