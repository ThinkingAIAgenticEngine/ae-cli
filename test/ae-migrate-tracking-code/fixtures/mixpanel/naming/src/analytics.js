import mixpanel from 'mixpanel-browser';

// Initialize Mixpanel (client SDK)
mixpanel.init('YOUR_MIXPANEL_TOKEN');

// Naming edge cases: camelCase / PascalCase / hyphen / digit-leading / reserved mp_ prefix
mixpanel.track('userLogin', { userId: 'u-1', planType: 'pro' });
mixpanel.track('SelectContent', { contentId: 'c-1' });
mixpanel.track('product-view', { planType: 'pro' });
mixpanel.track('2fa_completed', { method: 'totp' });
mixpanel.track('mp_subscription', { tier: 'pro' });
