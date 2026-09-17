const MEASUREMENT_ID = 'G-XXXXXXX';
const API_SECRET = 'YOUR_API_SECRET';

function mpSend(body) {
  // POST to the GA4 Measurement Protocol endpoint
  return fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

// user_signup — user_id rides inside the Measurement Protocol payload
function handleSignup(user) {
  mpSend({ client_id: 'anon-1', user_id: user.id, name: 'user_signup', plan: 'pro' });
}

// purchase — user_id rides inside the Measurement Protocol payload
function handlePurchase(user, order) {
  mpSend({ client_id: 'anon-1', user_id: user.id, name: 'purchase', order_id: order.id, amount: order.amount });
}
