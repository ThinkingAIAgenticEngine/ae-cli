// dataLayer is a plain global array (GTM/GA4)
window.dataLayer = window.dataLayer || [];

// Logged-in user identity
window.dataLayer.push({ user_id: user.id });

// Event: sign up
window.dataLayer.push({ event: 'sign_up', method: 'phone' });

// Event: purchase
window.dataLayer.push({ event: 'purchase', order_id: order.id, amount: order.amount, currency: 'USD' });
