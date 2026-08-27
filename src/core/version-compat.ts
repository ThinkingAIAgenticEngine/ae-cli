import { isNewer } from './update-check.js';
import { HISTORICAL_CLUSTER_TO_PUBLIC_PIN } from './legacy-cli-version-map.js';

/** Open-source npm package used in pin / upgrade hints. */
export const OPEN_SOURCE_AE_CLI_PACKAGE = '@thinkingai/ae-cli';

/** Public npm registry that publishes the open-source CLI package. */
export const OPEN_SOURCE_NPM_REGISTRY = 'https://registry.npmjs.org';

/** GitHub skills repo for `npx skills add …#v{ver}`. */
export const AE_CLI_SKILLS_REPO = 'ThinkingAIAgenticEngine/ae-cli';

/**
 * Published ThinkingAIAgenticEngine/ae-cli GitHub tags (npm when published under the same number).
 * Cluster/Pallas can have extra 6.0.x with no identical public tag; those pin via
 * {@link resolvePinTarget} (floor to newest public tag whose capability ≤ cluster version).
 */
export const PUBLISHED_EXTERNAL_VERSIONS = new Set([
  '1.0.15',
  '1.0.18',
  '1.0.20',
  '1.0.21',
  '1.0.22',
  '1.0.24',
  '1.0.27',
  '1.0.28',
  '1.0.30',
  '6.0.16',
  '6.0.17',
  '6.0.18',
  '6.0.20',
  '6.0.22',
  '6.0.24',
  '6.0.27',
  '6.0.28',
  '6.0.29',
  '6.0.30',
  '6.0.31',
]);

/** Strip optional `v` prefix; packages and cluster versions already share `6.0.x`. */
export function normalizeCliVersion(version: string): string {
  return version.trim().replace(/^v/i, '');
}

/** major.minor line, e.g. 6.0.31 → 6.0 */
export function versionLine(version: string): string {
  const parts = normalizeCliVersion(version).split(/[.-]/);
  if (parts.length < 2) return normalizeCliVersion(version);
  return `${parts[0]}.${parts[1]}`;
}

export function sameVersionLine(a: string, b: string): boolean {
  return versionLine(a) === versionLine(b);
}

function parseVersionParts(version: string): number[] {
  const core = normalizeCliVersion(version).split('-')[0];
  return core.split('.').map((p) => {
    const n = Number.parseInt(p, 10);
    return Number.isFinite(n) ? n : 0;
  });
}

/** Compare normalized capability versions: -1 if a<b, 0 if equal, 1 if a>b. */
function compareNormalized(a: string, b: string): number {
  const pa = parseVersionParts(a);
  const pb = parseVersionParts(b);
  const len = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < len; i += 1) {
    const av = pa[i] ?? 0;
    const bv = pb[i] ?? 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

export type CompatVerdict =
  | { kind: 'ok' }
  | { kind: 'local_newer'; local: string; expected: string; line: string }
  | { kind: 'local_older'; local: string; expected: string; line: string }
  | { kind: 'line_mismatch'; local: string; expected: string; line: string };

export function evaluateCompat(localRaw: string, expectedRaw: string, clusterLine?: string | null): CompatVerdict {
  const local = normalizeCliVersion(localRaw);
  const expected = normalizeCliVersion(expectedRaw);
  if (!local || !expected) return { kind: 'ok' };

  const line = (clusterLine && clusterLine.trim()) || versionLine(expected);

  if (!sameVersionLine(local, expected)) {
    return { kind: 'line_mismatch', local, expected, line };
  }
  if (clusterLine && clusterLine.trim()) {
    const clusterNorm = clusterLine.trim();
    const localLine = versionLine(local);
    if (localLine !== clusterNorm && localLine !== versionLine(clusterNorm)) {
      return { kind: 'line_mismatch', local, expected, line: clusterNorm };
    }
  }

  if (local === expected) return { kind: 'ok' };
  if (isNewer(local, expected)) {
    return { kind: 'local_newer', local, expected, line };
  }
  if (isNewer(expected, local)) {
    return { kind: 'local_older', local, expected, line };
  }
  return { kind: 'ok' };
}

/**
 * Resolve a public pin tag for a cluster `te_module_version` / config ae_cli_version.
 *
 * Historical rule (cluster usually first, GitHub later): prefer
 * {@link HISTORICAL_CLUSTER_TO_PUBLIC_PIN}; else newest published tag on the same line
 * whose normalized capability ≤ cluster version (semver floor).
 */
export function resolvePinTarget(expectedVersion: string): string | null {
  const expected = expectedVersion.trim().replace(/^v/i, '');
  if (!expected) return null;
  if (PUBLISHED_EXTERNAL_VERSIONS.has(expected)) return expected;

  const historical = HISTORICAL_CLUSTER_TO_PUBLIC_PIN[expected];
  if (historical && PUBLISHED_EXTERNAL_VERSIONS.has(historical)) {
    return historical;
  }

  const line = versionLine(expected);
  const candidates = [...PUBLISHED_EXTERNAL_VERSIONS].filter((tag) => {
    if (versionLine(tag) !== line) return false;
    return compareNormalized(tag, expected) <= 0;
  });
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => compareNormalized(a, b));
  return candidates[candidates.length - 1] ?? null;
}

