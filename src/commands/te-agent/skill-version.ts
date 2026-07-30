const SKILL_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const MAX_VERSION_PART = 2_147_483_647;
export const MAX_SKILL_MD_BYTES = 1_048_576;

export function assertValidSkillVersion(version: string): void {
  const match = SKILL_VERSION_PATTERN.exec(version);
  if (!match) {
    throw new Error('--version must use major.minor format without leading zeroes');
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  if (major > MAX_VERSION_PART || minor > MAX_VERSION_PART) {
    throw new Error(`--version major and minor must not exceed ${MAX_VERSION_PART}`);
  }
}

export function assertSkillDocumentSize(content: string | Uint8Array): void {
  const size = typeof content === 'string' ? Buffer.byteLength(content, 'utf8') : content.byteLength;
  if (size > MAX_SKILL_MD_BYTES) {
    throw new Error('SKILL.md must not exceed 1 MB');
  }
}
