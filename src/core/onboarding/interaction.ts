import { absolutizeRelativeUrls } from '../resource-url.js';

const interactions = {
  complete_website_login: [
    { value: 'login_done', label: 'I finished signing in' },
    { value: 'login_help', label: 'Help me sign in' },
  ],
  approve_device: [
    { value: 'authorization_done', label: 'CLI access approved' },
    { value: 'authorization_help', label: 'Help me approve CLI access' },
  ],
  restart_website_login: [
    { value: 'retry_login', label: 'Reopen the sign-in page' },
    { value: 'not_now', label: 'Not now' },
  ],
  choose_experience: [
    { value: 'demo', label: 'Start the demo' },
    { value: 'business', label: 'Connect my business data' },
  ],
  demo_entry: [
    { value: 'demo', label: 'Try the sample data' },
    { value: 'learn', label: 'See what ThinkingAI can do' },
  ],
  choose_data_source: [
    { value: 'import_data', label: 'Import a file or Feishu table' },
    { value: 'sdk', label: 'Connect an app SDK' },
    { value: 'more_data_tools', label: 'More integration tools' },
  ],
  choose_data_tool: [
    { value: 'datax', label: 'Connect with DataX' },
    { value: 'logbus2', label: 'Configure LogBus2' },
    { value: 'tracking_plan', label: 'Create a tracking plan' },
    { value: 'migrate_tracking', label: 'Migrate existing tracking' },
    { value: 'dimension_table', label: 'Import a dimension table' },
    { value: 'check_ingestion', label: 'Check existing ingestion' },
  ],
  confirm_business_project: [
    { value: 'confirm_project', label: 'Use this AE project' },
    { value: 'not_now', label: 'Not now' },
  ],
  offer_growth_questions: [
    { value: 'growth', label: 'Find players worth following up with' },
    { value: 'checkout_recovery', label: 'Find players who left checkout' },
  ],
  growth_ready: [
    { value: 'follow_up', label: 'See how to follow up' },
  ],
  confirm_experiment: [
    { value: 'launch', label: 'Confirm and start the A/B experiment' },
  ],
  review_experiment: [
    { value: 'launch', label: 'Approve and start the Demo test' },
    { value: 'review_audience', label: 'Why this audience?' },
    { value: 'review_pilot', label: 'How would a small pilot work?' },
    { value: 'review_no_reward', label: 'What can we test without rewards?' },
  ],
  demo_overview: [
    { value: 'growth', label: 'Find players worth following up with' },
    { value: 'diagnosis', label: 'Investigate a business question' },
  ],
  diagnosis_topics: [
    { value: 'product_revisits', label: 'Product revisits' },
    { value: 'checkout_recovery', label: 'Checkout without payment' },
    { value: 'purchase_conversion', label: 'Purchase conversion' },
  ],
  reauthorize_cli: [
    { value: 'reauthorize', label: 'Reconnect the CLI' },
    { value: 'not_now', label: 'Not now' },
  ],
};

export function onboardingDraftReviewInteraction(answered: readonly string[] = []) {
  return { step: 'review_experiment', options: interactions.review_experiment.filter(option =>
    option.value === 'launch' || !answered.includes(option.value)) };
}

export function onboardingDemoOverview(sampleId: string, visit: number) {
  const seasonPass = sampleId === 'season-pass';
  const themes = interactions.diagnosis_topics;
  const questions = seasonPass ? [
    'Which pass players could we win back?',
    'Where did players leave the purchase funnel?',
    'Which pass viewers came back without buying?',
  ] : [
    'Which returning bundle viewers should we follow up with?',
    'Which bundle players started checkout without buying?',
    'Where did players leave the purchase funnel?',
  ];
  const first = seasonPass ? 1 : 0;
  const round = Math.max(0, visit - 1) % themes.length;
  const index = (first + round) % themes.length;
  const topicLabels = seasonPass
    ? ['Pass revisits', 'Pass checkout drop-off', 'Pass purchase funnel']
    : ['Bundle revisits', 'Bundle checkout drop-off', 'Bundle purchase funnel'];
  const sampleTopics = themes.map((topic, i) => ({ ...topic, label: topicLabels[i] }));
  const topics = [...sampleTopics.slice(index), ...sampleTopics.slice(0, index)];
  const growthLabels = seasonPass
    ? ['Find unpaid pass checkouts', 'Find where pass buyers drop off', 'Find returning pass viewers']
    : ['Find repeat bundle viewers', 'Find unpaid bundle checkouts', 'Find where bundle buyers drop off'];
  const [growth, diagnosis] = interactions.demo_overview;
  return {
    primary_metric: seasonPass ? 'checkout_unpaid_rate' : 'purchase_rate_by_viewing_days',
    featured_topic: topics[0].value,
    featured_question: questions[round],
    interaction: { step: 'demo_overview', options: [
      { ...growth, label: growthLabels[round] },
      { ...diagnosis, label: seasonPass ? 'Investigate pass conversion' : 'Investigate bundle purchases' },
    ] },
    diagnosis: { step: 'diagnosis_topics', options: topics },
  };
}

export function onboardingInteraction(step: string, web = false) {
  if (!Object.hasOwn(interactions, step)) return undefined;
  const options = web && step === 'choose_experience'
    ? [interactions.choose_experience[0], interactions.demo_entry[1], { value: 'not_now', label: 'Not now' }]
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
