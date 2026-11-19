import { cliEntrySource, cliToolReference, websiteLoginUrl } from './website-entry.js';

export type AeRegistrationLanguage = 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR';

export function normalizeRegistrationLanguage(value: string): AeRegistrationLanguage | undefined {
  const language = value.trim().toLowerCase().split(/[_.:@-]/)[0];
  if (language === 'zh' || language === 'cn') return 'zh-CN';
  if (language === 'ja' || language === 'jp') return 'ja-JP';
  if (language === 'ko' || language === 'kr') return 'ko-KR';
  return language === 'en' ? 'en-US' : undefined;
}

export function localRegistrationLanguage(env: NodeJS.ProcessEnv = process.env): AeRegistrationLanguage | undefined {
  return normalizeRegistrationLanguage(env.AE_LANG || env.LC_ALL || env.LC_MESSAGES || env.LANG || env.LANGUAGE || '');
}

/** Conversation language may be passed explicitly; terminal locale is only a fallback. */
export function registrationLanguage(language?: string, env: NodeJS.ProcessEnv = process.env): AeRegistrationLanguage {
  return (language ? normalizeRegistrationLanguage(language) : localRegistrationLanguage(env)) ?? 'en-US';
}

export function registrationMarket(language: AeRegistrationLanguage): 'cn' | 'us' | 'jp' | 'kr' {
  return ({ 'zh-CN': 'cn', 'en-US': 'us', 'ja-JP': 'jp', 'ko-KR': 'kr' } as const)[language];
}

export function aeRegistrationUrl(language?: string, env: NodeJS.ProcessEnv = process.env, source?: string): string {
  const market = registrationMarket(registrationLanguage(language, env));
  const tool = cliEntrySource(source, env);
  return websiteLoginUrl(market, 'production', tool, cliToolReference(tool, env));
}

export const AE_HOST_SETUP_COMMAND = 'ae-cli config set-host <url>';

export function missingAeHostHint(additionalAction?: string): string {
  const registration = aeRegistrationUrl();
  const actions = [
    `If your organization already uses AgenticEngine, ask your administrator for its AE URL, then run: ${AE_HOST_SETUP_COMMAND} and ae-cli auth login --host <url>. Keep your existing account's environment.`,
    `To register or sign in, visit ${registration}, or run ae-cli analysis onboarding run for guided setup.`,
  ];
  if (additionalAction) actions.push(additionalAction);
  return actions.join(' ');
}

export function missingAeHostGuidance(): {
  configure_host: string;
  existing_customer: string;
  request_trial_url: string;
  registration_login_url: string;
  onboarding_command: string;
} {
  const registration = aeRegistrationUrl();
  return {
    configure_host: AE_HOST_SETUP_COMMAND,
    existing_customer: 'Use the original AE environment URL when known, or ask your administrator.',
    // Legacy alias for the official website registration URL.
    request_trial_url: registration,
    registration_login_url: registration,
    onboarding_command: 'ae-cli analysis onboarding run',
  };
}
