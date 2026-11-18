import { absolutizeRelativeUrls } from '../resource-url.js';

const interactions = {
  complete_website_login: [
    { value: 'login_done', label: 'I finished signing in' },
    { value: 'login_help', label: 'I need help signing in' },
  ],
  approve_device: [
    { value: 'authorization_done', label: 'I approved CLI access' },
    { value: 'authorization_help', label: 'I need help authorizing the CLI' },
  ],
  restart_website_login: [
    { value: 'retry_login', label: 'Start a new sign-in' },
    { value: 'not_now', label: 'Not now' },
  ],
  choose_experience: [
    { value: 'demo', label: 'Start the demo' },
    { value: 'business', label: 'Connect my business data' },
  ],
  confirm_business_project: [
    { value: 'confirm_project', label: 'Use this AE project' },
    { value: 'not_now', label: 'Not now' },
  ],
  offer_growth_questions: [
    { value: 'growth', label: 'Find a growth opportunity' },
    { value: 'checkout_recovery', label: 'Win back players who started checkout but did not pay' },
    { value: 'change_sample', label: 'Change sample' },
  ],
  growth_ready: [
    { value: 'follow_up', label: 'How should we follow up with these users?' },
    { value: 'change_sample', label: 'Change sample' },
  ],
  confirm_experiment: [
    { value: 'launch', label: 'Confirm and start the A/B experiment' },
    { value: 'start_later', label: 'Start later' },
  ],
  reauthorize_cli: [
    { value: 'reauthorize', label: 'Reconnect the CLI' },
    { value: 'not_now', label: 'Not now' },
  ],
};

export function onboardingInteraction(step: string, web = false) {
  if (!Object.hasOwn(interactions, step)) return undefined;
  const options = web && step === 'choose_experience'
    ? [interactions.choose_experience[0], { value: 'not_now', label: 'Not now' }]
    : interactions[step as keyof typeof interactions];
  return { step, options };
}

export function onboardingEvidenceLinks(evidence: unknown, projectId: unknown, host?: string) {
  if (!evidence || typeof evidence !== 'object' || typeof projectId !== 'number'
      || !Number.isSafeInteger(projectId) || projectId < 1) return undefined;
  const paths = evidence as Record<string, unknown>;
  const links: Record<string, string> = {};
  const evidenceRoutes = {
    dashboard_url: 'panel/panel',
    purchase_rate_report_url: 'tga/ide',
    funnel_report_url: 'tga/funnel',
  };
  for (const [key, route] of Object.entries(evidenceRoutes)) {
    const value = paths[key];
    if (typeof value === 'string' && new RegExp(`^/#/${route}/${projectId}_[1-9][0-9]*$`).test(value)) {
      links[key] = host ? absolutizeRelativeUrls(value, host) : value;
    }
  }
  return Object.keys(links).length ? links : undefined;
}

export function onboardingExperimentUrl(projectId: number, experimentId: string, host?: string) {
  const params = new URLSearchParams({ expId: experimentId, currentProjectId: String(projectId) });
  const route = `/#/atlas/experiment/detail?${params}`;
  return host ? absolutizeRelativeUrls(route, host) : route;
}
