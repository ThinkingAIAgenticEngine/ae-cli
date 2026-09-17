import mixpanel from 'mixpanel-browser';

// Initialize Mixpanel (client SDK)
mixpanel.init('YOUR_MIXPANEL_TOKEN');

// Logged-in user identity
mixpanel.identify(user.id);

// Event: sign up
mixpanel.track('sign_up', { method: 'phone' });

// Event: purchase
mixpanel.track('purchase', { order_id: 'ord-1', amount: 99.0, currency: 'USD' });

// People properties
mixpanel.people.set({ plan: 'pro' });
