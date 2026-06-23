const SKILL_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MCP_NAME_RE = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

export function isValidSkillSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= 48 && SKILL_SLUG_RE.test(slug);
}

export function assertValidSkillSlug(slug: string): void {
  if (!isValidSkillSlug(slug)) {
    throw new Error(
      `Invalid Skill slug: ${slug}. Skill slugs may only contain lowercase letters, digits, and non-consecutive hyphens (-), must be at most 48 characters, and must not start or end with a hyphen`,
    );
  }
}

export function isValidMcpName(name: string): boolean {
  return name.length >= 2 && name.length <= 64 && MCP_NAME_RE.test(name);
}

export function assertValidMcpName(name: string): void {
  if (!isValidMcpName(name)) {
    throw new Error(
      `Invalid MCP name: ${name}. MCP names may only contain letters, digits, underscores, and hyphens, must be 2-64 characters, and must start with a letter`,
    );
  }
}
