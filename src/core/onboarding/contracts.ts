export const DEMO_CONTEXT = 'project.plg_demo.context';
export const DEMO_ENSURE = 'project.plg_demo.ensure';
export const DEMO_STATUS = 'project.plg_demo.status';
export const RUN_BUDGET_MS = 45_000;
export const NETWORK_BUDGET_MS = 35_000;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const DEMO_SAMPLE_IDS = ['star-island', 'season-pass'] as const;
export const CHECKOUT_RECOVERY = 'checkout-recovery';

export function onboardingGrowthScenario(value: string | undefined) {
  if (value === undefined || value === 'item-coupon') return 'item-coupon';
  if (value === CHECKOUT_RECOVERY) return CHECKOUT_RECOVERY;
  throw new Error('Use --scenario item-coupon or checkout-recovery.');
}

export type OnboardingAction = 'run' | 'status' | 'plan' | 'growth' | 'growth-plan' | 'experiment-plan' | 'experiment-plan-preview' | 'experiment-launch' | 'experiment-launch-preview';

export interface OnboardingInput {
  host?: string;
  source?: string;
  region?: string;
  language?: string;
  website_env?: string;
  session_id?: string;
  browser?: string;
  choice?: string;
  sample?: string;
  scenario?: string;
  confirm_business_project_id?: number;
  sdk_complete?: boolean;
  upload_metric_event?: boolean;
  prepare_approver?: boolean;
  run_id?: string;
  start_only?: boolean;
}

export interface ReadyDemoScope {
  sample_id: string;
  item_id: string;
  project_id: number;
  start_date?: string;
  end_date?: string;
  zone_offset?: number;
}

export interface LocalSession {
  schema_version: 1;
  id: string;
  host?: string;
  source?: string;
  region?: string;
  language?: string;
  language_source?: 'explicit' | 'system';
  region_source?: 'explicit' | 'language_default';
  website_env?: 'test' | 'production';
  browser?: 'auto' | 'agent' | 'system';
  choice?: 'demo' | 'business';
  sample_id?: string;
  ready_demo?: ReadyDemoScope;
  confirmed_business_project_id?: number;
  project_id?: number;
  requires_auth?: boolean;
  credential_key?: string;
  bootstrap?: { origin: string; intent_id: string; poll_token: string; login_url: string; expires_at: string;
    login_mode?: 'website_login' | 'device_confirmation'; effective_login_mode?: 'website_login' | 'device_confirmation';
    authorization_status?: 'pending' | 'authorizing' | 'approved' | 'claimed' | 'expired' };
  website_device?: { fingerprint: string; issuer: string; expires_at: string; expected_login_name: string;
    expected_company_id: string; next_poll_at: number; interval_ms: number };
  device?: { host: string; base_url: string; device_code: string; verification_url: string; expires_at: string; interval_ms: number; next_poll_at: number };
  updated_at: string;
}
