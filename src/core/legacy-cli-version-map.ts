/**
 * Historical cluster → public pin alignment (best-effort).
 *
 * Assumption: **cluster/Pallas product versions usually ship first; GitHub/npm tags
 * come later.** Many cluster `6.0.x` versions share one public tag.
 *
 * From **6.0.27** onward, each cluster release has a matching public tag — no entry
 * needed here; {@link resolvePinTarget} returns the version when it is in
 * `PUBLISHED_EXTERNAL_VERSIONS`.
 *
 * Sources: Pallas moduleId=86 + ThinkingAIAgenticEngine/ae-cli tags (as of 2026-07-20).
 * From public `v6.0.16` onward, tags already use `6.0.x` when published.
 */

/**
 * Known Pallas/cluster `ae-cli` versions → public GitHub/npm pin target.
 * Unknown / post-6.0.26 versions fall back to {@link resolvePinTarget}.
 */
export const HISTORICAL_CLUSTER_TO_PUBLIC_PIN: Record<string, string> = {
  '6.0.0': '1.0.15',
  '6.0.1': '1.0.15',
  '6.0.2': '1.0.18',
  '6.0.3': '1.0.18',
  '6.0.4': '1.0.20',
  '6.0.5': '1.0.21',
  '6.0.6': '1.0.22',
  '6.0.7': '1.0.22',
  '6.0.8': '1.0.22',
  '6.0.9': '1.0.22',
  '6.0.10': '1.0.24',
  '6.0.11': '1.0.24',
  '6.0.12': '1.0.27',
  '6.0.13': '1.0.28',
  '6.0.14': '1.0.28',
  '6.0.15': '1.0.30',
  '6.0.16': '6.0.16',
  '6.0.17': '6.0.17',
  '6.0.18': '6.0.18',
  '6.0.19': '6.0.18',
  '6.0.20': '6.0.20',
  '6.0.21': '6.0.20',
  '6.0.22': '6.0.22',
  '6.0.23': '6.0.22',
  '6.0.24': '6.0.24',
  '6.0.25': '6.0.24',
  '6.0.26': '6.0.24',
};