export function formatPinCommands(expectedVersion: string): string[] {
  const ver = resolvePinTarget(expectedVersion);
  if (!ver) return [];
  return [
    `npm i -g ${OPEN_SOURCE_AE_CLI_PACKAGE}@${ver} --registry=${OPEN_SOURCE_NPM_REGISTRY}`,
    `npx skills add ${AE_CLI_SKILLS_REPO}#v${ver} -g -y`,
  ];
}

/** Upgrade-to-environment commands (use exact cluster ae-cli version, not historical floor). */
export function formatUpgradeCommands(expectedVersion: string): string[] {
  const ver = expectedVersion.trim().replace(/^v/i, '');
  if (!/^\d+\.\d+\.\d+(?:[-+].*)?$/.test(ver)) return [];
  return [
    `npm i -g ${OPEN_SOURCE_AE_CLI_PACKAGE}@${ver} --registry=${OPEN_SOURCE_NPM_REGISTRY}`,
    `npx skills add ${AE_CLI_SKILLS_REPO}#v${ver} -g -y`,
  ];
}

export function formatUnifiedUpdateCommand(): string {
  return 'ae-cli update';
}

export function formatCompatNotice(verdict: CompatVerdict): string | undefined {
  if (verdict.kind === 'ok') return undefined;

  const canUpdateToHost = formatUpgradeCommands(verdict.expected).length > 0;

  if (verdict.kind === 'local_newer') {
    if (canUpdateToHost) {
      return [
        `[ae-cli] Host compat: local ${verdict.local} > environment ${verdict.expected} (cluster ${verdict.line}).`,
        `         Run: ${formatUnifiedUpdateCommand()} to sync CLI + skills to this host.`,
        `         Or update cluster components to the latest version.`,
      ].join('\n');
    }
    return [
      `[ae-cli] Host compat: local ${verdict.local} > environment ${verdict.expected} (cluster ${verdict.line}).`,
      `         No public GitHub/npm release on this line is ≤ environment ${verdict.expected}.`,
      `         Update cluster components to the latest version to match your CLI.`,
    ].join('\n');
  }
  if (verdict.kind === 'local_older') {
    if (canUpdateToHost) {
      return [
        `[ae-cli] Host compat: local ${verdict.local} < environment ${verdict.expected} (cluster ${verdict.line}).`,
        `         Run: ${formatUnifiedUpdateCommand()} to sync CLI + skills to this host.`,
      ].join('\n');
    }
    return [
      `[ae-cli] Host compat: local ${verdict.local} < environment ${verdict.expected} (cluster ${verdict.line}).`,
      `         No installable semver target for environment ${verdict.expected}.`,
      `         Ask the platform owner for the install package, or wait for a published build.`,
    ].join('\n');
  }
  if (canUpdateToHost) {
    return [
      `[ae-cli] Host compat: local ${verdict.local} line mismatches environment ${verdict.expected} (cluster ${verdict.line}).`,
      `         Run: ${formatUnifiedUpdateCommand()} to sync CLI + skills to this host.`,
      `         Or update cluster components to the latest version to match your CLI line.`,
    ].join('\n');
  }
  return [
    `[ae-cli] Host compat: local ${verdict.local} line mismatches environment ${verdict.expected} (cluster ${verdict.line}).`,
    `         No public GitHub/npm release for this line; update cluster components to the latest version, or install a published build on the same line.`,
  ].join('\n');
}
