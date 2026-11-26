export type OnboardingBrowserTarget = 'website_login' | 'device_authorization';

export interface OnboardingBrowserReceipt {
  owner: 'cli';
  target: OnboardingBrowserTarget;
  attempted_this_call: boolean;
  open_command_succeeded: boolean | null;
  agent_action: 'guide_existing_window' | 'show_fallback_link';
}

export interface OnboardingBrowserRequest {
  target: OnboardingBrowserTarget;
  new_page: boolean;
  system_open_allowed?: boolean;
  open_system?: () => boolean;
}

/** Older callers may still pass any of the original values. */
export function readBrowserMode(value: unknown): 'system' {
  if (value === undefined || value === 'auto' || value === 'agent' || value === 'system') return 'system';
  throw new Error('Unsupported onboarding browser. Use auto, agent, or system.');
}

export function onboardingBrowserPolicy(input: OnboardingBrowserRequest): OnboardingBrowserReceipt {
  const base: OnboardingBrowserReceipt = {
    owner: 'cli', target: input.target,
    attempted_this_call: false, open_command_succeeded: null,
    agent_action: 'guide_existing_window',
  };
  // Reading or resuming an existing page never opens another tab.
  if (!input.new_page) return base;
  if (input.system_open_allowed === false || !input.open_system) {
    return { ...base, agent_action: 'show_fallback_link' };
  }
  let succeeded = false;
  try { succeeded = input.open_system() === true; }
  catch { /* Browser opening is best-effort; private opener errors never enter the public receipt. */ }
  return { ...base, attempted_this_call: true, open_command_succeeded: succeeded,
    agent_action: succeeded ? 'guide_existing_window' : 'show_fallback_link' };
}
