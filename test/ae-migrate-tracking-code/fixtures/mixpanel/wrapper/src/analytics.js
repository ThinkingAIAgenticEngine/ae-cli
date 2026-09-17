import mixpanel from 'mixpanel-browser';

// Thin analytics wrapper: business code calls trackEvent, which delegates to Mixpanel.
export function trackEvent(name, props = {}) {
  mixpanel.track(name, props);
}
