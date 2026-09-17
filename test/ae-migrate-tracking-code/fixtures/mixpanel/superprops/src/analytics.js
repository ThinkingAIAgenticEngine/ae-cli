import mixpanel from 'mixpanel-browser';

// Initialize Mixpanel (client SDK)
mixpanel.init('YOUR_MIXPANEL_TOKEN');

// Super properties (common event properties)
mixpanel.register({ app_version: '1.2.3', channel: 'web' });

// Event: sign up
mixpanel.track('sign_up', { method: 'phone' });

// People properties
mixpanel.people.set({ plan: 'pro' });
