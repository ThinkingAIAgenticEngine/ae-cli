export const AE_TRIAL_URL = 'https://thinkingai.cn/request-demo';
export const AE_HOST_SETUP_COMMAND = 'ae-cli config set-host <url>';

export function missingAeHostHint(additionalAction?: string): string {
  const actions = [
    `If your organization already uses AgenticEngine, ask your administrator for its AE URL, then run: ${AE_HOST_SETUP_COMMAND}.`,
    `If you do not have an AgenticEngine environment, request a trial: ${AE_TRIAL_URL}`,
  ];
  if (additionalAction) actions.push(additionalAction);
  return actions.join(' ');
}

export function missingAeHostGuidance(): {
  configure_host: string;
  existing_customer: string;
  request_trial_url: string;
} {
  return {
    configure_host: AE_HOST_SETUP_COMMAND,
    existing_customer: 'Ask your AgenticEngine administrator for the AE environment URL.',
    request_trial_url: AE_TRIAL_URL,
  };
}
