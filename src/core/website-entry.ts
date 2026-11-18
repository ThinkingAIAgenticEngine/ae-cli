import { UUID_PATTERN } from './onboarding/contracts.js';

export type WebsiteEnvironment = 'test' | 'production';
export type CliEntrySource = 'codex' | 'cursor' | 'claude-code' | 'other';

const LOGIN_PATHS = { jp: '/jp/experience-login/', kr: '/kr/experience-login/', us: '/en/experience-login/' };
export const WEBSITE_MARKETS = Object.keys(LOGIN_PATHS) as (keyof typeof LOGIN_PATHS)[];
const PRODUCTION_ISSUER = 'https://thinkingai.io';
const PRODUCTION_BROWSER_ORIGIN = 'https://www.thinkingai.io';

export function isWebsiteMarket(market: string): market is keyof typeof LOGIN_PATHS {
  return Object.hasOwn(LOGIN_PATHS, market);
}

export function websiteEnvironment(value?: string, env: NodeJS.ProcessEnv = process.env): 'production' {
  const selected = value ?? env.AE_CLI_WEBSITE_ENV ?? 'production';
  if (selected !== 'production') throw new Error('Website onboarding supports only the production environment.');
  return 'production';
}

export function websiteOrigin(market: string, environment: WebsiteEnvironment): string {
  websiteEnvironment(environment, {});
  if (!isWebsiteMarket(market)) throw new Error('Website onboarding is available in Japan, Korea, and the United States. Use --region jp, kr, or us.');
  return PRODUCTION_ISSUER;
}

export function isProductionWebsiteOrigin(origin: string): boolean {
  return origin === PRODUCTION_ISSUER || origin === PRODUCTION_BROWSER_ORIGIN;
}

export function environmentForWebsiteOrigin(origin: string): WebsiteEnvironment {
  if (isProductionWebsiteOrigin(origin)) return 'production';
  throw new Error('Untrusted onboarding website.');
}

export function cliEntrySource(source?: string, env: NodeJS.ProcessEnv = process.env): CliEntrySource {
  const selected = source ?? (UUID_PATTERN.test(env.CODEX_THREAD_ID ?? '') ? 'codex' : 'other');
  if (!['codex', 'cursor', 'claude-code', 'other'].includes(selected)) throw new Error('Unsupported local AI tool source.');
  return selected as CliEntrySource;
}

export function cliToolReference(source: CliEntrySource, env: NodeJS.ProcessEnv = process.env): string | undefined {
  return source === 'codex' && UUID_PATTERN.test(env.CODEX_THREAD_ID ?? '') ? env.CODEX_THREAD_ID : undefined;
}

export function withCliEntryContext(value: string, source: CliEntrySource, market?: string, toolReference?: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Untrusted website continuation URL.');
  if ([...url.searchParams.keys()].some(key => /^(device_code|poll_token|access_token|refresh_token|cli[_-]token|token)$/i.test(key))) {
    throw new Error('The website returned a private credential in its public continuation URL.');
  }
  const references = url.searchParams.getAll('tool_reference');
  if (references.length > 1 || references.some(reference => !UUID_PATTERN.test(reference))) throw new Error('Invalid AI tool continuation reference.');
  url.searchParams.set('entry', 'cli');
  url.searchParams.set('source', cliEntrySource(source));
  if (market && !url.searchParams.has('market')) url.searchParams.set('market', market);
  if (toolReference) {
    if (source !== 'codex' || !UUID_PATTERN.test(toolReference)) throw new Error('Invalid AI tool continuation reference.');
    if (references.length && references[0] !== toolReference) throw new Error('The website returned a mismatched AI tool continuation reference.');
    if (!url.searchParams.has('tool_reference')) url.searchParams.set('tool_reference', toolReference);
  }
  return url.toString();
}

export function websiteLoginUrl(market: string, environment: WebsiteEnvironment, source: CliEntrySource, toolReference?: string): string {
  websiteEnvironment(environment, {});
  if (!isWebsiteMarket(market)) throw new Error('Website onboarding is available in Japan, Korea, and the United States. Use --region jp, kr, or us.');
  return withCliEntryContext(`${PRODUCTION_BROWSER_ORIGIN}${LOGIN_PATHS[market]}`, source, market, toolReference);
}
